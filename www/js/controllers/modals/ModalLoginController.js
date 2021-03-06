﻿app.controller('ModalLoginController', function ($scope, $rootScope, $uibModalInstance, posUserService, pictureService, Idle, md5) {
    $scope.init = function () {
        initializePosUsers();
        Idle.unwatch();    	 // mise en veille 
        $rootScope.closeKeyboard();
    };

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('PosUser') == 0 || args.id.indexOf('Picture') == 0)) {
            initializePosUsers();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
        $rootScope.closeKeyboard();
    });

    const initializePosUsers = function () {
        posUserService.getPosUsersAsync().then(function (posUsers) {
            const posUsersEnabled = Enumerable.from(posUsers).orderBy('x => x.Name').toArray();

            for (let cat of posUsersEnabled) {
                pictureService.getPictureUrlAsync(cat.PictureId).then(function (url) {
                    if (!url) {
                        url = 'img/photo-non-disponible.png';
                    }
                    cat.PictureUrl = url;
                });
            }

            $scope.posUsers = posUsersEnabled;
        }, function (err) {
            console.log(err);
        });
    };

    $scope.listenedString = "";
    $scope.password = "";
    $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
        $scope.listenedString += data;
        $scope.password += "*";
        if (md5.createHash($scope.listenedString) === $rootScope.PosUser.Password) {
            // Login successfull            
            $rootScope.PosUserId = $rootScope.PosUser.Id;
            $rootScope.PosUserName = $rootScope.PosUser.Name;
            posUserService.saveEventAsync("Login", 0, 0);
            $uibModalInstance.close();
            posUserService.IsWorking($rootScope.PosUserId).then(function (result) {
                if (!result) posUserService.StartWork($rootScope.PosUserId);
            });
        }

        $scope.$digest();
    });

    $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, function (event, key) {
        switch (key) {
            case "CLEAR":
                $scope.listenedString = "";
                $scope.password = "";
                $scope.$evalAsync();
                break;
        }
    });


    $scope.login = function (posUser) {
        $scope.listenedString = "";
        $rootScope.PosUser = posUser;
        Idle.watch();
        $rootScope.openKeyboard("numeric", "end-start");
    }
});