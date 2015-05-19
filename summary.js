var app = angular.module("easyNmcMetroSummary", ["firebase"]);

function refreshDriveDataHelper($scope) {
  angular.forEach($scope.parishIds, function(parishData, parishId) {
    var parishDriveFolder = parishData.upload_folder;
    var listParams = {q: "'" + (parishDriveFolder + "' in parents")};
    console.log('listParams: ', listParams);
    var request = gapi.client.drive.files.list(listParams);
    console.log('sending drive request: ', request);
    request.execute(function(resp) {
      console.log('got response for ' + parishId + ': ', resp);
      var driveEmpty = resp.items.length == 0;
      if (parishData.driveEmpty != driveEmpty) {
        console.log("updating driveEmpty for parish " + parishId + " to " + driveEmpty);
        $scope.$apply(function ($scope) {
          parishData.driveEmpty = driveEmpty;
          if (driveEmpty) {
            console.log("applying empty drive changes for " + parishId);
            if (typeof parishData[$scope.FOR_YEAR-3] === "undefined") {
              parishData[$scope.FOR_YEAR-3] = {};
            }
            if (typeof parishData[$scope.FOR_YEAR-2] == "undefined") {
              parishData[$scope.FOR_YEAR-2] = {};
            }
            parishData[$scope.FOR_YEAR-3].have_pl = false;
            parishData[$scope.FOR_YEAR-2].have_pl = false;
            parishData[$scope.FOR_YEAR-3].have_bal = false;
            parishData[$scope.FOR_YEAR-2].have_bal = false;
          }
        });
      }
    });
  });
}

// Binds the firebase data to a field in the AngularJS scope.
function setupSession($scope, $firebaseObject, ref, auth) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  var patharray = pathname.split('/');
  var queryParams = shared.getQueryParams(url_parser.search);
  $scope.FOR_YEAR = shared.FOR_YEAR;
  $scope.metropolis_id = patharray[2];
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
  
  $scope.reviewData = $firebaseObject($scope.metroRef.child("review-data/" + shared.FOR_YEAR));
  $scope.reviewData.$loaded().then(function(data) {
    console.log("review data finished loading");
    $scope.reviewDataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading review data failed: ", error);
    $scope.error = error;
  });
  
  $scope.parishApproval = function(parishId) {
    if (!$scope.formData || !$scope.formData.parish) return '';
    var numApprovals = 0;
    var parishData = $scope.formData.parish[parishId];
    if (!parishData) return 'no data';
    var numApprovalFields = shared.APPROVAL_FIELDS.length;
    for (var i = 0; i < numApprovalFields; i++) {
      var fieldName = shared.APPROVAL_FIELDS[i];
      if (parishData[fieldName]) {
        numApprovals++;
      }
    }
    if (numApprovals == shared.APPROVAL_FIELDS.length) {
      return 'full';
    } else if (numApprovals > 0) {
      return 'partial';
    } else {
      return 'none';
    }
  };
  $scope.yearField = function(parishId, year, fieldName) {
    if (!$scope.formData || !$scope.formData.parish) return null;
    var parishData = $scope.formData.parish[parishId];
    if (!parishData) return null;
    var yearData = parishData['Y' + year];
    if (!yearData) return null;
    return yearData[fieldName];
  };
  $scope.dataEntered = function(parishId) {
    return $scope.yearField(parishId, shared.FOR_YEAR-3, 'expenses') != null &&
        $scope.yearField(parishId, shared.FOR_YEAR-2, 'expenses') != null;
  };
  $scope.refreshDriveData = function() {
    shared.initDriveApi(function () {refreshDriveDataHelper($scope);});
  };
  $scope.saveExtension = function() {
    console.log("saving extension ", $scope.parishIds);
    $scope.parishIds.$save();
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  var ref = new Firebase(shared.firebaseBackend);
  var auth = ref.getAuth();
  console.log("auth: ", auth);
  if (auth && auth.provider !== "google") {
    console.log("Need to logout");
    ref.unauth();
    auth = null;
  }
  if (!auth) {
    console.log("authenticating with Google");
    ref.authWithOAuthPopup("google", function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
        $scope.error = error;
      } else {
        console.log("authData", authData);
        setupSession($scope, $firebaseObject, ref, authData);
      }
    });
  } else {
    console.log("Already authenticated: ", auth);
    setupSession($scope, $firebaseObject, ref, auth);
  }
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
