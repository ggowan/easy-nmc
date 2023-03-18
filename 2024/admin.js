var app = angular.module("easyNmcMetro", ["firebase"]);

function generateKey() {
  var possibleCharacters = "abcdefghjkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
  var key = "";
  for (var i = 0; i < 8; i++) {
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
  base.initDriveApi(function() {createFoldersAuthorized($scope);});
}

// Copies a single property from the formSource to the dest object. If reviewSource is provided,
// it will override formSource if it contains a number. sourceName is the name of the property
// to copy in the sources. destName is the name of the property to copy to on the dest object.
// If destName is not provided, it defaults to the same as sourceName.
function copyPropertyIfPresent(formSource, reviewSource, dest, sourceName, destName) {
  if (!destName) {
    destName = sourceName;
  }
  if (dest.adjusted && dest.original && angular.isNumber(formSource[sourceName])) {
    dest.adjusted[destName] = dest.original[destName] = formSource[sourceName];
  }
  var prePop;
  if (reviewSource && sourceName in reviewSource && angular.isNumber(reviewSource[sourceName])) {
    // review can override form only when review contains a number.
    if (dest.adjusted) {
      dest.adjusted[destName] = reviewSource[sourceName];
    }
    dest.wasAdjusted = true;
    prePop = reviewSource[sourceName];
  } else if (sourceName in formSource) {
    prePop = formSource[sourceName];
  }
  // Never overwrite an existing value in the form.
  if (dest[destName] == null && prePop != null) {
    dest[destName] = prePop;
  }
}

// Copies specified properties from the formSource to the dest object. If reviewSource is provided,
// it will override formSource if it contains a number (and not just a string, empty or otherwise).
function copyPropertiesIfPresent(formSource, reviewSource, dest, properties) {
  console.log("copying properties", properties, "from form", formSource, "and review", reviewSource, "to dest", dest);
  angular.forEach(properties, function(property) {
    copyPropertyIfPresent(formSource, reviewSource, dest, property);
  });
}

function copyDataIfReady(parishId, parishInfo, previousFormVal, previousReviewVal, currentFormRef) {
  if (!previousFormVal || !previousReviewVal) {
    return;
  }
  console.log("have previous form data", parishId, previousFormVal);
  var transactionMessage = null;
  currentFormRef.transaction(function(currentFormVal) {
    console.log("transaction update function", parishId, currentFormVal);
    if (currentFormVal) {
      console.log("parish", parishId, "already has data", currentFormVal);
    }
    transactionMessage = null;
    var initiallyBlank = false;
    if (!currentFormVal) {
      currentFormVal = {};
      initiallyBlank = true;
    }
    if (initiallyBlank) {
      copyPropertiesIfPresent(previousFormVal, null, currentFormVal, [
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
      ]);
      currentFormVal.priorReview = {};
      copyPropertiesIfPresent(previousReviewVal, null, currentFormVal.priorReview, [
        'income_comment',
        'expense_comment',
        'nmc_comment',
        'benefits_comment',
        'cap_comment',
        'mort_comment',
        'fundraising_comment',
        'school_comment',
        'outreach_comment',
      ]);
    }
    if (!previousFormVal.Y2) {
      // Need this so we can copy from the adjustment if the parish never submitted a report.
      previousFormVal.Y2 = {};
    }
    if (!currentFormVal.Y1) {
      currentFormVal.Y1 = {};
    }
    if (!currentFormVal.Y1.original) {
      currentFormVal.Y1.original = {};
    }
    if (!currentFormVal.Y1.adjusted) {
      currentFormVal.Y1.adjusted = {};
    }
    copyPropertiesIfPresent(previousFormVal.Y2, previousReviewVal.Y2, currentFormVal.Y1, shared.FINANCIAL_FIELDS);
    copyPropertiesIfPresent(previousFormVal.Y2, null,
        currentFormVal.Y1, shared.STEWARDSHIP_FIELDS_PER_YEAR);
    return currentFormVal;
  }, function(error, wasCommitted, finalSnapshot) {
    if (error || !wasCommitted || transactionMessage) {
      console.log("Failed to copy data for parish", parishId, transactionMessage, error, 
          wasCommitted);
    } else {
      console.log("Copied data for parish", parishId);
    }
  }, false);
}

function setupScope($scope, $firebaseObject) {
  var ref = base.getRootRef();
  console.log("in setupScope, ref= ", ref, "; current user= ", firebase.auth().currentUser);
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
        // This if statement can be commented out if we need new keys for all parishes.
        if (!$scope.parishInfos[parishId].access_key) {
          $scope.parishInfos[parishId].access_key = generateKey();
        }
      }
    }
  };
  // Stores the Metropolis names and each parish's name, city and state in a publicly-accessible list
  // used on the landing page.
  $scope.updateLandingPage = function() {
    console.log("updateLandingPage", $scope.parishInfos, Object.keys($scope.parishInfos));
    let obj = {
      name: $scope.metaData['name'],
      parishes: {},
    };
    let parishes = obj['parishes'];
    angular.forEach($scope.parishInfos, function(parishInfo, parishId) {
      if (parishId.charAt(0) === '$' || parishInfo.excused) {
        return;
      }
      console.log("parishId: ", parishId, "parishInfo", parishInfo);
      parishes[parishId] = {
        name: parishInfo.name,
        city: parishInfo.city,
        state: parishInfo.state,
      };
    });
    console.log(obj);
    ref.child("easy-nmc/public/metropolis-summary/" + $scope.metropolis_id).set(obj, function(error) {
      if (error) {
        console.log("Failed to update landing page", error);
      } else {
        console.log("Updated landing page");
      }
    });
  };
  $scope.createFolders = function() { createParishFolders($scope); };
  // Setup synchronization between AngularJS and Firebase using AngularFire.
  $firebaseObject($scope.metroRef.child("parish-id")).$bindTo($scope, "parishInfos").then(function() {
    console.log("parish-id finished loading");
    $scope.parishInfosFinishedLoading = true;
  }, function(error) {
    console.log("parish-id read failed", error);
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
      var previousFormVal = null;
      var previousReviewVal = null;
      var currentFormRef = $scope.metroRef.child("data-form/" + shared.FOR_YEAR + "/parish/" + parishId);
      var previousFormRef = $scope.metroRef.child("data-form/" + (shared.FOR_YEAR - 1) + "/parish/" + parishId);
      previousFormRef.once("value", function(previousFormSnapshot) {
        console.log("data form responded", parishId);
        previousFormVal = previousFormSnapshot.val();
        copyDataIfReady(parishId, parishInfo, previousFormVal, previousReviewVal, currentFormRef);
      }, function(error) {
        console.log("Couldn't read prior year's form for parish", parishId, error);
      });
      var previousReviewRef = $scope.metroRef.child("review-data/" + (shared.FOR_YEAR - 1) + "/parish/" + parishId);
      previousReviewRef.once("value", function(previousReviewSnapshot) {
        console.log("review responded", parishId);
        previousReviewVal = previousReviewSnapshot.val();
        copyDataIfReady(parishId, parishInfo, previousFormVal, previousReviewVal, currentFormRef);
      }, function(error) {
        console.log("Couldn't read prior year's review for parish", parishId, error);
      });
    });
  }
}

app.controller("Ctrl", function($scope, $firebaseObject) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject);
  });
});

app.filter('objectByKeyValFilter', base.objectByKeyValFilter);
