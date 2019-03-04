var app = angular.module("easyNmc", ["firebase"]);

function isDifferent(val1, val2) {
  if (angular.isNumber(val1)) {
    if (angular.isNumber(val2)) {
      return Math.abs(val1 - val2) > 0.5;
    } else {
      return true;
    }
  } else {
    return angular.isNumber(val2);
  }
}

// Binds the firebase data to a field in the AngularJS scope.
function bindFirebase($scope, $firebaseObject, ref) {
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
  parishIdRef.child("upload_link").on("value", function(snap) {
    $scope.upload_link = snap.val();
  }, function(error) {
    console.log("loading upload_link failed: ", error);
    $scope.error = error;
  });
  var reviewStatusRef = metroRef.child("/review-status/" + $scope.year + "/parish/" + $scope.parish_id);
  reviewStatusRef.child("form_edit_mode").on("value", function(snap) {
    $scope.form_edit_mode = snap.val();
  });
  var dataFormRef = metroRef.child("/data-form/" + $scope.year + "/parish/" + $scope.parish_id);

  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $scope.firebaseData = $firebaseObject(dataFormRef);
  $scope.firebaseData.$loaded().then(function(data) {
    $scope.dataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseData failed: ", dataFormRef.toString(), error);
    $scope.error = error;
  });

  $scope.totalDeductions = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.nmc, yearObj.arch, yearObj.auth_min, yearObj.metro,
      yearObj.patriarch, yearObj.cap, yearObj.const_loan, yearObj.mort,
      yearObj.fundraising, yearObj.school, yearObj.religious_ed, yearObj.catastrophic,
      yearObj.moving, yearObj.outreach, yearObj.clergy_laity, yearObj.other_hier
    ].reduce(shared.sumNumbers);
    return total;
  };
  $scope.editing = function() {
    return $scope.form_edit_mode !== 'locked' && $scope.firebaseData.editing_user && 
        $scope.firebaseData.editing_user === $scope.user.uid && $scope.infoFinishedLoading &&
        $scope.firebaseInfo.connected;
  };
  $scope.toggleEditing = function() {
    if ($scope.editing()) {
      $scope.firebaseData.editing_user = '';
    } else {
      $scope.firebaseData.editing_user = $scope.user.uid;
    }
    $scope.firebaseData.$save();
  };
  $scope.wasAdjusted = function(fieldName) {
    if ($scope.dataFinishedLoading && $scope.firebaseData.Y1 && $scope.firebaseData.Y1.original && $scope.firebaseData.Y1.adjusted) {
      return isDifferent($scope.firebaseData.Y1.original[fieldName], $scope.firebaseData.Y1.adjusted[fieldName]);
    }
    return false;
  };
  $scope.firebaseInfo = $firebaseObject(ref.child(".info"));
  $scope.firebaseInfo.$loaded().then(function(data) {
    $scope.infoFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseInfo failed: ", error);
    $scope.error = error;
  });
}

function setupSession($scope, $firebaseObject, ref, user) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  // On some browsers the pathname starts with a slash; on others it doesn't.
  if (pathname.charAt(0) === '/') {
    // Drop first slash.
    pathname = pathname.substr(1);
  }
  var patharray = pathname.split('/');
  var queryParams = shared.getQueryParams(url_parser.search);
  $scope.metropolis_id = patharray[1];
  $scope.parish_id = patharray[3];
  $scope.year = patharray[5];
  $scope.user = user;
  console.log("metropolis_id: ", $scope.metropolis_id, " parish_id: ", $scope.parish_id, " year: ", $scope.year);
  if ("key" in queryParams) {
    shared.storeAccessKey(ref, queryParams.key, user, function(error) {
      bindFirebase($scope, $firebaseObject, ref);
    });
  } else {
    bindFirebase($scope, $firebaseObject, ref);
  }
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  firebase.initializeApp(shared.firebaseConfig);
  var ref = firebase.database().ref();
  shared.getUser(ref, function(user) {
    setupSession($scope, $firebaseObject, ref, user);
  }, function(error) {
    console.log("Couldn't get user!", error);
  });
});

// Checks whether the specified string appears to be a number, optionally
// formatted like currency.
function looksLikeNumber(val) {
  if (!angular.isString(val)) return false;
  // Make sure there are no extraneous characters and it looks like a number,
  // optionally currency formatted.
  return /^\s*\$?\s*[,0-9]+\.?\d*\s*$/.test(val);
}

app.directive('dollars', ['currencyFilter', function(currencyFilter) {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      // Parse input.
      ngModel.$parsers.push(function(value) {
        if (looksLikeNumber(value)) {
          // Remove anything that is not a digit or decimal point.
          return Math.round(Number(value.replace(/[^0-9\.]+/g,"")));
        } else if (angular.isString(value)) {
          // If it's not quite a number, we just save whatever they typed in
          // as a string for later analysis.
          return value;
        } else {
          // We store an empty string to represent nothing entered.
          return '';
        }
      });

      // Format output.
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
          return modelValue >= 0.0 && modelValue <= 100000000;
        } else {
          return true;
        }
      };
    }
  };
}]);
