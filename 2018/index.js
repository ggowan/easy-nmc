var app = angular.module("easyNmc", ['ui.router']);

function setupSession($scope, $location, ref, auth) {
  $scope.auth = auth;
  ref.child("easy-nmc/public/metropolis-summary").on("value", function(snap) {
    $scope.metro_summary = snap.val();
    console.log("metro_summary", $scope.metro_summary);
    $scope.metro_list = [];
    angular.forEach($scope.metro_summary, function(v, k) {
      $scope.metro_list.push({'key': k, 'name': v.name});
    });
    console.log("metro_list", $scope.metro_list);
    $scope.ready = true;
    $scope.$apply();
  }, function(error) {
    console.log("loading metropolis-summary failed", error);
    $scope.error = error;
  });

  $scope.selectMetro = function(metroId) {
    console.log('selectMetro', metroId);
    $location.path('/metropolis/' + metroId);
  };
}

app.controller("Ctrl", function($scope, $location) {
  var ref = new Firebase(shared.firebaseBackend);

  var auth = ref.getAuth();
  if (!auth) {
    ref.authAnonymously(function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        setupSession($scope, $location, ref, authData);
      }
    });
  } else {
    console.log("Already authenticated: ", auth);
    setupSession($scope, $location, ref, auth);
  }
});

app.config(function($stateProvider) {
  console.log('app.config call');
  var selectMetroState = {
    name: 'select-metro',
    url: '/',
    template: '<h3>select metro!</h3>'
  }

  var selectParishState = {
    name: 'select-parish',
    url: '/metropolis/SF',
    template: '<h3>select parish!</h3>'
  }

  $stateProvider.state(selectMetroState);
  $stateProvider.state(selectParishState);
});