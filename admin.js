var app = angular.module("easyNmcMetro", ["firebase"]);

function generateKey() {
  var possibleCharacters = "abcdefghjkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
  var key = "";
  for (var i = 0; i < 20; i++) {
    key = key + possibleCharacters.charAt(Math.random() * possibleCharacters.length);
  }
  return key;
}

// Returns a request to create the specified folder. Caller should call "then" on it.
function createFolder(parentFolderId, folderName) {
  console.log("createFolder invoked; parentFolderId:", parentFolderId,
              ", folderName:", folderName);
  var metaData = {
    'title': folderName,
    "parents": [{"id": parentFolderId}],
    'mimeType': "application/vnd.google-apps.folder"
  };

  var request = gapi.client.request({
    'path': '/drive/v2/files',
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json'
    },
    'body': metaData
  });
  return request;
}

function createParishFolderIfMissing($scope, parishId) {
  console.log("createParishFolderIfMissing ", parishId);
  var parishInfo = $scope.parishIds[parishId];
  if (!parishInfo.upload_folder) {
    var folderName = parishInfo.city + ", " + parishInfo.name;
    createFolder($scope.metaData.upload_folder, folderName).then(function(response) {
      console.log("Created folder", response);
      $scope.$apply(function(scope) {
        parishInfo.upload_folder = response.result.id;
      });
    }, function(error) {
      console.log("Failed to create folder: ", error);
      $scope.error = error;
    });
  } else {
    console.log("Upload folder already exists for ", parishId);
  }
}

function createFoldersAuthorized($scope) {
  console.log("Google API Authorized");
  for (var parishId in $scope.parishIds) {
    if ($scope.parishIds.hasOwnProperty(parishId) && parishId.charAt(0) !== '$') {
      console.log("Create folder for parishId: ", parishId);
      createParishFolderIfMissing($scope, parishId);
    }
  }
}

function createParishFolders($scope) {
  console.log("createParishFolders called with $scope.metaData.upload_folder: ", $scope.metaData.upload_folder);
  var CLIENT_ID = '540806466980-i5mifkaf6utq2g8k3p3opbj6gd4jv9oj.apps.googleusercontent.com';
  var SCOPES = 'https://www.googleapis.com/auth/drive';
  gapi.auth.authorize(
      {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
      function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
          // We're authorized, now load the Drive API.
          gapi.client.load('drive', 'v2', function() {
            createFoldersAuthorized($scope);
          });
        } else {
          console.log("Google API authorization failed: ", authResult.error);
          $scope.error = authResult.error;
        }
      });
}

// Binds the firebase data to a field in the AngularJS scope.
function setupSession($scope, $firebaseObject, ref, auth) {
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  var patharray = pathname.split('/');
  var queryParams = getQueryParams(url_parser.search);
  $scope.metropolis_id = patharray[2];
  $scope.metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
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
      }
    }
  };
  $scope.createFolders = function() { createParishFolders($scope); };
  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $firebaseObject($scope.metroRef.child("parish-id")).$bindTo($scope, "parishIds").then(function() {
    console.log("parish-id finished loading");
    $scope.parishIdsFinishedLoading = true;
  }, function(error) {
    $scope.error = error;
  });
  $firebaseObject($scope.metroRef.child("meta-data")).$bindTo($scope, "metaData").then(function() {
    console.log("metadata finished loading: ", $scope.metaData);
    $scope.metaDataFinishedLoading = true;
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