var shared = {};

// Left unspecified in master branch so that it must be specified in the
// deployment branch.
shared.firebaseBackend = "https://easy-nmc-dev.firebaseio.com/";

// Adapted from http://stackoverflow.com/a/2880929 by Andy E.
function getQueryParams(search) {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  var queryParams = {};
  while (match = search.exec(query))
     queryParams[decode(match[1])] = decode(match[2]);
  return queryParams;
}

