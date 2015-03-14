var app = angular.module("easyNmc", ["firebase"]);

app.controller("Ctrl", function($scope, $firebaseObject) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  var patharray = pathname.split('/');
  console.log('patharray: ' + patharray);
  if (patharray[1] === 'metropolis' &&
      patharray[3] === 'parish' &&
      patharray[5] === 'data-form') {
    $scope.metropolis_id = patharray[2];
    $scope.parish_id = patharray[4];
    $scope.year = patharray[6];
    var ref = new Firebase("https://qba6bmkso0x.firebaseio-demo.com"
                           + "/metropolis/" + metropolis_id
                           + "/parish/" + parish_id
                           + "/data-form/" + year);

    // download the data into a local object
    var syncObject = $firebaseObject(ref);

    // synchronize the object with a three-way data binding
    // click on `index.html` above to see it used in the DOM!
    syncObject.$bindTo($scope, "data");
  }
});
