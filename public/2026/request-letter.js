var app = angular.module("easyNmc", []);

function setupScope($scope) {
  firebase.initializeApp(base.firebaseConfig);
  var ref = firebase.database().ref();
  let metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
  let parishIdRef = metroRef.child("parish-id");
  $scope.year = shared.FOR_YEAR;
  parishIdRef.once("value", function(snap) {
    $scope.$apply(function() {
      $scope.parishes = snap.val();
      $scope.ready = true;
    });
  }, function(error) {
    console.log("Failed to read parishes", error);
  });
}

app.controller("Ctrl", function($scope) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope);
  });
});

app.filter('objectByKeyValFilter', base.objectByKeyValFilter);
