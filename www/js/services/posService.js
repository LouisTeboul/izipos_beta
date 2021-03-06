﻿app.service('posService', ['$rootScope', '$q', '$http', 'eventService',
    function ($rootScope, $q, $http, eventService) {

        var current = this;
        var _daemonIziboxStarted = false;
        var _sending = false;
        var _degradeState = false;
        var _degradeStateTime = undefined;

        /**
         * Get Pos Name Infos
         * */
        this.getPosNameAsync = function (hardwareId) {
            var posDefer = $q.defer();

            $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
                var posName = undefined;
                Enumerable.from(allPoss.Pos).forEach(function (ps) {
                    if (ps.HardwareId == hardwareId) {
                        posName = ps.DefindedName;
                    }
                });

                posDefer.resolve(posName);
            }, function (err) {
                posDefer.reject(err);
            });

            return posDefer.promise;
        };
        /**
         * Get Pos Infos
         * */
        this.getPosAsync = function (hardwareId) {
            var posDefer = $q.defer();

            $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
                var pos = {};
                Enumerable.from(allPoss.Pos).forEach(function (ps) {
                    if (ps.HardwareId == hardwareId) {
                        pos = ps;
                    }
                });

                posDefer.resolve(pos);
            }, function (err) {
                posDefer.reject(err);
            });

            return posDefer.promise;
        };

        /**
         * Get all Pos Infos
         * */
        this.getAllPosAsync = function () {
            var posDefer = $q.defer();

            $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
                posDefer.resolve(allPoss.Pos);
            }, function (err) {
                posDefer.reject(err);
            });

            return posDefer.promise;
        };

        this.checkIziboxAsync = function () {
            this.startIziboxDaemon(true);
        };

        this.stopIziboxDaemon = function () {
            _daemonIziboxStarted = false;
        };

        /** Check the availability of the izibox*/
        this.startIziboxDaemon = function (checkOnly) {
            if ($rootScope.IziBoxConfiguration.LocalIpIziBox && (!_daemonIziboxStarted || checkOnly)) {
                var pingApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/ping";
                // Si check only, on repete pas
                // Si borne, on repete toutes les 13s
                // Si caisse, toutes les 5s
                var timerRepeat = (checkOnly != undefined && checkOnly == false) ? 0 : $rootScope.borne ? 13000 : 5000;
                if (!checkOnly) _daemonIziboxStarted = true;

                var iziboxDaemon = function () {

                    setTimeout(function () {
                        var pingPostData = {
                            HardwareId : $rootScope.modelPos.hardwareId,
                            StoreId: $rootScope.modelPos.StoreId,
                            Alias : $rootScope.modelPos.aliasCaisse ? $rootScope.modelPos.aliasCaisse : null,
                            YperiodId : $rootScope.currentYPeriod && $rootScope.modelPos.isPosOpen ? $rootScope.currentYPeriod.yPeriodId : null,
                            IsBorne : $rootScope.borne ? $rootScope.borne : false

                        };
                        //$http.get(pingApiUrl, { timeout: 1000 }).then(function (data) {

                        // Si borne, timeout en 10s, sinon 2s
                        $http.post(pingApiUrl, pingPostData , { timeout: $rootScope.borne ? 10000 : 2000 }).then(function (data) {
                            //Ancienne version izibox
                            if (!data.data.LocalDb) {
                                data.data.LocalDb = true;
                                data.data.DistantDb = true;
                            }

                            var iziboxConnected = data.data && data.data.LocalDb != undefined ? data.data.LocalDb : true;

                            if ($rootScope.modelPos.iziboxConnected != iziboxConnected) {
                                $rootScope.modelPos.iziboxConnected = iziboxConnected;
                                $rootScope.$emit("iziboxConnected", $rootScope.modelPos.iziboxConnected);
                            }

                            $rootScope.modelPos.iziboxStatus = data.data;

                            $rootScope.$evalAsync();

                            if (_degradeState && !_sending) {

                                _sending = true;
                                var event = {
                                    Code: 70,
                                    Description: "Début mode dégradé",
                                    OperatorCode: $rootScope.PosUserId,
                                    TerminalCode: $rootScope.PosLog.HardwareId,
                                    Type: "Technical",
                                    Informations: ["Start at : " + _degradeStateTime]
                                };
                                eventService.sendEvent(event).then(function () {
                                    event = {
                                        Code: 120,
                                        Description: "Fin mode dégradé",
                                        OperatorCode: $rootScope.PosUserId,
                                        TerminalCode: $rootScope.PosLog.HardwareId,
                                        Type: "Technical",
                                        Informations: ["End at : " + moment().format("DD/MM/YYYY HH:mm:ss")]
                                    };
                                    eventService.sendEvent(event).then(function () {
                                        _degradeState = false;
                                        _sending = false;
                                    }, function () {
                                        _sending = false;
                                    });
                                }, function () {
                                    _sending = false;
                                });


                            }

                            if (_daemonIziboxStarted && !checkOnly) iziboxDaemon();
                        }, function (err) {

                            if ($rootScope.modelPos.iziboxConnected) {
                                $rootScope.modelPos.iziboxConnected = false;
                                $rootScope.$emit("iziboxConnected", $rootScope.modelPos.iziboxConnected);
                            }

                            $rootScope.$evalAsync();

                            if (!_degradeState) {
                                _degradeState = true;
                                _degradeStateTime = moment().format("DD/MM/YYYY HH:mm:ss");
                            }

                            if (_daemonIziboxStarted && !checkOnly) iziboxDaemon();
                        });
                    }, timerRepeat);
                };

                iziboxDaemon();
            }
        };

        this.startSocketDaemon = function() {

            if (window.printBorne) { //MonoPlugin
                const processDefer = $q.defer();
                const printPromise = new Promise(function (resolve, reject) {
                    window.printBorne.initPrintUSB(resolve, reject);
                });

                printPromise.then((data) => {
                    console.log(data);
                    processDefer.resolve();
                }, (err) => {
                    processDefer.reject(err);
                });

                // window.printBorne.initPrintUSB();
            }
        };

        this.startTelecolDaemon = function() {
            if (window.tpaPayment) {
                const processDefer = $q.defer();
                const initPromise = new Promise(function (resolve, reject) {
                    window.tpaPayment.initWatchTelecollecte(resolve, reject);
                });

                initPromise.then((data) => {
                    console.log(data);
                    processDefer.resolve();
                }, (err) => {
                    processDefer.reject(err);
                });
            }
        };

        this.initRkCounterListener = function () {
            $rootScope.$on('iziboxConnected', function (event, args) {
                current.getTotalRkCounterValueAsync().then(function (totalRk) {
                    $rootScope.modelPos.rkCounter = totalRk;
                });
            });

            $rootScope.$on('dbFreezeChange', function (event, args) {
                current.getTotalRkCounterValueAsync().then(function (totalRk) {
                    $rootScope.modelPos.rkCounter = totalRk;
                });
            });
        };

        this.getUpdDailyTicketValueAsync = function (hardwareId, changeValue) {
            var retDefer = $q.defer();

            this.getUpdDailyTicketAsync(hardwareId, changeValue).then(function (res) {
                retDefer.resolve($rootScope.modelPos.posNumber + padLeft(res.count.toString(), 3, "0"));
            }, function (errGet) {
                retDefer.resolve($rootScope.modelPos.posNumber + "001");
            });

            return retDefer.promise;
        };

        this.getUpdDailyTicketAsync = function (hardwareId, changeValue) {
            var retDefer = $q.defer();

            $rootScope.dbFreeze.rel.find('Dailyticket', hardwareId).then(function (res) {
                var dateNow = new Date().toString("dd/MM/yyyy");

                var currentDailyTicket = Enumerable.from(res.Dailytickets).firstOrDefault();

                var mustSave = false;

                if (!currentDailyTicket) {
                    currentDailyTicket = {
                        id: hardwareId,
                        hardwareId: hardwareId
                    };
                }

                if (currentDailyTicket.date != dateNow) {
                    //Reset dailyTicket
                    currentDailyTicket.date = dateNow;
                    currentDailyTicket.count = 0;
                    mustSave = true;
                }

                if (changeValue != 0) {
                    currentDailyTicket.count = currentDailyTicket.count + changeValue;
                    if (currentDailyTicket.count < 0) currentDailyTicket.count = 0;
                    mustSave = true;
                }

                if (mustSave) {
                    $rootScope.dbFreeze.rel.save('Dailyticket', currentDailyTicket).then(function (resSave) {
                        var currentDailyTicket = resSave.Dailytickets[0];

                        retDefer.resolve(currentDailyTicket);
                    }, function (errSave) {
                        retDefer.reject(errSave);
                    });
                } else {
                    retDefer.resolve(currentDailyTicket);
                }
            }, function (errGet) {
                retDefer.reject(errGet);
            });

            return retDefer.promise;
        };

        this.getTotalRkCounterValueAsync = function () {
            var retDefer = $q.defer();

            $rootScope.dbFreeze.rel.find('RkCounter').then(function (res) {

                var totalRkCounter = 0;

                Enumerable.from(res.RkCounters).forEach(function (rkCounter) {
                    totalRkCounter += rkCounter.count;
                });

                retDefer.resolve(totalRkCounter);
            }, function (errGet) {
                retDefer.reject(errGet);
            });

            return retDefer.promise;
        };

        this.getUpdRkCounterValueAsync = function (hardwareId, changeValue) {
            var retDefer = $q.defer();

            $rootScope.dbFreeze.rel.find('RkCounter', hardwareId).then(function (res) {

                var currentRkCounter = Enumerable.from(res.RkCounters).firstOrDefault();

                var mustSave = false;

                if (!currentRkCounter) {
                    currentRkCounter = {
                        id: hardwareId,
                        hardwareId: hardwareId,
                        count: 0
                    };

                    mustSave = true;
                }

                if (changeValue != 0) {
                    currentRkCounter.count = currentRkCounter.count + changeValue;
                    if (currentRkCounter.count < 0) currentRkCounter.count = 0;
                    mustSave = true;
                }

                if (mustSave) {
                    $rootScope.dbFreeze.rel.save('RkCounter', currentRkCounter).then(function (resSave) {
                        var currentRkCounter = resSave.RkCounters[0];
                        retDefer.resolve(currentRkCounter.count);
                        $rootScope.$emit("dbFreezeChange");

                    }, function (errSave) {
                        retDefer.reject(errSave);
                    });
                } else {
                    retDefer.resolve(currentRkCounter.count);
                }
            }, function (errGet) {
                console.log(errGet);
                retDefer.reject(errGet);
            });

            return retDefer.promise;
        };
    }]);