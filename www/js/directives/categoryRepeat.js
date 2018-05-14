app.directive('categoryRepeat', function ($rootScope, $compile, $filter) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {
            var template = "";
            // Composer le template en bouclant dans les datas
            console.log(scope.model);
            /** Subcategories header*/
            if (scope.model.subCategories && scope.model.subCategories.length > 0) {
                var subCatHeader = "";
                // ATTENTION : le responsive marchera pas, le mode pad / pos est determiné par le layout a l'initialisation
                var className = scope.$mdMedia('gt-sm') ? 'subCategoriesHeading-pos' : 'subCategoriesHeading-pad';
                subCatHeader += `<div class="${className}" >`;
                // Repeat dans la subcat
                subCatHeader += `</div>`;
            }

            template += subCatHeader;

            var mainProducts = "";
            for (var product of scope.model.category.products) {
                console.log(product);
                mainProducts += `<div style="margin-bottom:4px">
                    <div aria-label="product button" class="productboxIZIPASS `;
                if (product.DisableBuyButton) {
                    mainProducts += ` disabled`;
                }
                if ($rootScope.UserPreset) {
                    if ($rootScope.UserPreset.ItemSize == 1 || $rootScope.UserPreset.ItemSize && !scope.$mdMedia('gt-sm')) {
                        mainProducts += ` small"`;
                    } else if ($rootScope.UserPreset.ItemSize == 2 && !scope.$mdMedia('gt-sm')) {
                        mainProducts += ` medium"`;
                    } else if ($rootScope.UserPreset.ItemSize == 3 && !scope.$mdMedia('gt-sm')) {
                        mainProducts += ` big"`;
                    }
                }

                mainProducts += ` md-no-ink onclick="$('#IZIPASSController').scope().addToCart()" >`;
                if ($rootScope.UserPreset && $rootScope.UserPreset.ItemSize != 0) {
                    mainProducts +=
                        `<div layout="column" layout-fill>
                        <div class="imageContainer">
                            <img alt="" src="${product.DefaultPictureUrl}" class="image">
                        </div>
                        <div class="titleRow">  
                            ${product.Name}
                        </div>
                        <div class="price">`;
                    if (!product.DisableBuyButton && product.Price && !product.EmployeeTypePrice) {
                        mainProducts += `<span> ${$filter('CurrencyFormat')(product.Price)} </span>`;
                    }
                    if (!product.DisableBuyButton && product.EmployeeTypePrice) {
                        mainProducts += `<span translate>Saisir le prix</span>`;
                    }
                    if (product.DisableBuyButton) {
                        mainProducts += `<span translate>Rupture</span>`;
                    }
                    mainProducts += `</div></div>`;
                }
                /*
                if (!$rootScope.UserPreset || $rootScope.UserPreset.ItemSize == 0) {
                    mainProducts += "<div layout=\"column\" layout-fill>" +
                        "<div class=\"titleRow\">" + product.Name +
                        "</div>" +
                        "<span flex></span>" +
                        "<div class=\"descriptionRow\" layout=\"row\">" +
                        "<img alt=\"\" src=\"" + product.DefaultPictureUrl + "\" class=\"image\">" +
                        "<span flex></span>";
                    if (product.price) {
                        mainProducts += "<div class=\"price\">" + $filter('CurrencyFormat')(product.Price) + "</div>";
                    }
                    mainProducts += "</div><div>";
                    if (!product.DisableBuyButton && product.ProductAttributes.length == 0 && !product.EmployeeTypePrice) {
                        mainProducts += "<div class=\"action\" title=\"Ajouter au panier\">" +
                            "<span class=\"action-text\" translate>" +
                            "Ajouter au ticket" +
                            "</span></div>";
                    }
                    if (!product.DisableBuyButton && product.ProductAttributes.length > 0 && !product.EmployeeTypePrice) {
                        mainProducts += "<div class=\"action\" title=\"Choisir produit\">" +
                            "<span class=\"action-text\" translate>" +
                            "Choisir produit" +
                            "</span></div>";
                    }
                    if (!product.DisableBuyButton && product.ProductAttributes.length == 0 && product.EmployeeTypePrice) {
                        mainProducts += "<div class=\"action\" title=\"Saisir le prix\">" +
                            "<span class=\"action-text\" translate>" +
                            "Saisir le prix" +
                            "</span></div>";
                    }
                    if (product.DisableBuyButton) {
                        mainProducts += "<div class=\"action disabled\" title=\"Rupture\">" +
                            "<span class=\"action-text\" translate>" +
                            "Rupture" +
                            "</span></div>";
                    }
                }*/
                mainProducts += "</div></div></div></div>";
                template += mainProducts;
            }

            element.append(template);
        }
    }
});