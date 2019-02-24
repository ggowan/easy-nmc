var app = angular.module("easyNmc", ['ui.router']);

function getAuth(ref, successCallback, errorCallback) {
  var auth = ref.getAuth();
  if (!auth) {
    ref.authAnonymously(function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
        errorCallback(error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        successCallback(authData);
      }
    });
  } else {
    console.log("Already authenticated: ", auth);
    successCallback(auth);
  }
}

app.controller("Ctrl", function($scope, $state, $location, $urlRouter) {
  $scope.year = shared.FOR_YEAR;

  // Initialize Firebase
  firebase.initializeApp(shared.firebaseConfig);
  var ref = firebase.database().ref();
  ref.child("easy-nmc/public/metropolis-summary").once("value", function(snap) {
    $scope.error = null;
    $scope.metro_summary = snap.val();
    $scope.metro_list = [];
    $scope.parish_list = {};  // Keyed by metro, then list of parishes.
    angular.forEach($scope.metro_summary, function(v, k) {
      $scope.metro_list.push({'key': k, 'name': v.name});
      $scope.parish_list[k] = []
      angular.forEach(v.parishes, function(pv, pk) {
        $scope.parish_list[k].push({'key': pk, 'name': pv.name, 'city': pv.city, 'state': pv.state});
      });
    });
    $scope.ready = true;
    $scope.$apply();
  }, function(error) {
    console.log("loading metropolis-summary failed", error);
    $scope.error = error;
  });

  $scope.selectMetro = function(metroId) {
    $state.go('select-parish', {metroId: metroId});
  };

  $scope.metroId = function() {
    return $state.params['metroId'];
  }

  $scope.getParishList = function() {
    return $scope.parish_list[$scope.metroId()];
  };

  // Checks to see if the user has access to the form for the specified
  // parish. If so, invokes successCallback; otherwise, failureCallback.
  $scope.checkAccess = function(parishId, successCallback, failureCallback) {
    getAuth(ref, function(auth) {
      $scope.error = null;
      // Test to see if the access key is working by reading small piece of
      // data from protected area.
      var metroRef = ref.child("easy-nmc/metropolis/" + $scope.metroId());
      var parishIdRef = metroRef.child("/parish-id/" + parishId);
      parishIdRef.child("city").once("value", function(snap) {
        $scope.$apply(successCallback);
      }, function(error) {
        console.log("loading test data failed: ", error);
        $scope.$apply(failureCallback);
      });
    }, function(error) {
      $scope.error = error;
      $scope.$apply(failureCallback);
    });
  }

  // Redirects the browser to the data form for the specified parish.
  $scope.redirectToForm = function(parishId) {
    var dest = '/metropolis/' + $scope.metroId() + '/parish/' + parishId + '/data-form/' + shared.FOR_YEAR;
    console.log("redirecting to", dest);
    window.location.href = dest;
  }
  
  $scope.selectParish = function(parishId) {
    $scope.checkAccess(parishId, function() {
      // Already have access to this parish; go straight to the form.
      $scope.redirectToForm(parishId);
    }, function() {
      // Don't have access yet; need access key.
      $state.go('enter-access-key', {metroId: $scope.metroId(), parishId: parishId});
    });
  };

  $scope.metroSummary = function() {
    return $scope.metro_summary[$scope.metroId()];
  };

  $scope.parishId = function() {
    return $state.params['parishId'];
  }

  $scope.parish = function() {
    return $scope.metroSummary().parishes[$scope.parishId()];
  };

  $scope.pendingKeyCheck = -1;
  $scope.submitKey = function(accessKey) {
    console.log('submitKey', accessKey);
    $scope.pendingKeyCheck++;
    getAuth(ref, function(auth) {
      $scope.error = null;
      shared.storeAccessKey(ref, accessKey, auth, function(error) {
        console.log('finished store', error);
        $scope.error = error;
        if (error) {
          $scope.pendingKeyCheck--;
          return;
        }
        $scope.checkAccess($scope.parishId(), function() {
          console.log("access successful, redirecting to form.");
          $scope.failedKeyCheck = false;
          $scope.pendingKeyCheck--;
          $scope.redirectToForm($scope.parishId());
        }, function() {
          $scope.failedKeyCheck = true;
          $scope.pendingKeyCheck--;
        });
      });
    }, function(error) {
      $scope.error = error;
    });
  };
});

app.config(function($stateProvider, $urlRouterProvider) {
  console.log('app.config call');
  $stateProvider.state({
    name: 'select-metro',
    url: '/',
    templateUrl: '/2020/select-metro.html'
  }).state({
    name: 'select-parish',
    url: '/metropolis/:metroId',
    templateUrl: '/2020/select-parish.html'
  }).state({
    name: 'enter-access-key',
    url: '/metropolis/:metroId/parish/:parishId',
    templateUrl: '/2020/enter-access-key.html'
  });
  $urlRouterProvider.otherwise("/");
});

