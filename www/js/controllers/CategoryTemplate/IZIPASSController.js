app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogPOS.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'views/CategoryTemplate/IZIPASS.html'
        })
});


app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams, $location, $state, $timeout, $mdMedia, categoryService, productService, pictureService) {
    var self = this;
    $scope.$mdMedia = $mdMedia;

    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            $scope.subSubCategories = [];
            $scope.init();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    $scope.model = {
        category: undefined,
        subCategories: undefined
    };

    $scope.init = function () {
        // Get selected category
        var categoryId = $stateParams.id;
        $scope.load(categoryId);
    };

    var loadingInfos = {
        mainCategory: undefined,
        subCategories: undefined,
        mainProducts: undefined,
        subProducts: undefined
    };

    var checkLoading = function () {
        if (loadingInfos.mainProducts == 0 && loadingInfos.subProducts == 0) {
            $scope.model.category = loadingInfos.mainCategory;
            $scope.model.subCategories = loadingInfos.subCategories;
            $scope.$evalAsync();

            if($scope.model.subCategories){
                if($mdMedia('max-width: 800px')){
                    console.log('subcat, max width 800px');
                    $scope.containerHeight = { 'height' : 'calc(100vh - 100px)'};
                } else {
                    console.log('subcat, max width ! 800px');
                    $scope.containerHeight = { 'height' : 'calc(100vh - 150px)'};
                }
            } else {
                if ($mdMedia('min-width: 800px')) {
                    console.log('pas subcat, min width 800px');
                    $scope.containerHeight = {'height': 'calc(100vh - 100px )'};
                }
            }

            $rootScope.modelPos.categoryLoading = false;
            $scope.shouldRepeat = true;
            /*
            if($rootScope[$scope.model.category.Id]){
                $scope.categoryData = $rootScope[$scope.model.category.Id].innerHTML.replace(/ng-repeat=".*"/g, '' );
                $scope.shouldRepeat = false;
            } else {
                $scope.shouldRepeat = true;
                $rootScope[$scope.model.category.Id] = document.querySelector('#categoryContent');
            }*/


            $rootScope.$evalAsync();
        }
    };

    $scope.load = function (categoryId) {

        categoryService.getCategoryByIdAsync(categoryId).then(function (category) {

            if (!category.products) {
                // Get products for this category
                productService.getProductForCategoryAsync(categoryId).then(function (results) {
                    if (results) {

                        category.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                        loadingInfos.mainProducts = category.products.length;

                        // Pictures
                        Enumerable.from(category.products).forEach(function (p) {
                            pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                var id = Enumerable.from(ids).firstOrDefault();
                                pictureService.getPictureUrlAsync(id).then(function (url) {
                                    if (!url) {
                                        url = 'img/photo-non-disponible.png';
                                    }
                                    p.DefaultPictureUrl = url;

                                    loadingInfos.mainProducts--;
                                    checkLoading();
                                });
                            });
                        });
                    }
                }, function (err) {
                    console.log(err);
                });
            }
            else {
                setTimeout(function () {
                    loadingInfos.mainProducts = 0;
                    checkLoading();
                }, 1);
            }

            loadingInfos.mainCategory = category;


            categoryService.getSubCategoriesByParentAsync(categoryId).then(function (subCategories) {
                //Recupere toutes les sous categories du parent

                if (subCategories.length == 0) {
                    loadingInfos.subProducts = 0;
                    checkLoading();
                }

                Enumerable.from(subCategories).forEach(function (subCat) {
                    if (!subCat.products) {
                        productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                            if (results) {

                                subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                                if (loadingInfos.subProducts) {
                                    loadingInfos.subProducts += subCat.products.length;
                                } else {
                                    loadingInfos.subProducts = subCat.products.length;
                                }

                                // Pictures
                                Enumerable.from(subCat.products).forEach(function (p) {
                                    pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                        var id = Enumerable.from(ids).firstOrDefault();
                                        pictureService.getPictureUrlAsync(id).then(function (url) {
                                            if (!url) {
                                                url = 'img/photo-non-disponible.png';
                                            }
                                            p.DefaultPictureUrl = url;

                                            loadingInfos.subProducts--;
                                            checkLoading();
                                        });
                                    });
                                });
                            }
                        }, function (err) {
                            console.log(err);
                        });
                    } else {
                        loadingInfos.subProducts = 0;
                        checkLoading();
                    }
                });

                loadingInfos.subCategories = subCategories;
            })
        }, function (err) {
            console.log(err);
        });
    };


    $scope.scrollTo = function (elementId) {
        var updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            $("#allCategories").scrollTo(updatedItemElem);
        }
    };
});
