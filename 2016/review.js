var app = angular.module("easyNmcReview", ["firebase"]);

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
  var ref = new Firebase(shared.firebaseBackend);
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
  $scope.editing = function() {
    return $scope.reviewData.editing_user && $scope.reviewData.editing_user === $scope.auth.uid
        && $scope.infoFinishedLoading && $scope.firebaseInfo.connected;
  };
  $scope.toggleEditing = function() {
    console.log("toggleEditing");
    if ($scope.editing()) {
      console.log("clearing editing_user");
      $scope.reviewData.editing_user = '';
    } else {
      console.log("setting editing_user");
      $scope.reviewData.editing_user = $scope.auth.uid;
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
  // We use objects instead of arrays for the tallies to work around a bug.
  // https://github.com/firebase/angularfire/issues/623
  $scope.addTally = function() {
    if (!$scope.reviewData.nextTally) $scope.reviewData.nextTally = 100;
    if (!$scope.reviewData.tallies) $scope.reviewData.tallies = {};
    $scope.reviewData.tallies['tally' + $scope.reviewData.nextTally] = {
      rows: {
        'row100': {description: ''},
        'row101': {description: ''}
      },
      nextRow: 102
    };
    $scope.reviewData.nextTally += 1;
    $scope.reviewData.$save();
  };
  $scope.addRow = function(tally) {
    if (!tally.rows) tally.rows = {};
    if (!tally.nextRow) tally.nextRow = 100;
    tally.rows['row' + tally.nextRow] = {description: ''};
    tally.nextRow += 1;
    $scope.reviewData.$save();
  };
  $scope.deleteRow = function(tally, rowKey) {
    delete tally.rows[rowKey];
    $scope.reviewData.$save();
  }
  $scope.tallyTotal = function(tally) {
    result = 0;
    angular.forEach(tally.rows, function(row, rowKey) {
      if (angular.isNumber(row.amount)) {
        result += row.amount;
      }
    });
    return result;
  }
  $scope.statusChanged = function() {
    if ($scope.reviewData.review_status === 'started' ||
        $scope.reviewData.review_status === 'finished') {
      $scope.reviewData.form_edit_mode = 'locked';
    }
    $scope.reviewData.$save();
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  shared.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});

// Checks whether the specified string appears to be a number, optionally
// formatted like currency.
function looksLikePositiveNumber(val) {
  if (!angular.isString(val)) return false;
  // Make sure there are no extraneous characters and it looks like a number,
  // optionally currency formatted.
  return /^\s*\$?\s*[,0-9]+\.?\d*\s*$/.test(val);
}

// Checks whether the specified string appears to be a number, optionally
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
