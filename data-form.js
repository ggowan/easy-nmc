var app = angular.module("easyNmc", ["firebase"]);

// Adapted from http://stackoverflow.com/a/2880929 by Andy E.
function getQueryParams(search) {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  var queryParams = {};
  while (match = search.exec(query))
     queryParams[decode(match[1])] = decode(match[2]);
  return queryParams;
}

// Binds the firebase data to a field in the AngularJS scope.
function bindFirebase($scope, $firebaseObject, ref) {
  var dataFormRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id
                              + "/parish/" + $scope.parish_id
                              + "/data-form/" + $scope.year);

  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $firebaseObject(dataFormRef).$bindTo($scope, "firebaseData");
  $firebaseObject(ref.child(".info")).$bindTo($scope, "firebaseInfo");
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  var patharray = pathname.split('/');
  var queryParams = getQueryParams(url_parser.search);
  $scope.metropolis_id = patharray[2];
  $scope.parish_id = patharray[4];
  $scope.year = patharray[6];
  var ref = new Firebase("https://intense-heat-7228.firebaseio.com/");

  var auth = ref.getAuth();
  if (!auth) {
    ref.authAnonymously(function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        auth = authData;
      }
    });
  } else {
    console.log("Already authenticated: ", auth);
  }
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
});

// Checks whether the specified string appears to be a number, optionally
// formatted like currency.
function looksLikeNumber(val) {
  if (!angular.isString(val)) return false;
  // Make sure there are no extraneous characters and it looks like a number,
  // optionally currency formatted.
  return /^\s*\$?[,0-9]+\.?\d*\s*$/.test(val);
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
          return modelValue >= 0.0 && modelValue <= 10000000;
        } else {
          return true;
        }
      };
    }
  };
}]);

