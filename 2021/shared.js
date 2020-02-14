var shared = {};

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

// All deduction fields.
shared.DEDUCTION_FIELDS = [
  'nmc',
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
  'stew_or_dues',
  'num_members',
  'how_counted',
  'stew_income',
  'income',
];

// The year we are currently working on allocations for.
shared.FOR_YEAR = 2021;

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
      angular.isNumber(primary[yearField][field])) {
    return primary[yearField][field];
  }
  if (fallback && fallback[yearField] && 
      angular.isNumber(fallback[yearField][field])) {
    return fallback[yearField][field];
  }
  return null;
};
