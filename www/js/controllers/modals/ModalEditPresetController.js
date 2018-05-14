app.controller('ModalEditPresetController', function ($scope, $rootScope, $uibModal, $uibModalInstance, selectedPreset, mode) {

        $scope.model = {};
        $scope.init = function () {
            switch(mode){
                case 'edit':
                    $scope.mode = 1;
                    break;
                case 'create':
                    $scope.mode = 2;
                    break;
                default:
                    break;
            }
            $scope.preset = selectedPreset.value;

            $scope.model.preset = {
                flags: {
                    DisplayFid: {
                        value: true,
                        text: "Bandeau fidélité",
                    },
                    DisplayDelivery: {
                        value: true,
                        text: "Modes de conso.",
                    }

                },
                radios: {
                    HandPreference: {
                        values : [
                            {value: 1, text: 'Droitier'},
                            {value: 2, text: 'Gaucher'}
                        ],
                        value: 1,
                        text: "Main dominante"
                    },

                    DefaultDeliveryMode: {
                        values: [
                            {value: 0, text: "Sur Place"},
                            {value: 1, text: "A Emporté"},
                            {value: 2, text: "Livré"},
                        ],
                        value: 0,
                        text: "Mode de conso. par defaut",
                    },

                    ItemSize: {
                        values: [
                            {value: 0, text: "Old School"},
                            {value: 1, text: "Petit"},
                            {value: 2, text: "Moyen"},
                            {value: 3, text: "Grand"},
                        ],
                        value: 1,
                        text: "Taille des produits",
                    },
                },
                checkboxes: {
                    DisplayButtons: {
                        values: {
                            Valid: {
                                value: true,
                                text: "Validation"
                            },
                            ValidAndPrint: {
                                value: true,
                                text: "Validation + Impr."
                            },
                            PrintProd: {
                                value: true,
                                text: "Impr. note"
                            },
                        },
                        text: "Affichage des boutons",
                    },
                },
            };
        };

        $scope.ok = function () {
            $uibModalInstance.close(selectedPreset);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }
    }
);