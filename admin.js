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
  var parishInfo = $scope.parishInfos[parishId];
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
  for (var parishId in $scope.parishInfos) {
    if ($scope.parishInfos.hasOwnProperty(parishId) && parishId.charAt(0) !== '$') {
      console.log("Create folder for parishId: ", parishId);
      createParishFolderIfMissing($scope, parishId);
    }
  }
}

function createParishFolders($scope) {
  console.log("createParishFolders called with $scope.metaData.upload_folder: ", $scope.metaData.upload_folder);
  shared.initDriveApi(function() {createFoldersAuthorized($scope);});
}

function copyPropertiesIfPresent(source, dest, properties) {
  angular.forEach(properties, function(property) {
    if (source[property]) {
      dest[property] = source[property];
    }
  });
}

function setupScope($scope, $firebaseObject) {
  var ref = new Firebase(shared.firebaseBackend);
  $scope.metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
  $scope.forYear = shared.FOR_YEAR;
  $scope.addParish = function(parishId) {
    console.log("addParish", parishId);
    if ($scope.parishInfos[parishId] === undefined) {
      $scope.parishInfos[parishId] = { access_key: generateKey() };
      $scope.new_parish_id = '';
    }
  };
  $scope.generateKeys = function() {
    console.log("generateKeys");
    for (var parishId in $scope.parishInfos) {
      if ($scope.parishInfos.hasOwnProperty(parishId) && parishId.charAt(0) !== '$') {
        console.log("parishId: ", parishId);
        if (!$scope.parishInfos[parishId].access_key) {
          $scope.parishInfos[parishId].access_key = generateKey();
        }
      }
    }
  };
  $scope.createFolders = function() { createParishFolders($scope); };
  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $firebaseObject($scope.metroRef.child("parish-id")).$bindTo($scope, "parishInfos").then(function() {
    console.log("parish-id finished loading");
    $scope.parishInfosFinishedLoading = true;
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
  $scope.autoFillForms = function() {
    console.log("autoFillForms");
    angular.forEach($scope.parishInfos, function(parishInfo, parishId) {
      if (!$scope.parishInfos.hasOwnProperty(parishId) || parishId.charAt(0) == '$') {
        // Skip the firebaseObject methods.
        return;
      }
      console.log("parishId: ", parishId);
      previousFormRef = $scope.metroRef.child("data-form/" + (shared.FOR_YEAR - 1) + "/parish/" + parishId);
      previousFormRef.once("value", function(previousFormSnapshot) {
        console.log("once responded", parishId);
        previousFormVal = previousFormSnapshot.val();
        if (previousFormVal) {
          console.log("have previous form data", parishId, previousFormVal);
          currentFormRef = $scope.metroRef.child("data-form/" + shared.FOR_YEAR + "/parish/" + parishId);
          var transactionMessage = null;
          currentFormRef.transaction(function(currentFormVal) {
            console.log("transaction update function", parishId, currentFormVal);
            if (currentFormVal) {
              console.log("recording that parish already has data", parishId);
              transactionMessage = "parish already has data; not copying";
              return currentFormVal;
            }
            transactionMessage = null;
            currentFormVal = {};
            copyPropertiesIfPresent(previousFormVal, currentFormVal, [
              'priest_name',
              'priest_phone',
              'priest_email',
              'pres_name',
              'pres_phone',
              'pres_email',
              'treas_name',
              'treas_phone',
              'treas_email',
              'preparer_name',
              'preparer_phone',
              'preparer_email',
              'income_explanation',
              'expense_explanation',
              'nmc_lines',
              'arch_don_lines',
              'auth_min_lines',
              'metro_lines',
              'metro_desc',
              'patriarch_lines',
              'patriarch_desc',
              'cap_lines',
              'cap_projects',
              'const_loan_lines',
              'mort_lines',
              'fundraising_lines',
              'school_lines',
              'religious_ed_lines',
              'catastrophic_lines',
              'moving_lines',
              'outreach_lines',
              'clergy_laity_lines',
              'other_hier_lines',
              'other_hier_explanation',
              'dues_family',
              'dues_single',
              'dues_senior',
              'stew_name1',
              'stew_phone1',
              'stew_email1',
              'stew_name2',
              'stew_phone2',
              'stew_email2',
              'stew_name3',
              'stew_phone3',
              'stew_email3',
              'stew_name4',
              'stew_phone4',
              'stew_email4',
            ]);
            if (previousFormVal.Y2014) {
              if (!currentFormVal.Y1) {
                currentFormVal.Y1 = {};
              }
              copyPropertiesIfPresent(previousFormVal.Y2014, currentFormVal.Y1, [
                'income',
                'expenses',
                'nmc',
                'metro',
                'patriarch',
                'cap',
                'const_loan',
                'mort',
                'fundraising',
                'school',
                'religious_ed',
                'moving',
                'outreach',
                'clergy_laity',
                'other_hier',
                'prop_liab'
              ]);
              currentFormVal.Y1.catastrophic = previousFormVal.Y2014.unusual;
              var arch = shared.sumFields(shared.ARCH_MIN_FIELDS, previousFormVal.Y2014);
              if (arch) {
                currentFormVal.Y1.arch = arch;
              }
              var authMin = shared.sumFields(shared.AUTH_MIN_FIELDS, previousFormVal.Y2014);
              if (authMin) {
                currentFormVal.Y1.auth_min = authMin;
              }
              copyPropertiesIfPresent(previousFormVal.Y2014, currentFormVal.Y1,
                shared.STEWARDSHIP_FIELDS_PER_YEAR);
              if (!currentFormVal.Y2) {
                currentFormVal.Y2 = {};
              }
              currentFormVal.Y2.stew_or_dues = currentFormVal.Y1.stew_or_dues;
              currentFormVal.Y2.how_counted = currentFormVal.Y1.how_counted;
            }
            if (previousFormVal.Y2013) {
              if (!currentFormVal.Y0) {
                currentFormVal.Y0 = {};
              }
              copyPropertiesIfPresent(previousFormVal.Y2013, currentFormVal.Y0,
                shared.STEWARDSHIP_FIELDS_PER_YEAR);
            }
            return currentFormVal;
          }, function(error, wasCommitted, finalSnapshot) {
            if (error || !wasCommitted || transactionMessage) {
              console.log("Failed to copy data for parish", parishId, transactionMessage, error, 
                  wasCommitted);
            } else {
              console.log("Copied data for parish", parishId);
            }
          }, false);
        } else {
          console.log("no previous form data", parishId);
        }
      }, function(error) {
        console.log("Couldn't read prior year's data for parish", parishId, error);
      });
    });
  };
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  shared.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});
