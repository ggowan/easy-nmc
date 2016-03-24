var shared = {};

// Left unspecified in master branch so that it must be specified in the
// deployment branch.
shared.firebaseBackend = "https://intense-heat-7228.firebaseio.com/";

// Data form fields signifying approval.
shared.APPROVAL_FIELDS = [
  'priest_approval_name',
  'pres_approval_name',
  'treas_approval_name',
  'audit_approval_name'
];

shared.TOP_LEVEL_INFO_FIELDS = [
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
];

// Fields for donations to Archdiocese Ministries.
shared.ARCH_MIN_FIELDS = [
  'arch_don',
  'hchc',
  'stbasil',
  'stmichael',
  'stphotios',
  'ionian',
  'standrew',
  'other_arch'
];

// Fields for donations to Assembly of Bishops Authorized Ministries.
shared.AUTH_MIN_FIELDS = [
  'iocc',
  'ocmc',
  'ocf',
  'prison_min',
  'eocs',
  'ocn',
  'ocec',
  'ocampr',
  'ed_comm'
];

// All deduction fields.
shared.DEDUCTION_FIELDS = shared.ARCH_MIN_FIELDS.concat(shared.AUTH_MIN_FIELDS).concat([
  'nmc',
  'metro',
  'patriarch',
  'cap',
  'const_loan',
  'mort',
  'fundraising',
  'school',
  'religious_ed',
  'unusual',
  'moving',
  'outreach',
  'clergy_laity',
  'other_hier'
]);

shared.STEWARDSHIP_FIELDS_PER_YEAR = [
  'stew_or_dues',
  'num_members',
  'how_counted',
  'stew_income',
  'income',
];

// The year we are currently working on allocations for.
shared.FOR_YEAR = 2017;

// Adapted from http://stackoverflow.com/a/2880929 by Andy E.
shared.getQueryParams = function(search) {
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

// Authorizes and loads the Google Drive API, and then executes the specified function.
shared.initDriveApi = function (callback) {
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
          $scope.error = authResult.error;
        }
      });
};

// Sums the inputs, ignoring any inputs that aren't numbers.
// Returns zero if neither is a number. In addition to using
// this directly, you can use it like
//   [1, 2, 3].reduce(shared.sumNumbers)
shared.sumNumbers = function(a, b) {
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
shared.sumFields = function(fields, obj, fallback) {
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

function setupSession($scope, ref, auth, callback) {
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
  $scope.auth = auth;  
  var queryParams = shared.getQueryParams(url_parser.search);
  if ("invite" in queryParams) {
    var metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);
    metroRef.child("committee/" + auth.uid).set(queryParams.invite, function(error) {
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

function handleAuthChange($scope, ref, auth, callback) {
  console.log("handleAuthChange ", auth);
  if (auth && auth.provider !== "google") {
    console.log("Need to logout");
    ref.unauth();
    return;
  }
  if (!auth) {
    console.log("requesting auth redirect");
    ref.authWithOAuthRedirect("google", function(error) {
      if (error) {
        console.log("auth redirect failed: ", error);
        console.log("requesting auth popup");
        ref.authWithOAuthPopup("google", function(error, auth) {
          if (error) {
            console.log("popup failed", error);
            $scope.error = error;
          } else {
            console.log("authentication via popup succeeded ", auth);
          }
        });
      }
    });
    console.log("returning after requesting auth redirect");
    return;
  }
  console.log("Already authenticated: ", auth);
  setupSession($scope, ref, auth, callback);
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
//   - $scope.auth receives the auth data (or null if an error occurs).
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
shared.handleMetroLogin = function($scope, callback) {
  var ref = new Firebase(shared.firebaseBackend);
  ref.onAuth(function (auth) {
    handleAuthChange($scope, ref, auth, callback);
  });  
};


