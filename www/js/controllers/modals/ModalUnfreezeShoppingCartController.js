﻿app.controller('ModalUnfreezeShoppingCartController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia, shoppingCartService, shoppingCartModel, $translate, orderShoppingCartService) {
    let tryGetFreezed = 0;
    let isClosed = false;

    $scope.selectedShoppingCarts = [];

    $scope.init = function () {
        $scope.initFreezed();
        $scope.initOrder();
        $scope.$mdMedia = $mdMedia;
    };

    $scope.initFreezed = function () {
        $scope.shoppingCarts = [];
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (shoppingCarts) {
            $scope.shoppingCarts = Enumerable.from(shoppingCarts).orderBy(function (s) {
                if (s.TableNumber != undefined) {
                    return s.TableNumber;
                } else {
                    return s.Timestamp;
                }
            }).toArray();
        }, function () {
            if (tryGetFreezed < 3) {
                tryGetFreezed = tryGetFreezed + 1;
                setTimeout(function () {
                    $scope.initFreezed();
                }, 3000);
            }
        });
        $scope.$evalAsync();
    };

    $scope.initOrder = function () {
        $scope.orders = orderShoppingCartService.orders;
        $scope.ordersInProgress = orderShoppingCartService.ordersInProgress;
    };

    const dbFreezeChangedHandler = $rootScope.$on('dbFreezeReplicate', function () {
        $scope.initFreezed();
    });

    var orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', function () {
        $scope.initOrder();
    });


    $scope.$on("$destroy", function () {
        dbFreezeChangedHandler();
        orderServiceHandler();
        isClosed = true;
    });

    $scope.getItemsCount = function (shoppingCart) {
        let itemCount = 0;

        for(let i of shoppingCart.Items) {
            itemCount = itemCount + i.Quantity;
        }

        return roundValue(itemCount);
    };

    $scope.checkShoppingCart = function (shoppingCart, event) {
        if (event.toElement.checked) {
            $scope.selectedShoppingCarts.push(shoppingCart);
        } else {
            const index = $scope.selectedShoppingCarts.indexOf(shoppingCart);
            if (index > -1) {
                $scope.selectedShoppingCarts.splice(index, 1);
            }
        }
    };

    $scope.removeShoppingCart = function (shoppingCart) {
        swal({
                title: $translate.instant("Supprimer le ticket ?"),
                text: "",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d83448",
                confirmButtonText: $translate.instant("Oui"),
                cancelButtonText: $translate.instant("Non"),
                closeOnConfirm: true
        }, function () {
            shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {
                $scope.initFreezed();
            }, function () {
                swal($translate.instant("Erreur !"), $translate.instant("Le ticket n'a pas été supprimé."), "error");
            });
        });
    };

    $scope.select = function (shoppingCart) {
        shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {
            shoppingCart.isJoinedShoppingCart = false;
            $uibModalInstance.close(shoppingCart);
        }, function () {
            swal($translate.instant("Erreur !"), $translate.instant("Le ticket n'a pas été supprimé."), "error");
        });
    };

    $scope.selectOrder = function (order) {
        orderShoppingCartService.loadOrderShoppingCartAsync(order).then(function () {
            order.isJoinedShoppingCart = false;
            $uibModalInstance.close(order);
        });
    };

    $scope.join = function () {
        swal({
            title: $translate.instant("Joindre les tickets sélectionnés ?"),
            text: "",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d83448",
            confirmButtonText: $translate.instant("Oui"),
            cancelButtonText: $translate.instant("Non"),
            closeOnConfirm: true
        }, function () {
            let toJoin = Enumerable.from($scope.selectedShoppingCarts).orderBy("s=>s.Timestamp").toArray();

            for(let s of $scope.selectedShoppingCarts) {
                //ATTENTION
                //Bricolage, a amélioré
                //Permet que le RK compteur soit décrémenté correctement
                //Sinon on a des pn de missing rev
                setTimeout(function () {
                    shoppingCartService.unfreezeShoppingCartAsync(s);
                }, 100)
            }

            let joinedShoppingCart = toJoin[0];
            let tableNumber = toJoin[0].TableNumber;
            let tableCutleries = toJoin[0].TableCutleries;
            let tableId = toJoin[0].Id;
            let hasTable = toJoin.filter(x => x.TableNumber || x.tableCutleries);

            for (let i = 1; i < toJoin.length; i++) {
                let curShoppingCart = toJoin[i];
                if(toJoin[i].TableCutleries) {
                    tableCutleries += toJoin[i].TableCutleries;
                }
                if(!tableId) {
                    tableId = toJoin[i].TableId;
                }
                if(!tableNumber) {
                    tableNumber = toJoin[i].TableNumber;
                }
                if(!tableCutleries) {
                    tableCutleries = toJoin[i].TableCutleries;
                }
                for(let item of curShoppingCart.Items) {
                    shoppingCartModel.addItemTo(joinedShoppingCart, undefined, item, item.Quantity);
                }
            }

            joinedShoppingCart.TableNumber = tableNumber;
            joinedShoppingCart.TableCutleries = tableCutleries;
            joinedShoppingCart.TableId = tableId;
            joinedShoppingCart.isJoinedShoppingCart = hasTable.length >= 2;

            $uibModalInstance.close(joinedShoppingCart);
        });
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});