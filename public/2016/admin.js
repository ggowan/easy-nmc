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
  base.initDriveApi(function() {createFoldersAuthorized($scope);});
}

function setupScope($scope, $firebaseObject) {
  var ref = new Firebase(base.firebaseBackend);
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
  $scope.committeeInvites = $firebaseObject($scope.metroRef.child("committee-invite"));
  $scope.createInvitation = function(recipientName) {
    $scope.committeeInvites[generateKey()] = recipientName;
    $scope.committeeInvites.$save();
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});
