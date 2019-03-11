// This file is for base JavaScript functions that don't need to change across versions for different years.
var base = {};

// Left unspecified in master branch so that it must be specified in the
// deployment branch.
base.firebaseConfig = {
  apiKey: "AIzaSyDneNgUkYqKBo0zuzqqket6tx705_O08Ug",
  authDomain: "easy-nmc-dev.firebaseapp.com",
  databaseURL: "https://easy-nmc-dev.firebaseio.com",
  projectId: "easy-nmc-dev",
  storageBucket: "easy-nmc-dev.appspot.com",
  messagingSenderId: "27452413795"
};
base.firebaseBackend = base.firebaseConfig.databaseURL;

// Returns the root database reference, initializing the firebase app if that hasn't been
// done yet.
base.getRootRef = function() {
  if (!firebase.apps.length) {
    firebase.initializeApp(base.firebaseConfig);
  }
  return firebase.database().ref();
};

// Adapted from http://stackoverflow.com/a/2880929 by Andy E.
base.getQueryParams = function(search) {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  var queryParams = {};
  while (match = search.exec(query))
     queryParams[decode(match[1])] = decode(match[2]);
  return queryParams;
};

base.initGoogleApi = function (scopes, discoveryUrl, callback) {
  var CLIENT_ID = '540806466980-i5mifkaf6utq2g8k3p3opbj6gd4jv9oj.apps.googleusercontent.com';
  gapi.auth.authorize(
      {'client_id': CLIENT_ID, 'scope': scopes},
      function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
          // We're authorized, now load the API.
          gapi.client.load(discoveryUrl).then(callback);
        } else {
          console.log("Google API authorization failed: ", authResult.error);
        }
      });
}

// Authorizes and loads the Google Drive API, and then executes the specified function.
base.initDriveApi = function (callback) {
  var CLIENT_ID = '540806466980-i5mifkaf6utq2g8k3p3opbj6gd4jv9oj.apps.googleusercontent.com';
  var SCOPES = 'https://www.googleapis.com/auth/drive';
  gapi.auth.authorize(
      {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
      function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
          // We're authorized, now load the Drive API.
          gapi.client.load('drive', 'v2', function() {
            callback();
          });
        } else {
          console.log("Google API authorization failed: ", authResult.error);
        }
      });
};

// Sums the inputs, ignoring any inputs that aren't numbers.
// Returns zero if neither is a number. In addition to using
// this directly, you can use it like
//   [1, 2, 3].reduce(base.sumNumbers)
base.sumNumbers = function(a, b) {
  if (angular.isNumber(a)) {
    if (angular.isNumber(b)) {
      return a + b;
    } else {
      return a;
    }
  } else if (angular.isNumber(b)) {
    return b;
  }
  return 0;
};

// Sums the specified fields of the object.
// The third parameter (fallback) is an optional alternate source
// for fields that are missing in obj.
base.sumFields = function(fields, obj, fallback) {
  var total = 0;
  angular.forEach(fields, function(fieldName) {
    if (obj && angular.isNumber(obj[fieldName])) {
      total += obj[fieldName];
    } else if (fallback && angular.isNumber(fallback[fieldName])) {
      total += fallback[fieldName];
    }
  });
  return total;
}

// Returns the Google auth provider's UID for the given user (prefixed by 
// 'google:' to make it match database's auth rules view of uid), or null
// if the user is not signed-in with Google. The parameter must be a
// firebase.User or null.
function getGoogleUid(user) {
  if (!user) {
    return null;
  }
  for (var i = 0; i < user.providerData.length; i++) {
    var userInfo = user.providerData[i];
    if (userInfo.providerId == 'google.com') {
      // We have to add 'google:' prefix to make it match up with what the
      // database auth rules will see, since we persist this in invite
      // scenario.
      return 'google:' + userInfo.uid;
    }
  }
  return null;
}

