var app = angular.module("easyNmcMetroSummary", ["firebase"]);

function refreshDriveDataHelper($scope) {
  angular.forEach($scope.parishIds, function(parishData, parishId) {
    var parishDriveFolder = parishData.upload_folder;
    var listParams = {q: "'" + (parishDriveFolder + "' in parents")};
    console.log('listParams: ', listParams);
    var request = gapi.client.drive.files.list(listParams);
    console.log('sending drive request: ', request);
    request.execute(function(resp) {
      console.log('got response for ' + parishId + ': ', resp);
      var driveEmpty = resp.items.length == 0;
      if (parishData.driveEmpty != driveEmpty) {
        console.log("updating driveEmpty for parish " + parishId + " to " + driveEmpty);
        $scope.$apply(function ($scope) {
          parishData.driveEmpty = driveEmpty;
          if (driveEmpty) {
            console.log("applying empty drive changes for " + parishId);
            if (typeof parishData[$scope.FOR_YEAR-3] === "undefined") {
              parishData[$scope.FOR_YEAR-3] = {};
            }
            if (typeof parishData[$scope.FOR_YEAR-2] == "undefined") {
              parishData[$scope.FOR_YEAR-2] = {};
            }
            parishData[$scope.FOR_YEAR-3].have_pl = false;
            parishData[$scope.FOR_YEAR-2].have_pl = false;
            parishData[$scope.FOR_YEAR-3].have_bal = false;
            parishData[$scope.FOR_YEAR-2].have_bal = false;
          }
        });
      }
    });
  });
}

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
  c = numberFormatCell(effectiveNumber || "");
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
          headerRow("", "", "", "", "", "Total Parish", "", "Total Parish", "", "Total", "", "Total Net", "", "", "Average Net"),
          headerRow("", "", "", "", "", "Income", "", "Expenditures", "", "Deductions", "", "Operating Expense", "", "", "Expenses"),
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
            row(),
            headerRow("Line", "Description", "", String(shared.FOR_YEAR-3), String(shared.FOR_YEAR-2),
              "Parish Notes", "", "Reviewer Comments"),
            dataRow($filter, centeredCell("A"), "Gross Income", "income", parishReviewData, parishFormData,
              "income_explanation"),
            dataRow($filter, centeredCell("B"), "Gross Expenses", "expenses", parishReviewData, parishFormData,
              "expense_explanation", "expense_comment"),
            dataRow($filter, centeredCell("C1"), "National Ministries Commitment", "nmc", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C2"), "Donations to Archdiocese", "arch", parishReviewData, parishFormData, 
              "arch_don_lines", "arch_don_comment"),
            dataRow($filter, centeredCell("C3"), "Assembly of Bishops Ministries", "auth_min", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C4"), "Donations to Metropolis", "metro", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C5"), "Donations to Patriarchate", "patriarch", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C6"), "Capital Improvement", "cap", parishReviewData, parishFormData,
              ["cap_lines", "cap_projects"], "cap_comment"),
            dataRow($filter, centeredCell("C7"), "Construction Loan", "const_loan", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C8"), "Mortgage", "mort", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C9"), "Fundraising Expenses", "fundraising", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C10"), "Greek/Day School Expenses", "school", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C11"), "Religious Ed.", "religious_ed", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C12"), "Catastrophic Risk Insurance", "catastrophic", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C13"), "Clergy Moving Expenses", "moving", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C14"), "Outreach and Evangelism", "outreach", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C15"), "Clergy Laity Congress", "clergy_laity", parishReviewData, parishFormData),
            dataRow($filter, centeredCell("C16"), "Other Deductions", "other_hier", parishReviewData, parishFormData,
              ["other_hier_lines", "other_hier_explanation"], "other_hier_comment"),
            row(centeredCell("C"), "Total Deductions", "", formulaCell("=SUM(D14:D29)"), formulaCell("=SUM(E14:E29)")),
            row(centeredCell("B-C"), "Net Expenses", "", formulaCell("=D13-D30"), formulaCell("=E13-E30")),
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
    for (var j = 0; j < 4; j++) {
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
    for (j = 0; j < 21; j++) {
      sheet.merges.push([
        // Data Row
        {
          sheetId: i+1,
          startRowIndex: 10 + j,
          endRowIndex: 11 + j,
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        {
          sheetId: i+1,
          startRowIndex: 10 + j,
          endRowIndex: 11 + j,
          startColumnIndex: 5,
          endColumnIndex: 7,
        },
        {
          sheetId: i+1,
          startRowIndex: 10 + j,
          endRowIndex: 11 + j,
          startColumnIndex: 7,
          endColumnIndex: 9,
        },
      ]);
    }
    sheets.push(sheet);
    overviewSheet.data[0].rowData.push(
      row(i+1, parishData.parish_code, parishData.name, parishData.city + ", " + parishData.state, "", 
        // Income.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D12\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E12\"))"),
        // Expenses.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D13\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E13\"))"),
        // Deductions.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D30\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E30\"))"),
        // Net operating expenses.
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!D31\"))"),
        formulaCell("=INDIRECT(CONCATENATE($A" + String(i+4) + ",\"!E31\"))"),
        "",
        // Average net expenses.
        formulaCell("=(L" + String(i+4) + "+M" + String(i+4) + ")/2")
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
  var ref = new Firebase(shared.firebaseBackend);
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
    shared.initDriveApi(function () {refreshDriveDataHelper($scope);});
  };
  $scope.exportSpreadsheet = function() {
    shared.initGoogleApi(
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
  shared.handleMetroLogin($scope, function() {
    setupScope($scope, $firebaseObject, $filter);
  });
});

// Filters for properties that do not have the specified sub-property value.
// From http://stackoverflow.com/a/19850450 (with tweaks).
app.filter('objectByKeyValFilter', function () {
  return function (input, subPropertyName, subPropertyValue) {
    var filteredInput ={};
    angular.forEach(input, function(value, key) {
      if (value[subPropertyName] !== subPropertyValue) {
        filteredInput[key] = value;
      }
    });
    return filteredInput;
  }
});

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
