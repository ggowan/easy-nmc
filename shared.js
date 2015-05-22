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

// The year we are currently working on allocations for.
shared.FOR_YEAR = 2016;

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
// Returns zero if neither is a number.
shared.sumNumbers = function sumNumbers(a, b) {
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
