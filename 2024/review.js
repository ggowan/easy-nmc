var app = angular.module("easyNmcReview", ["firebase"]);

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
  var ref = base.getRootRef();
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
  
  var reviewStatusRef = metroRef.child("/review-status/" + $scope.year + "/parish/" + $scope.parish_id);
  $scope.reviewStatus = $firebaseObject(reviewStatusRef);
  $scope.reviewStatus.$loaded().then(function(data) {
    $scope.reviewStatusFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading review data failed: ", error);
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
    return shared.getNumericField(year, field, $scope.reviewData, $scope.formData);
  };
  $scope.original = function(year, field) {
    var yearField = shared.yearToYearField(year);
    if ($scope.formData && $scope.formData[yearField] && 
        angular.isNumber($scope.formData[yearField][field])) {
      return $scope.formData[yearField][field];
    }
    return null;
  };
  // Only returns a non-null value if there was an adjustment.
  $scope.originalIfChanged = function(year, field) {
    var yearField = shared.yearToYearField(year);
    if ($scope.reviewData && $scope.reviewData[yearField] && 
        angular.isNumber($scope.reviewData[yearField][field])) {
      if ($scope.formData && $scope.formData[yearField] && 
          angular.isNumber($scope.formData[yearField][field])) {
        return $scope.formData[yearField][field];
      }
      return 0;
    }
    return null;
  };
  $scope.isAdjusted = function(year, field) {
    var yearField = shared.yearToYearField(year);
    return $scope.reviewData && $scope.reviewData[yearField] && 
        angular.isNumber($scope.reviewData[yearField][field]);
  };
  $scope.lastYearsAdjustment = function(fieldName) {
    if ($scope.formData && $scope.formData.Y1 && $scope.formData.Y1.original && $scope.formData.Y1.adjusted) {
      if (base.isDifferent($scope.formData.Y1.original[fieldName], $scope.formData.Y1.adjusted[fieldName])) {
        return $scope.formData.Y1.adjusted[fieldName];
      }
    }
    return null;
  };
  $scope.totalDeductions = function(year) {
    if (!$scope.formData) return null;
    var yearField = shared.yearToYearField(year);
    return base.sumFields(
        shared.DEDUCTION_FIELDS, $scope.reviewData[yearField], $scope.formData[yearField]);
  };
  $scope.totalOriginalDeductions = function(year) {
    if (!$scope.formData) return null;
    var yearField = shared.yearToYearField(year);
    return base.sumFields(
        shared.DEDUCTION_FIELDS, $scope.formData[yearField]);
  };
  $scope.totalOriginalDeductionsIfChanged = function(year) {
    if (!$scope.formData) return null;
    var yearField = shared.yearToYearField(year);
    var original = $scope.totalOriginalDeductions(year);
    var adjusted = $scope.totalDeductions(year);
    if (Math.abs(adjusted - original) > 0.5) {
      return original;
    }
    return null;
  };
  $scope.netExpenses = function(year) {
    return $scope.get(year, 'expenses') - $scope.totalDeductions(year);
  };
  $scope.originalNetExpenses = function(year) {
    return $scope.original(year, 'expenses') - $scope.totalOriginalDeductions(year);
  };
  $scope.originalNetIfChanged = function(year) {
    if (!$scope.formData) return null;
    var originalNet = $scope.originalNetExpenses(year);
    var net = $scope.netExpenses(year);
    if (Math.abs(net - originalNet) > 0.5) {
      return originalNet;
    }
    return null;
  };
  $scope.editing = function() {
    return $scope.reviewData.editing_user && $scope.reviewData.editing_user === $scope.user.uid
        && $scope.infoFinishedLoading && $scope.firebaseInfo.connected;
  };
  $scope.toggleEditing = function() {
    console.log("toggleEditing");
    if ($scope.editing()) {
      console.log("clearing editing_user");
      $scope.reviewData.editing_user = '';
    } else {
      console.log("setting editing_user");
      $scope.reviewData.editing_user = $scope.user.uid;
    }
    $scope.reviewData.$save().then(function(ref) {
    }, function(error) {
      console.log("Error saving editing toggle:", error);
    });
  };
  $scope.firebaseInfo = $firebaseObject(ref.child(".info"));
  $scope.firebaseInfo.$loaded().then(function(data) {
    $scope.infoFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseInfo failed: ", error);
    $scope.error = error;
  });
  $scope.FOR_YEAR = shared.FOR_YEAR;
  $scope.statusChanged = function() {
    if ($scope.reviewStatus.review_status === 'started' ||
        $scope.reviewStatus.review_status === 'finished') {
      $scope.reviewStatus.form_edit_mode = 'locked';
    }
    $scope.reviewStatus.$save();
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});

// Checks whether the specified string appears to be a positive number, optionally
// formatted like currency.
function looksLikePositiveNumber(val) {
  if (!angular.isString(val)) return false;
  // Make sure there are no extraneous characters and it looks like a number,
  // optionally currency formatted.
  return /^\s*\$?\s*[,0-9]+\.?\d*\s*$/.test(val);
}

// Checks whether the specified string appears to be a negative number, optionally
// formatted like currency.
function looksLikeNegativeNumber(val) {
  if (!angular.isString(val)) return false;
  // Make sure there are no extraneous characters and it looks like a number,
  // optionally currency formatted.
  if (/^\s*\(\$?\s*[,0-9]+\.?\d*\)\s*$/.test(val)) {
    // Negative number surrounded in parens.
    return true;
  } else if (/^\s*\$?-\$?[,0-9]+\.?\d*\s*$/.test(val)) {
    // Negative number with minus sign.
    return true;
  }
  return false;
}

function looksLikeNumber(val) {
  return looksLikePositiveNumber(val) || looksLikeNegativeNumber(val);
}

app.directive('dollars', ['currencyFilter', function(currencyFilter) {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(value) {
        if (looksLikePositiveNumber(value)) {
          return Math.round(Number(value.replace(/[^0-9\.]+/g,"")));
        } else if (looksLikeNegativeNumber(value)) {
          return -Math.round(Number(value.replace(/[^0-9\.]+/g,"")));
        } else if (angular.isString(value)) {
          // If it's not quite a number, we just save whatever they typed in
          // as a string for later analysis.
          return value;
        } else {
          // We store an empty string to represent nothing entered.
          return '';
        }
      });
      ngModel.$formatters.push(function(value) {
        if (angular.isNumber(value)) {
          return currencyFilter(value, '$', 0);
        } else if (angular.isString(value)) {
          return value;
        } else {
          return '';
        }
      });
      ngModel.$validators.validCharacters = function(modelValue, viewValue) {
        if (viewValue === undefined || viewValue === '') {
          return true;
        }
        return looksLikeNumber(viewValue);
      };
      ngModel.$validators.numericRange = function(modelValue, viewValue) {
        if (viewValue === undefined || viewValue === '') {
          return true;
        }
        if (angular.isNumber(modelValue)) {
          return modelValue >= -100000000 && modelValue <= 100000000;
        } else {
          return true;
        }
      };
    }
  };
}]);
