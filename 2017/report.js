var app = angular.module("easyNmcReport", ["firebase"]);

function sumFields(fields, yearObj, fallback) {
  var total = 0;
  angular.forEach(fields, function(fieldName) {
    if (yearObj && angular.isNumber(yearObj[fieldName])) {
      total += yearObj[fieldName];
    } else if (fallback && angular.isNumber(fallback[fieldName])) {
      total += fallback[fieldName];
    }
  });
  return total;
}

function anyFieldIsNumber(fields, yearObj) {
  if (yearObj === undefined) return false;
  var result = false;
  angular.forEach(fields, function(fieldName) {
    if (angular.isNumber(yearObj[fieldName])) {
      result = true;
    }
  });
  return result;
}

function setupScope($scope, $firebaseObject) {
  $scope.parish_id = $scope.patharray[3];
  $scope.year = $scope.patharray[5];
  var ref = new Firebase(base.firebaseBackend);
  var metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
  var parishIdRef = metroRef.child("/parish-id/" + $scope.parish_id);
  parishIdRef.child("name").on("value", function(snap) {
    $scope.parish_name = snap.val();
  }, function(error) {
    console.log("loading name failed: ", error);
    $scope.error = error;
  });
  parishIdRef.child("city").on("value", function(snap) {
    $scope.parish_city = snap.val();
  }, function(error) {
    console.log("loading city failed: ", error);
    $scope.error = error;
  });
  parishIdRef.child("state").on("value", function(snap) {
    $scope.parish_state = snap.val();
  }, function(error) {
    console.log("loading state failed: ", error);
    $scope.error = error;
  });
  parishIdRef.child("parish_code").on("value", function(snap) {
    $scope.parish_code = snap.val();
  }, function(error) {
    console.log("loading state failed: ", error);
    $scope.error = error;
  });
  parishIdRef.child("upload_folder").on("value", function(snap) {
    $scope.upload_folder = snap.val();
  }, function(error) {
    console.log("loading upload_folder failed: ", error);
    $scope.error = error;
  });
  parishIdRef.child("access_key").on("value", function(snap) {
    $scope.access_key = snap.val();
  }, function(error) {
    console.log("loading access key failed: ", error);
    $scope.error = error;
  });
  var dataFormRef = metroRef.child("/data-form/" + $scope.year + "/parish/" + $scope.parish_id);
  dataFormRef.on("value", function(snap) {
    $scope.$apply(function() {
      $scope.formData = snap.val();
      $scope.formDataFinishedLoading = true;
    });
  }, function(error) {
    console.log("loading form data failed: ", error);
    $scope.error = error;
  });
  
  var reviewDataRef = metroRef.child("/review-data/" + $scope.year + "/parish/" + $scope.parish_id);
  $scope.reviewData = $firebaseObject(reviewDataRef);
  $scope.reviewData.$loaded().then(function(data) {
    $scope.reviewDataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading review data failed: ", error);
    $scope.error = error;
  });

  $scope.get = function(year, field) {
    var yearField = 'Y' + year;
    if ($scope.reviewData && $scope.reviewData[yearField] && 
        angular.isNumber($scope.reviewData[yearField][field])) {
      return $scope.reviewData[yearField][field];
    }
    if ($scope.formData && $scope.formData[yearField] && 
        angular.isNumber($scope.formData[yearField][field])) {
      return $scope.formData[yearField][field];
    }
    return 0;
  };
  $scope.isAdjusted = function(year, field) {
    var yearField = 'Y' + year;
    return $scope.reviewData && $scope.reviewData[yearField] && 
        angular.isNumber($scope.reviewData[yearField][field]);
  };
  $scope.archMinTotal = function(yearObj, fallback) {
    return sumFields(shared.ARCH_MIN_FIELDS, yearObj, fallback);
  };
  $scope.isArchMinAdjusted = function(year) {
    var yearField = 'Y' + year;
    return anyFieldIsNumber(shared.ARCH_MIN_FIELDS, $scope.reviewData[yearField]);
  };
  $scope.authMinTotal = function(yearObj, fallback) {
    return sumFields(shared.AUTH_MIN_FIELDS, yearObj, fallback);
  };
  $scope.isAuthMinAdjusted = function(year) {
    var yearField = 'Y' + year;
    return anyFieldIsNumber(shared.AUTH_MIN_FIELDS, $scope.reviewData[yearField]);
  };
  $scope.totalDeductions = function(year) {
    if (!$scope.formData) return null;
    var yearField = 'Y' + year;
    return sumFields(
        shared.DEDUCTION_FIELDS, $scope.reviewData[yearField], $scope.formData[yearField]);
  };
  $scope.firebaseInfo = $firebaseObject(ref.child(".info"));
  $scope.firebaseInfo.$loaded().then(function(data) {
    $scope.infoFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseInfo failed: ", error);
    $scope.error = error;
  });
  $scope.FOR_YEAR = shared.FOR_YEAR;
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});
