var app = angular.module("easyNmcReview", ["firebase"]);

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
    $scope.formData = snap.val();
    $scope.formDataFinishedLoading = true;
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

  $scope.archMinTotal = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.arch_don, yearObj.hchc, yearObj.stbasil, yearObj.stmichael,
      yearObj.stphotios, yearObj.ionian, yearObj.standrew, yearObj.other_arch
    ].reduce(shared.sumNumbers);
    return total;
  };
  $scope.authMinTotal = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.iocc, yearObj.ocmc, yearObj.ocf, yearObj.prison_min,
      yearObj.eocs, yearObj.ocn, yearObj.ocec, yearObj.ocampr, yearObj.ed_comm
    ].reduce(shared.sumNumbers);
    return total;
  };
  $scope.totalDeductions = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.nmc, $scope.archMinTotal(yearObj), $scope.authMinTotal(yearObj), yearObj.metro,
      yearObj.patriarch, yearObj.cap, yearObj.const_loan, yearObj.mort,
      yearObj.fundraising, yearObj.school, yearObj.religious_ed, yearObj.unusual,
      yearObj.moving, yearObj.outreach, yearObj.clergy_laity, yearObj.other_hier
    ].reduce(shared.sumNumbers);
    return total;
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
