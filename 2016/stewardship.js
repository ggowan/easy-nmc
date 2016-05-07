var app = angular.module("easyNmcMetroStewardship", ["firebase"]);

function setupScope($scope, $firebaseObject) {
  var ref = new Firebase(shared.firebaseBackend);
  $scope.FOR_YEAR = shared.FOR_YEAR;
  $scope.metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);

  $scope.parishIds = $firebaseObject($scope.metroRef.child("parish-id"));
  $scope.parishIds.$loaded().then(function(data) {
    console.log("parish-id finished loading");
    $scope.parishIdsFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading parish-id failed: ", error);
    $scope.error = error;
  });

  $scope.metaData = $firebaseObject($scope.metroRef.child("meta-data"));
  $scope.metaData.$loaded().then(function(data) {
    console.log("metadata finished loading: ", $scope.metaData);
    $scope.metaDataFinishedLoading = true;
  }).catch(function(error) {
    $scope.error = error;
  });

  $scope.firebaseInfo = $firebaseObject(ref.child(".info"));
  $scope.firebaseInfo.$loaded().then(function() {
    console.log(".info finished loading");
    $scope.infoFinishedLoading = true;
  }).catch(function(error) {
    $scope.error = error;
  });

  $scope.formData = $firebaseObject($scope.metroRef.child("data-form/" + shared.FOR_YEAR));
  $scope.formData.$loaded().then(function(data) {
    console.log("form data finished loading");
    $scope.formDataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading form data failed: ", error);
    $scope.error = error;
  });

  $scope.yearField = function(parishId, year, fieldName) {
    if (!$scope.formData || !$scope.formData.parish) return null;
    var parishData = $scope.formData.parish[parishId];
    if (!parishData) return null;
    var yearData = parishData['Y' + year];
    if (!yearData) return null;
    return yearData[fieldName];
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  shared.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});

// Filters for properties that do not have the specified sub-property value.
// From http://stackoverflow.com/a/19850450 (with tweaks).
app.filter('objectByKeyValFilter', function () {
  return function (input, subPropertyName, subPropertyValue) {
    var filteredInput ={};
    angular.forEach(input, function(value, key) {
      if (value[subPropertyName] !== subPropertyValue) {
        filteredInput[key] = value;
      }
    });
    return filteredInput;
  }
});
