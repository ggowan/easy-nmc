var app = angular.module("easyNmcMetroSummary", ["firebase"]);

function exportSpreadsheetHelper($scope, $filter) {
  var reviewDataRef = $scope.metroRef.child("/review-data/" + shared.FOR_YEAR + "/parish");
  reviewDataRef.once("value", function(snap) {
    exportSpreadsheetWithData($scope, $filter, snap.val());
  }, function(error) {
    console.log("loading state failed: ", error);
    $scope.error = error;
  });
}

// Converts the value to a Google Sheets API CellData JSON object
// if it is not an object already.
function cell(value) {
  if (angular.isString(value)) {
    return {
      userEnteredValue: {
        stringValue: value,
      },
    };
  } else if (angular.isNumber(value)) {
    return {
      userEnteredValue: {
        numberValue: value,
      },
    };
  } else if (value == null) {
    return {};
  } else {
    return value;
  };
}

function headerCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  if (!c.userEnteredFormat.horizontalAlignment) {
    c.userEnteredFormat.horizontalAlignment = "CENTER";
  }
  if (!c.userEnteredFormat.textFormat) {
    c.userEnteredFormat.textFormat = {
      bold: true,
    };
  }
  return c;
}

function footerCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.textFormat = {
    bold: true,
  };
  return c;
}

function rightAlignedBoldCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.textFormat = {
    bold: true,
  };
  c.userEnteredFormat.horizontalAlignment = "RIGHT";
  return c;
}

function boldCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.textFormat = {
    bold: true,
  };
  return c;
}

function centeredCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.horizontalAlignment = "CENTER";
  return c;
}

function numberFormatCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.numberFormat = {
    type: "NUMBER",
    pattern: "#,##0",
  };
  return c;
}

function adjustableNumberCell($filter, effectiveNumber, originalNumber) {
  c = numberFormatCell(effectiveNumber != null ? effectiveNumber : "");
  if (effectiveNumber != null && (originalNumber == null || Math.abs(effectiveNumber - originalNumber) > 0.5)) {
    if (originalNumber != null) {
      c.note = "Originally reported as " + $filter('currency')(originalNumber, '$', 0);
    } else {
      c.note = "Blank in original report";
    }
    c.userEnteredFormat.backgroundColor = {
      red: 0xF8 / 255,
      green: 1.0,
      blue: 0x6A / 255,
    };
  }
  return c;
}

function wrappedCell(value) {
  var c = cell(value);
  if (!c.userEnteredFormat) c.userEnteredFormat = {};
  c.userEnteredFormat.wrapStrategy = "WRAP";
  return c;
}

function formulaCell(formula) {
  return numberFormatCell({
    userEnteredValue: {
      formulaValue: formula,
    }
  });
}

// Returns a Google Sheets API RowData JSON object.
// Takes a variable number of arguments, which must be
// CellData objects, strings or numbers.
function row() {
  var v = [];
  for (var i = 0; i < arguments.length; i++) {
    v.push(cell(arguments[i]));
  }
  return {values: v};
}

function headerRow() {
  var v = [];
  for (var i = 0; i < arguments.length; i++) {
    v.push(headerCell(arguments[i]));
  }
  return {values: v};
}

function footerRow() {
  var v = [];
  for (var i = 0; i < arguments.length; i++) {
    v.push(footerCell(arguments[i]));
  }
  return {values: v};
}

function contactRow(contactType, prefix, parishFormData) {
  if (!parishFormData) {
    return row(contactType);
  }
  return row(contactType, parishFormData[prefix + "_name"], "",
    parishFormData[prefix + "_phone"], "", parishFormData[prefix + "_email"]);
}

function dataCell($filter, year, fieldName, parishReviewData, parishFormData) {
  return adjustableNumberCell($filter, 
    shared.getNumericField(year, fieldName, parishReviewData, parishFormData),
    shared.getNumericField(year, fieldName, parishFormData));
}

