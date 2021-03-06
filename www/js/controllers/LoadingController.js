﻿app.config(function ($stateProvider) {
    $stateProvider
        .state('loading', {
            url: '/loading',
            templateUrl: 'views/loading.html'
        })
});

/**
 * For displaying the progress bar of data loading from couchdb
 * Plugged to the data loading event
 */
app.controller('LoadingController', function ($scope, $rootScope, $location, $timeout, $q, $injector, $mdMedia, updateService, zposService, settingService, posService, categoryService, borneService) {

    $scope.mdMedia = $mdMedia;

    var currencyReady = false;
    // What's the difference with dbReplic below
    $rootScope.$on('dbDatasReplicate', function (event, args) {
        if (args.status === "Change") {
            $scope.$apply(function () {
                $scope.percentProgress = GetPercentage(args);
                $scope.loading = true;
                $scope.gauges.loading.set($scope.percentProgress);
            });
        }
    });

    $rootScope.$on('dbFreezeChange', function (event, args) {
        $scope.$apply(function () {
            $scope.freezeProgress = GetPercentage(args);
            $scope.freezeLoading = true;
            $scope.gauges.freezeloading.set($scope.freezeProgress);
        });
    });

    $rootScope.$on('dbReplicChange', function (event, args) {
        $scope.$apply(function () {
            $scope.replicProgress = GetPercentage(args);
            $scope.replicLoading = true;
            $scope.gauges.replicloading.set($scope.replicProgress);
        });
    });

    $rootScope.$on('dbOrderChange', function (event, args) {
        $scope.$apply(function () {
            $scope.orderProgress = GetPercentage(args);
            $scope.orderLoading = true;
            $scope.gauges.orderloading.set($scope.orderProgress);
        });
    });

    $rootScope.$on('dbZposChange', function (event, args) {
        $scope.$apply(function () {
            $scope.zposPurgeProgress = GetPercentage(args);
            $scope.zposPurge = true;
        });
    });

    // @deprecated
    $rootScope.$on('dbZposPurge', function (event, args) {
        $scope.$apply(function () {
            if (args && args.value && args.max && args.max > 0) {
                var percent = Math.round((args.value * 100) / args.max);
                if (percent > 100) percent = 100;
                $scope.zposPurgeProgress = percent;
            }

            $scope.zposPurge = true;
        });
    });

    /*
    * Calculate the progression percentile
    */
    var GetPercentage = function (changeData) {
        //  update_seq & last_seq were simple number in the couchdb 1.6.0
        if (changeData.remoteInfo && changeData.last_seq && changeData.remoteInfo.update_seq) {
            var changeDataSeq = changeData.remoteInfo.update_seq;
            if (isNaN(changeDataSeq)) {
                changeDataSeq = Number(changeData.remoteInfo.update_seq.split("-")[0]);
                if (changeDataSeq <= 0) changeDataSeq = 1;
            }

            var lastDataSeq = changeData.last_seq;
            if (isNaN(lastDataSeq)) {
                lastDataSeq = Number(changeData.last_seq.split("-")[0]);
                if (lastDataSeq <= 0) lastDataSeq = 1;
            }

            var percent = Math.round((lastDataSeq * 100) / changeDataSeq);
            if (percent > 100) percent = 100;
            return percent;
        }
        else {
            return 0;
        }
    };

    var dataReadyHandler = $rootScope.$watch("modelDb.dataReady", function () {
        checkDbReady();
    });
    var replicateReadyHandler = $rootScope.$watch("modelDb.replicateReady", function () {
        checkDbReady();
    });
    var zposReadyHandler = $rootScope.$watch("modelDb.zposReady", function () {
        checkDbReady();
    });
    var freezeReadyHandler = $rootScope.$watch("modelDb.freezeReady", function () {
        checkDbReady();
    });
    var orderReadyHandler = $rootScope.$watch("modelDb.orderReady", function () {
        checkDbReady();
    });
    var configReplicationReadyHandler = $rootScope.$watch("modelDb.configReplicationReady", function () {
        checkDbReady();
    });

    var databaseReadyHandler = $rootScope.$watch("modelDb.databaseReady", function () {
        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady && !$rootScope.loaded) {
            $rootScope.loaded = true;
            console.log("Loading : Event db ready");
            posService.getPosNameAsync($rootScope.modelPos.hardwareId).then(function (alias) {
                $rootScope.modelPos.aliasCaisse = alias;
            }).catch(function (err) {
                console.log(err);
            });

            //TODO ? zposService.getPaymentValuesAsync();
            checkUpdate();
        }
    });

    $scope.$on("$destroy", function () {
        if (dataReadyHandler) dataReadyHandler();
        if (replicateReadyHandler) replicateReadyHandler();
        if (zposReadyHandler) zposReadyHandler();
        if (freezeReadyHandler) freezeReadyHandler();
        if (orderReadyHandler) orderReadyHandler();
        if (databaseReadyHandler) databaseReadyHandler();
        if (configReplicationReadyHandler) configReplicationReadyHandler();
    });


    function callback(storage) {

        if ($scope.skip) {
            if (!$rootScope.init) {
                console.log($rootScope.storedCategories);
                $rootScope.init = true;
                initServices($rootScope, $injector);
                borneService.redirectToHome();
            }
        } else {
            if (storage.mainProductsCount === 0 && storage.subProductsCount === 0) {
                $scope.loadingProgress += 1 / $scope.categoriesToLoad.length * 100;
                $rootScope.storedCategories['' + storage.mainCategory.Id] = storage;

                if ((Math.round($scope.loadingProgress * 100) / 100 === 100 || Object.keys($rootScope.storedCategories).length === $scope.categoriesToLoad.length) && !$rootScope.init) {
                    $rootScope.init = true;
                    initServices($rootScope, $injector);
                    borneService.redirectToHome();
                }
            }
        }
    }

    var checkDbReady = function () {
        if ($rootScope.modelDb &&
            $rootScope.modelDb.configReplicationReady &&
            $rootScope.modelDb.dataReady &&
            $rootScope.modelDb.freezeReady &&
            $rootScope.modelDb.zposReady &&
            $rootScope.modelDb.replicateReady &&
            $rootScope.modelDb.orderReady) {

            $scope.skip = false;

            if ($rootScope.modelDb.databaseReady) {
                categoryService.getCategoriesAsync().then(function (categories) {
                    $scope.message = "Préchargement des catégories ...";
                    $rootScope.storedCategories = {};
                    $scope.loadingProgress = 0;

                    $scope.categoriesToLoad = categories.filter(c => c.IsEnabled);

                    console.log($scope.categoriesToLoad);

                    $scope.categoriesToLoad.forEach(function (c) {
                        /*
                        if(window.localStorage.getItem('Category' + c.id)){
                            callback(window.localStorage.getItem('Category' + c.id));
                        }
                        */
                        categoryService.loadCategory(c.id, true, callback);
                    });

                    /*
                    if(!$rootScope.init) {
                        $rootScope.init= true;
                        initServices($rootScope, $injector);
                        borneService.redirectToHome();
                    }*/
                }, function (err) {
                    console.log(err);
                });
            } else {
                $rootScope.modelDb.databaseReady = true;
            }

            /*
            if (!$rootScope.init) {
                setTimeout(function(){
                    $rootScope.init = true;
                    initServices($rootScope, $injector);
                    borneService.redirectToHome();
                }, 500);

            }*/
        }
    };

    $scope.init = function () {
        if ($rootScope.borne) {
            $rootScope.IziBoxConfiguration.LoginRequired = false;

            // Lance le démon de télécollecte seulement si on est en mode borne et qu'on a un tpa
            if(window.iziBoxSetup) {
                window.iziBoxSetup.init(JSON.stringify(config));
                if (window.tpaPayment) {
                    posService.startTelecolDaemon();
                }
            }
        }
        //CouchDb
        app.configPouchDb($rootScope, $q, zposService, posService);

        $scope.loading = false;
        $scope.percentProgress = 0;
        $scope.downloading = false;
        $scope.downloadProgress = 0;

        setTimeout(function () {
            initGauges();
        }, 100);

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            $rootScope.loaded = true;
            console.log("Loading : init db ready");
            next();
        }
    };

    $scope.skipCategoryLoading = function () {
        $scope.skip = true;
        
        callback(null);
    };

    var initGauges = function () {
        $scope.gauges = {};

        var opts = {
            angle: 0.5, // The span of the gauge arc
            lineWidth: 0.07, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.6, // // Relative to gauge radius
                strokeWidth: 0.035, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, max value increases automatically if value > maxValue
            limitMin: false,     // If true, the min value of the gauge will be fixed
            colorStart: '#d83448',   // Colors
            colorStop: '#d83448',    // just experiment with them
            strokeColor: '#EEEEEE',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true,     // High resolution support
        };

        var createGauge = function (gaugeName) {
            var target = document.getElementById('gauge' + gaugeName); // your canvas element
            var gaugeValue = document.getElementById('gauge' + gaugeName + 'Value');
            var gauge = new Donut(target).setOptions(opts); // create sexy gauge!
            gauge.setTextField(gaugeValue);
            gauge.maxValue = 100; // set max gauge value
            gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
            gauge.animationSpeed = 20; // set animation speed (32 is default value)
            gauge.set(0); // set actual value
            return gauge;
        };

        $scope.gauges.loading = createGauge('Loading');
        $scope.gauges.freezeloading = createGauge('FreezeLoading');
        $scope.gauges.replicloading = createGauge('ReplicLoading');
        $scope.gauges.orderloading = createGauge('OrderLoading');
    };

    var next = function () {
        $scope.gauges.loading.set(100);
        $scope.gauges.freezeloading.set(100);
        $scope.gauges.replicloading.set(100);
        $scope.gauges.orderloading.set(100);

        // Initializing empty iziposconfiguration
        if (!$rootScope.IziPosConfiguration) {
            $rootScope.IziPosConfiguration = {};
        }
        var styleLink = document.createElement("link");
        if ($rootScope.borne) {
            styleLink.href = "css/styleBorne.css";
        } else {
            styleLink.href = "css/stylePOS.css";
        }
        styleLink.setAttribute('rel', 'stylesheet');
        styleLink.setAttribute('type', 'text/css');
        document.head.appendChild(styleLink);

        // Loading currency
        settingService.getCurrencyAsync().then(function (currency) {
            if (currency) {
                $rootScope.IziPosConfiguration.Currency = currency;
            } else {
                $rootScope.IziPosConfiguration.Currency = {DisplayLocale: "fr-FR", CurrencyCode: "EUR"}; // Default currency

            }
            currencyReady = true;
            checkDbReady();
        }, function (err) {
            $rootScope.IziPosConfiguration.Currency = {DisplayLocale: "fr-FR", CurrencyCode: "EUR"};
            currencyReady = true;
            checkDbReady();
        })
    };

    /**
     * Check the availability of new app version
     **/
    var checkUpdate = function () {
        updateService.getUpdateAsync().then(function (update) {
            if (update) {
                if (update.Version != $rootScope.Version) {
                    sweetAlert({title: "New update : " + update.Version}, function () {

                        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                            downloadUpdate(update.Url);
                        } else {
                            next();
                        }
                    });
                } else {
                    next();
                }
            } else {
                next();
            }
        }, function (err) {
            console.log(err);

        });
    };

    /**
     * Updates the application - android only
     **/
    var downloadUpdate = function (apkUrl) {
        window.resolveLocalFileSystemURL(cordova.file.externalCacheDirectory, function (fileSystem) {
            var fileApk = "izipos.apk";
            fileSystem.getFile(fileApk, {
                create: true
            }, function (fileEntry) {
                $scope.downloading = true;
                $scope.$digest();

                var localPath = fileEntry.nativeURL.replace("file://", "");
                var fileTransfer = new FileTransfer();
                fileTransfer.onprogress = function (progressEvent) {
                    if (progressEvent.lengthComputable) {
                        var percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        $scope.downloadProgress = percent;
                        $scope.$digest();
                    } else {

                    }
                };
                fileTransfer.download(apkUrl, localPath, function (entry) {
                    console.log(entry);
                    installUpdate(entry);
                }, function (error) {

                    sweetAlert({title: "Error downloading APK: " + error.exception}, function () {
                        next();
                    });
                });
            }, function (evt) {
                sweetAlert({title: "Error downloading APK: " + evt.target.error.exception}, function () {
                    next();
                });
            });
        }, function (evt) {
            sweetAlert({title: "Error downloading APK: " + evt.target.error.exception}, function () {
                next();
            });
        });
    };

    /**
     * Updates the application
     * @param entry
     */
    var installUpdate = function (entry) {
        window.plugins.webintent.startActivity({
                action: window.plugins.webintent.ACTION_VIEW,
                url: entry.nativeURL,
                type: 'application/vnd.android.package-archive'
            },
            function () {
                navigator.app.exitApp();
            },
            function (e) {
                $rootScope.hideLoading();

                sweetAlert({title: 'Error launching app update'}, function () {
                    next();
                });
            }
        );
    }
});