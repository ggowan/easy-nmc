var shared = {};

// Data form fields signifying approval.
shared.APPROVAL_FIELDS = [
  'priest_approval_name',
  'pres_approval_name',
  'treas_approval_name',
  'audit_approval_name'
];

// All deduction fields.
shared.DEDUCTION_FIELDS = [
  'nmc',
  'benefits',
  'cap',
  'mort',
  'fundraising',
  'school',
  'outreach',
];

// All financial report fields.
shared.FINANCIAL_FIELDS = [
  'income',
  'expenses'
].concat(shared.DEDUCTION_FIELDS);

shared.STEWARDSHIP_FIELDS_PER_YEAR = [
  'pledge_units',
  'stew_income',
];

// The year we are currently working on allocations for.
shared.FOR_YEAR = 2024;

// Returns the field name of data for the specified year, i.e.
//   Most recent year being reviewed: Y2
//   Previous year: Y1
//   Year before that: Y0
shared.yearToYearField = function (year) {
  if (year > shared.FOR_YEAR - 2 || year < shared.FOR_YEAR-4) {
    throw "Year " + year + " out of expected range.";
  }
  return 'Y' + (4 + year - shared.FOR_YEAR);
}

shared.getNumericField = function(year, field, primary, fallback) {
  var yearField = shared.yearToYearField(year);
  if (primary && primary[yearField] && 
      angular.isNumber(base.coerceToNumber(primary[yearField][field]))) {
    return base.coerceToNumber(primary[yearField][field]);
  }
  if (fallback && fallback[yearField] && 
      angular.isNumber(base.coerceToNumber(fallback[yearField][field]))) {
    return base.coerceToNumber(fallback[yearField][field]);
  }
  return null;
};