function dataRow($filter, line, description, fieldName, parishReviewData, parishFormData, expFields, commentField) {
  var explanation = "";
  if (angular.isString(expFields)) {
    expFields = [expFields];
  } else if (!expFields) {
    expFields = [fieldName + "_lines"];
  }
  for (var i = 0; i < expFields.length; i++) {
    if (parishFormData && parishFormData[expFields[i]]) {
      if (explanation) explanation += " ";
      explanation += String(parishFormData[expFields[i]]);
    }
  }
  if (!commentField) {
    commentField = fieldName + "_comment";
  }
  return row(line, description, "",
    dataCell($filter, shared.FOR_YEAR-3, fieldName, parishReviewData, parishFormData),
    dataCell($filter, shared.FOR_YEAR-2, fieldName, parishReviewData, parishFormData),
    wrappedCell(explanation), "",
    wrappedCell(parishReviewData ? parishReviewData[commentField] : ""));
}

function exportSpreadsheetWithData($scope, $filter, reviewData) {
  // We're going to sort the parishes by code.
  var parishesInOrder = [];
  angular.forEach($scope.parishIds, function(parishData, parishId) {
    if (parishData.excused) return;
    parishesInOrder.push({
      id: parishId,
      code: parishData.parish_code,
    });
  });
  parishesInOrder.sort(function (a, b) {
    if (Number(a.code) < Number(b.code)) {
      return -1;
    } else if (Number(b.code) < Number(a.code)) {
      return 1;
    }
    return 0;
  });
  var spreadsheet = {
    properties: {
      title: "Test Spreadsheet",
    }
  };
  var overviewSheet = {
    properties: {
      sheetId: 0,
      title: "Recap Data Allocation",
      gridProperties: {
        frozenRowCount: 3,
        frozenColumnCount: 4,
      },
    },
    data: [
      {
        startRow: 0,
        startColumn: 0,
        rowData: [
          headerRow("", "", "", "", "", "Total Parish", "", "Total Parish", "", "Total", "", "Total Net", "", "", "Average Net"/*, "# Households"*/),
          headerRow("", "", "", "", "", "Income", "", "Expenditures", "", "Deductions", "", "Operating Expense", "", "", "Expenses"/*, "Over"*/),
          headerRow("Sheet", "ID#", "Parish", "City, State", "", shared.FOR_YEAR-3, shared.FOR_YEAR-2,
              shared.FOR_YEAR-3, shared.FOR_YEAR-2, shared.FOR_YEAR-3, shared.FOR_YEAR-2, shared.FOR_YEAR-3, 
              shared.FOR_YEAR-2, "", "for " + String(shared.FOR_YEAR)),
        ],
      },
    ],
    merges: [
      // Merges in header for overview sheet.
      // Income.
      {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 5,
        endColumnIndex: 7,
      },
      {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 5,
        endColumnIndex: 7,
      },
      // Expenses.
      {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 7,
        endColumnIndex: 9,
      },
      {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 7,
        endColumnIndex: 9,
      },
      // Deductions.
      {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 9,
        endColumnIndex: 11,
      },
      {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 9,
        endColumnIndex: 11,
      },
      // Net operating expenses.
      {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 11,
        endColumnIndex: 13,
      },
      {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 11,
        endColumnIndex: 13,
      },
    ],
  };
  var sheets = [overviewSheet];
  for (i = 0; i < parishesInOrder.length; i++) {
    var parishId = parishesInOrder[i].id;
    var parishData = $scope.parishIds[parishId];
    var parishFormData = $scope.formData.parish[parishId];
    var parishReviewData = reviewData[parishId];
    var parishReviewStatus = $scope.reviewStatus.parish[parishId];
    var sheet = {
      properties: {
        sheetId: i + 1,
        title: String(i + 1),
      },
      data: [
        {
          startRow: 0,
          startColumn: 0,
          rowData: [
            headerRow("DATA FOR 2017 ARCHDIOCESE ALLOCATION"),
            headerRow("Metropolis of San Francisco"),
            headerRow(rightAlignedBoldCell("Parish Code"), "", "", "", "", "", "", "", parishData.parish_code),
            row(),
            row(boldCell("Parish"), parishData.name, "", parishData.city, "", parishData.state),
            contactRow(boldCell("Preparer"), "preparer", parishFormData),
            contactRow(boldCell("Treasurer"), "treas", parishFormData),
            contactRow(boldCell("President"), "pres", parishFormData),
            contactRow(boldCell("Priest"), "priest", parishFormData),
            row(boldCell("Reviewer"), parishReviewStatus ? parishReviewStatus.reviewer_name : ""),
            row(),
            headerRow("Line", "Description", "", String(shared.FOR_YEAR-3), String(shared.FOR_YEAR-2),
              "Parish Notes", "", "Reviewer Comments"),
            dataRow($filter, centeredCell("A"), "Gross Income", "income", parishReviewData, parishFormData,
              "income_explanation"),
            dataRow($filter, centeredCell("B"), "Gross Expenses", "expenses", parishReviewData, parishFormData,
              "expense_explanation", "expense_comment"),
            dataRow($filter, centeredCell("C1"), "National Ministries Commitment", "nmc", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C2"), "Capital Improvement", "cap", parishReviewData, parishFormData,
              ["cap_lines", "cap_projects"], "cap_comment"),
            dataRow($filter, centeredCell("C3"), "Mortgage/Construction Loans", "mort", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C4"), "Fundraising Expenses", "fundraising", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C5"), "School Expenses", "school", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C6"), "Charitable Giving", "outreach", parishReviewData, parishFormData),
            row(centeredCell("C"), "Total Deductions", "", formulaCell("=SUM(D15:D20)"), formulaCell("=SUM(E15:E20)")),
            row(centeredCell("B-C"), "Net Expenses", "", formulaCell("=D14-D21"), formulaCell("=E14-E21")),
            /*row(),
            dataRow($filter, "", "Property Insurance", "prop_liab", parishReviewData, parishFormData),
            dataRow($filter, "", "Total Stewardship", "stew_income", parishReviewData, parishFormData),
            dataRow($filter, "", "Number of Members", "num_members", parishReviewData, parishFormData),
            row(),
            row(boldCell("Number of stewards")),
            row("$5,000+", parishFormData ? Number(parishFormData.num_stew_over_5000) : ""),
            row("$3,000-$4,999", parishFormData ? Number(parishFormData.num_stew_3000_4999) : ""),
            row("$2,000-$2,999", parishFormData ? Number(parishFormData.num_stew_2000_2999) : ""),
            row("$1,000-$1,999", parishFormData ? Number(parishFormData.num_stew_1000_1999) : ""),
            row("$800-$999", parishFormData ? Number(parishFormData.num_stew_800_999) : ""),
            row("$500-$799", parishFormData ? Number(parishFormData.num_stew_500_799) : ""),
            row("$300-$499", parishFormData ? Number(parishFormData.num_stew_300_499) : ""),
            row("<$300", parishFormData ? Number(parishFormData.num_stew_under_300) : ""),
            row("300+", formulaCell("=SUM(B39:B45)")),*/
          ],
        },
      ],
      merges: [
        // Header 
        {
          sheetId: i+1,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        // Metropolis
        {
          sheetId: i+1,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        // Parish Code
        {
          sheetId: i+1,
          startRowIndex: 2,
          endRowIndex: 3,
          startColumnIndex: 0,
          endColumnIndex: 8,
        },
        // Parish
        {
          sheetId: i+1,
          startRowIndex: 4,
          endRowIndex: 5,
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        {
          sheetId: i+1,
          startRowIndex: 4,
          endRowIndex: 5,
          startColumnIndex: 3,
          endColumnIndex: 5,
        },
      ],
    };
    for (var j = 0; j < 5; j++) {
      sheet.merges.push([
        // Contact Row
        {
          sheetId: i+1,
          startRowIndex: 5 + j,
          endRowIndex: 6 + j,
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        {
          sheetId: i+1,
          startRowIndex: 5 + j,
          endRowIndex: 6 + j,
          startColumnIndex: 3,
          endColumnIndex: 5,
        },
        {
          sheetId: i+1,
          startRowIndex: 5 + j,
          endRowIndex: 6 + j,
          startColumnIndex: 5,
          endColumnIndex: 7,
        },
      ]);
    }
    for (j = 0; j < 15; j++) {
      sheet.merges.push([
        // Data Row
        {
          sheetId: i+1,
          startRowIndex: 11 + j,
          endRowIndex: 12 + j,
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        {
          sheetId: i+1,
          startRowIndex: 11 + j,
          endRowIndex: 12 + j,
          startColumnIndex: 5,
          endColumnIndex: 7,
        },
        {
          sheetId: i+1,
          startRowIndex: 11 + j,
          endRowIndex: 12 + j,
          startColumnIndex: 7,
          endColumnIndex: 9,
        },
      ]);
    }
    sheets.push(sheet);
    overviewSheet.data[0].rowData.push(
      row(i+1, parishData.parish_code, parishData.name, parishData.city + ", " + parishData.state, "", 
        // Income.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D13\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E13\"))"),
        // Expenses.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D14\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E14\"))"),
        // Deductions.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D21\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E21\"))"),
        // Net operating expenses.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D22\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E22\"))"),
        "",
        // Average net expenses.
        formulaCell("=(L" + String(i+4) + "+M" + String(i+4) + ")/2"),
        // # Stewards >= $300.
        //formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!B47\"))")
        ));
  }
  overviewSheet.data[0].rowData.push(
    footerRow("", "", "", "", "", 
      // Income.
      formulaCell("=SUM(F4:F" + String(parishesInOrder.length + 3) + ")"),
      formulaCell("=SUM(G4:G" + String(parishesInOrder.length + 3) + ")"),
      // Expenses.
      formulaCell("=SUM(H4:H" + String(parishesInOrder.length + 3) + ")"),
      formulaCell("=SUM(I4:I" + String(parishesInOrder.length + 3) + ")"),
      // Deductions.
      formulaCell("=SUM(J4:J" + String(parishesInOrder.length + 3) + ")"),
      formulaCell("=SUM(K4:K" + String(parishesInOrder.length + 3) + ")"),
      // Net operating expenses.
      formulaCell("=SUM(L4:L" + String(parishesInOrder.length + 3) + ")"),
      formulaCell("=SUM(M4:M" + String(parishesInOrder.length + 3) + ")"),
      "",
      // Average net expenses.
      formulaCell("=SUM(O4:O" + String(parishesInOrder.length + 3) + ")")
      ));
  spreadsheet.sheets = sheets;
  gapi.client.sheets.spreadsheets.create(spreadsheet).then(function(response) {
    console.log("response: ", response);
    window.open("https://docs.google.com/spreadsheets/d/" + response.result.spreadsheetId + "/edit");
  }, function(response) {
    console.log("error from create spreadsheet: ", response);
  });
}

function setupScope($scope, $firebaseObject, $filter) {
  var ref = base.getRootRef();
  $scope.FOR_YEAR = shared.FOR_YEAR;
  $scope.metroRef = ref.child("easy-nmc/metropolis/" + $scope.metropolis_id);

  $scope.parishIds = $firebaseObject($scope.metroRef.child("parish-id"));
  $scope.parishIds.$loaded().then(function(data) {
    console.log("parish-id finished loading");
    $scope.parishIdsFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading parish-id failed: ", error);
    $scope.error = error;
  });

  $scope.metaData = $firebaseObject($scope.metroRef.child("meta-data"));
  $scope.metaData.$loaded().then(function(data) {
    console.log("metadata finished loading: ", $scope.metaData);
    $scope.metaDataFinishedLoading = true;
  }).catch(function(error) {
    $scope.error = error;
  });

  $scope.formData = $firebaseObject($scope.metroRef.child("data-form/" + shared.FOR_YEAR));
  $scope.formData.$loaded().then(function(data) {
    console.log("form data finished loading");
    $scope.formDataFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading form data failed: ", error);
    $scope.error = error;
  });

  $scope.reviewStatus = $firebaseObject($scope.metroRef.child("review-status/" + shared.FOR_YEAR));
  $scope.reviewStatus.$loaded().then(function(data) {
    console.log("review data finished loading");
    $scope.reviewStatusFinishedLoading = true;
  }).catch(function(error) {
    console.log("loading review data failed: ", error);
    $scope.error = error;
  });

  $scope.parishApproval = function(parishId) {
    if (!$scope.formData || !$scope.formData.parish) return '';
    var numApprovals = 0;
    var parishData = $scope.formData.parish[parishId];
    if (!parishData) return 'no data';
    var numApprovalFields = shared.APPROVAL_FIELDS.length;
    for (var i = 0; i < numApprovalFields; i++) {
      var fieldName = shared.APPROVAL_FIELDS[i];
      if (parishData[fieldName]) {
        numApprovals++;
      }
    }
    if (numApprovals == shared.APPROVAL_FIELDS.length) {
      return 'full';
    } else if (numApprovals > 0) {
      return 'partial';
    } else {
      return 'none';
    }
  };
  $scope.yearField = function(parishId, year, fieldName) {
    if (!$scope.formData || !$scope.formData.parish) return null;
    var parishData = $scope.formData.parish[parishId];
    if (!parishData) return null;
    var yearData = parishData[shared.yearToYearField(year)];
    if (!yearData) return null;
    return yearData[fieldName];
  };
  $scope.dataEntered = function(parishId) {
    return $scope.yearField(parishId, shared.FOR_YEAR-3, 'expenses') != null &&
        $scope.yearField(parishId, shared.FOR_YEAR-2, 'expenses') != null;
  };
  $scope.refreshDriveData = function() {
    base.initDriveApi(function () {refreshDriveDataHelper($scope);});
  };
  $scope.exportSpreadsheet = function() {
    base.initGoogleApi(
      'https://www.googleapis.com/auth/spreadsheets', 
      'https://sheets.googleapis.com/$discovery/rest?version=v4', 
      function () { exportSpreadsheetHelper($scope, $filter); });
  };
  $scope.saveExtension = function() {
    console.log("saving extension ", $scope.parishIds);
    $scope.parishIds.$save();
  };
  $scope.statusClass = function(status, formEditMode) {
    if (!status) return 'bad';
    if (status === 'finished' && formEditMode != 'locked') return 'bad';
    var result = {
      'started': 'in-progress',
      'waiting': 'requested-info',
      're-review': 'attention',
      'finished': 'good',
    }[status];
    if (!result) return 'bad';
    return result;
  };
  $scope.countParishesByReviewerStatus = function() {
    var result = {};
    angular.forEach($scope.parishIds, function(parishData, parishId) {
      if (parishData.excused || !$scope.reviewStatus.parish) return;
      var parishReviewStatus = $scope.reviewStatus.parish[parishId];
      if (!parishReviewStatus) {
        if (!result['']) result[''] = {};
        if (!result['']['']) result[''][''] = 0;
        result[''][''] += 1;
        return;
      }
      var reviewer = parishReviewStatus.reviewer_name ? parishReviewStatus.reviewer_name : '';
      var status = parishReviewStatus.review_status ? parishReviewStatus.review_status : '';
      if (!result[reviewer]) result[reviewer] = {};
      if (!result[reviewer][status]) result[reviewer][status] = 0;
      result[reviewer][status] += 1;
    });
    return result;
  };
  $scope.$watch('countParishesByReviewerStatus()', function(newCounts, oldCounts) {
    $scope.reviewerStatusCount = newCounts;
    $scope.reviewerCount = {};
    $scope.statusCount = {};
    $scope.numParishes = 0;
    angular.forEach(newCounts, function(counts, reviewer) {
      angular.forEach(counts, function(count, status) {
        if (!$scope.reviewerCount[reviewer]) $scope.reviewerCount[reviewer] = 0;
        $scope.reviewerCount[reviewer] += count;
        if (!$scope.statusCount[status]) $scope.statusCount[status] = 0;
        $scope.statusCount[status] += count;
        $scope.numParishes += count;
      });
    });
  }, true);
}

app.controller("Ctrl", function($scope, $firebaseObject, $filter) {
  base.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject, $filter);
  });
});

app.filter('objectByKeyValFilter', base.objectByKeyValFilter);

app.filter('shortReviewStatus', function() {
  return function(status) {
    if (!status) return '-';
    var result = {
      'started': 'Started',
      'waiting': 'Awaiting Response',
      're-review': 'Needs Re-Review',
      'finished': 'Finished',
    }[status];
    if (!result) return status;
    return result;
  };
});

app.filter('formEditMode', function() {
  return function(formEditMode) {
    if (!formEditMode) return 'Not Locked';
    if (formEditMode === 'locked') return 'Locked';
    return 'UNKNOWN FORM EDIT MODE';
  };
});