function setupSession($scope, ref, user, callback) {
  console.log("setupSession for user.uid=", getGoogleUid(user));
  var url_parser = document.createElement('a');
  url_parser.href = document.URL;
  var pathname = url_parser.pathname;
  // On some browsers the pathname starts with a slash; on others it doesn't.
  if (pathname.charAt(0) === '/') {
    // Drop first slash.
    pathname = pathname.substr(1);
  }
  $scope.patharray = pathname.split('/');
  $scope.metropolis_id = $scope.patharray[1];
  $scope.user = user;  
  var queryParams = base.getQueryParams(url_parser.search);
  if ("invite" in queryParams) {
    var metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
    metroRef.child("committee/" + getGoogleUid(user)).set(queryParams.invite, function(error) {
      if (error) {
        console.log('Failed to store invitation in committee slot: ', error);
      } else {
        console.log('Stored invitation in committee slot: ', queryParams.invite);
        // Also delete the committee-invite to represent that it has been used.
        metroRef.child("committee-invite/" + queryParams.invite).remove();
      }
      callback();
    });
  } else {
    callback();
  }
}

function handleAuthChange($scope, ref, user, callback) {
  var googleUid = getGoogleUid(user);
  if (!googleUid) {
    console.log("No Google UID", user);
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
    return;
  }
  console.log("Got Google UID", googleUid, "for user", user);
  setupSession($scope, ref, user, callback);
}

// Ensures the user is logged in with a Google account, and registers
// the user as a committee member if the query parameters contain an
// invitation. Invitations are represented like 
// "?invite=u23zD4Yv4BnMxaFyNtGEwS8B". Invitations can only be used
// once because this function deletes the invitation after it is
// successfully associated with the authenticated Google account.
//
// Requires that the URL path starts with "/metropolis/$metropolis_id".
// This is needed in order to register the user with the correct committee.
//
// Invokes the callback when complete, and every time the
// auth state changes thereafter. 
//
// Stores some data in $scope prior to invoking the callback:
//   - $scope.user receives the user data (or null if an error occurs).
//   - $scope.error receives the error, if any.
//   - $scope.patharray receives an array containing the elements of
//     the URL path split on slashes. For example, if the path is
//     "/metropolis/SF/review/2016/parish/ascension", the contents of
//     patharray will be:
//         patharray[0] = 'metropolis'
//         patharray[1] = 'SF'
//         patharray[2] = 'review'
//         patharray[3] = '2016'
//         patharray[4] = 'parish'
//         patharray[5] = 'ascension'
//   - $scope.metropolis_id receives patharray[1]
base.handleMetroLogin = function($scope, callback) {
  var ref = base.getRootRef();
  firebase.auth().onAuthStateChanged(function (user) {
    handleAuthChange($scope, ref, user, callback);
  });
};

// A callback-based function to get the current user, signing-in anonymously
// if there is no current user. The current user (firebase.User type) will be passed to the
// successCallback function if successful. Otherwise the errorCallback will be
// invoked with an error message/object. This function is only appropriate for
// parts of the app that should be accessible anonymously, such as the data form.
base.getUser = function(ref, successCallback, errorCallback) {
  var auth = firebase.auth();
  var user = auth.currentUser;
  if (!user) {
    auth.signInAnonymously().then(function (userCred) {
      console.log("Authenticated successfully with provider", userCred.user.providerId, 
          "uid", userCred.user.uid, "user cred", userCred);
      successCallback(userCred.user);
    }).catch(function (error) {
      console.log("Login Failed!", error);
      errorCallback(error);
    });
  } else {
    console.log("Already authenticated with provider", user.providerId, "uid", user.uid,
        "user", user);
    successCallback(user);
  }
}

// Stores a parish access key in the specified user's directory.
//   ref: A Firebase pointing at the root of the tree.
//   accessKey: The key to store.
//   user: The logged-in user's user object.
//   callback: A function taking an error parameter which is called when the
//       operation completes. If the parameter is a non-empty string then
//       the operation failed; otherwise it succeeded.
base.storeAccessKey = function(ref, accessKey, user, callback) {
  var userProfile = ref.child("easy-nmc/user").child(user.uid);
  var keys = userProfile.child("access-key");
  keys.child(accessKey).set(true, function(error) {
    if (error) {
      console.log('Failed to store key in profile: ', error);
    } else {
      console.log('Stored key in profile: ', accessKey);
    }
    callback(error);
  });
};

// Filters for properties that do not have the specified sub-property value.
// From http://stackoverflow.com/a/19850450 (with tweaks).
base.objectByKeyValFilter = function() {
  return function (input, subPropertyName, subPropertyValue) {
    var filteredInput ={};
    angular.forEach(input, function(value, key) {
      if (value === null) {
          return;
      }
      if (value[subPropertyName] !== subPropertyValue) {
        filteredInput[key] = value;
      }
    });
    return filteredInput;
  }
};
