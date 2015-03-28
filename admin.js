var app = angular.module("easyNmcMetro", ["firebase"]);

function generateKey() {
  var possibleCharacters = "abcdefghjkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
  var key = "";
  for (var i = 0; i < 20; i++) {
    key = key + possibleCharacters.charAt(Math.random() * possibleCharacters.length);
  }
  return key;
}

// Binds the firebase data to a field in the AngularJS scope.
function setupSession($scope, $firebaseObject, ref, auth) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  var patharray = pathname.split('/');
  var queryParams = getQueryParams(url_parser.search);
  $scope.metropolis_id = patharray[2];
  var metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
  $scope.addParish = function(parishId) {
    console.log("addParish", parishId);
    if ($scope.parishIds[parishId] === undefined) {
      $scope.parishIds[parishId] = { access_key: generateKey() };
      $scope.new_parish_id = '';
    }
  };
  $scope.generateKeys = function() {
    console.log("generateKeys");
    for (var parishId in $scope.parishIds) {
      if (parishId === "test-parish2") continue;
      if ($scope.parishIds.hasOwnProperty(parishId) && parishId.charAt(0) !== '$') {
        console.log("parishId: ", parishId);
        if (!$scope.parishIds[parishId].access_key) {
          $scope.parishIds[parishId].access_key = generateKey();
        }
        /*metroRef.child("parish/" + parishId + "/access-key").once("value", function(snap) {
          console.log("access key for " + parishId, snap.val());
          $scope.$apply(function(scope) {
            scope.parishIds[parishId]["access_key"] = snap.val();
          });
        });*/
      }
    }
  };
  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $firebaseObject(metroRef.child("parish-id")).$bindTo($scope, "parishIds").then(function() {
    console.log("parish-id finished loading");
    $scope.parishIdsFinishedLoading = true;
  }, function(error) {
    $scope.error = error;
  });
  $firebaseObject(ref.child(".info")).$bindTo($scope, "firebaseInfo").then(function() {
    console.log(".info finished loading");
    $scope.infoFinishedLoading = true;
  }, function(error) {
    $scope.error = error;
  });
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  var ref = new Firebase("https://intense-heat-7228.firebaseio.com/");
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
