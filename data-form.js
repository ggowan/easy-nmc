var app = angular.module("easyNmc", ["firebase"]);

function sumNumbers(a, b) {
  if (angular.isNumber(a)) {
    if (angular.isNumber(b)) {
      return a + b;
    } else {
      return a;
    }
  } else if (angular.isNumber(b)) {
    return b;
  }
  return 0;
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
  parishIdRef.child("upload_folder").on("value", function(snap) {
    $scope.upload_folder = snap.val();
  }, function(error) {
    console.log("loading upload_folder failed: ", error);
    $scope.error = error;
  });
  var dataFormRef = metroRef.child("/data-form/" + $scope.year + "/parish/" + $scope.parish_id);

  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $scope.firebaseData = $firebaseObject(dataFormRef);
  $scope.firebaseData.$loaded().then(function(data) {
    $scope.dataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseData failed: ", error);
    $scope.error = error;
  });

  $scope.archMinTotal = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.arch_don, yearObj.hchc, yearObj.stbasil, yearObj.stmichael,
      yearObj.stphotios, yearObj.ionian, yearObj.standrew, yearObj.other_arch
    ].reduce(sumNumbers);
    return total;
  };
  $scope.authMinTotal = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.iocc, yearObj.ocmc, yearObj.ocf, yearObj.prison_min,
      yearObj.eocs, yearObj.ocn, yearObj.ocec, yearObj.ocampr, yearObj.ed_comm
    ].reduce(sumNumbers);
    return total;
  };
  $scope.totalDeductions = function(yearObj) {
    if (yearObj === undefined) return 0;
    var total = [
      yearObj.nmc, $scope.archMinTotal(yearObj), $scope.authMinTotal(yearObj), yearObj.metro,
      yearObj.patriarch, yearObj.cap, yearObj.const_loan, yearObj.mort,
      yearObj.fundraising, yearObj.school, yearObj.religious_ed, yearObj.unusual,
      yearObj.moving, yearObj.outreach, yearObj.clergy_laity, yearObj.other_hier
    ].reduce(sumNumbers);
    return total;
  };
  $scope.editing = function() {
    return $scope.firebaseData.editing_user && $scope.firebaseData.editing_user === $scope.auth.uid
        && $scope.infoFinishedLoading && $scope.firebaseInfo.connected;
  };
  $scope.toggleEditing = function() {
    if ($scope.editing()) {
      $scope.firebaseData.editing_user = '';
    } else {
      $scope.firebaseData.editing_user = $scope.auth.uid;
    }
  };
  $scope.firebaseInfo = $firebaseObject(ref.child(".info"));
  $scope.firebaseInfo.$loaded().then(function(data) {
    $scope.infoFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading firebaseInfo failed: ", error);
    $scope.error = error;
  });
}

function setupSession($scope, $firebaseObject, ref, auth) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  // On some browsers the pathname starts with a slash; on others it doesn't.
  if (pathname.charAt(0) === '/') {
    // Drop first slash.
    pathname = pathname.substr(1);
  }
  var patharray = pathname.split('/');
  var queryParams = getQueryParams(url_parser.search);
  $scope.metropolis_id = patharray[1];
  $scope.parish_id = patharray[3];
  $scope.year = patharray[5];
  $scope.auth = auth;
  console.log("metropolis_id: ", $scope.metropolis_id, " parish_id: ", $scope.parish_id, " year: ", $scope.year);
  if ("key" in queryParams) {
    var userProfile = ref.child("easy-nmc/user").child(auth.uid);
    var keys = userProfile.child("access-key");
    keys.child(queryParams.key).set(true, function(error) {
      if (error) {
        console.log('Failed to store key in profile: ', error);
      } else {
        console.log('Stored key in profile: ', queryParams.key);
      }
      bindFirebase($scope, $firebaseObject, ref);
    });
  } else {
    bindFirebase($scope, $firebaseObject, ref);
  }
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  var ref = new Firebase(shared.firebaseBackend);

  var auth = ref.getAuth();
  if (!auth) {
    ref.authAnonymously(function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        setupSession($scope, $firebaseObject, ref, authData);
      }
    });
  } else {
    console.log("Already authenticated: ", auth);
    setupSession($scope, $firebaseObject, ref, auth);
  }
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
      ngModel.$parsers.push(function(value) {
        if (looksLikeNumber(value)) {
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
