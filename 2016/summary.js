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

function setupScope($scope, $firebaseObject) {
  var ref = new Firebase(base.firebaseBackend);
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
    base.initDriveApi(function () {refreshDriveDataHelper($scope);});
  };
  $scope.saveExtension = function() {
    console.log("saving extension ", $scope.parishIds);
    $scope.parishIds.$save();
  };
  $scope.statusClass = function(status, formEditMode) {
    if (!status) return 'bad';
    if (status === 'finished' && formEditMode != 'locked') return 'bad';
    var result = {
      'started': 'in-progress',
      'waiting': 'requested-info',
      're-review': 'attention',
      'finished': 'good',
    }[status];
    if (!result) return 'bad';
    return result;
  };
  $scope.countParishesByReviewerStatus = function() {
    console.log('entering countParishesByReviewerStatus');
    var result = {};
    angular.forEach($scope.parishIds, function(parishData, parishId) {
      if (parishData.excused || !$scope.reviewData.parish) return;
      var parishReviewData = $scope.reviewData.parish[parishId];
      if (!parishReviewData) {
        if (!result['']) result[''] = {};
        if (!result['']['']) result[''][''] = 0;
        result[''][''] += 1;
        return;
      }
      var reviewer = parishReviewData.reviewer_name ? parishReviewData.reviewer_name : '';
      var status = parishReviewData.review_status ? parishReviewData.review_status : '';
      if (!result[reviewer]) result[reviewer] = {};
      if (!result[reviewer][status]) result[reviewer][status] = 0;
      result[reviewer][status] += 1;
    });
    return result;
  };
  $scope.$watch('countParishesByReviewerStatus()', function(newCounts, oldCounts) {
    $scope.reviewerStatusCount = newCounts;
    $scope.reviewerCount = {};
    $scope.statusCount = {};
    $scope.numParishes = 0;
    angular.forEach(newCounts, function(counts, reviewer) {
      angular.forEach(counts, function(count, status) {
        if (!$scope.reviewerCount[reviewer]) $scope.reviewerCount[reviewer] = 0;
        $scope.reviewerCount[reviewer] += count;
        if (!$scope.statusCount[status]) $scope.statusCount[status] = 0;
        $scope.statusCount[status] += count;
        $scope.numParishes += count;
      });
    });
  }, true);
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  base.handleMetroLogin($scope, function() {
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

app.filter('shortReviewStatus', function() {
  return function(status) {
    if (!status) return '-';
    var result = {
      'started': 'Started',
      'waiting': 'Awaiting Response',
      're-review': 'Needs Re-Review',
      'finished': 'Finished',
    }[status];
    if (!result) return status;
    return result;
  };
});

app.filter('formEditMode', function() {
  return function(formEditMode) {
    if (!formEditMode) return 'Not Locked';
    if (formEditMode === 'locked') return 'Locked';
    return 'UNKNOWN FORM EDIT MODE';
  };
});
