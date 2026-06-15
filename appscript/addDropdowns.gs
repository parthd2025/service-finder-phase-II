/**
 * addDropdowns.gs — Provider_Master Sheet Dropdown Setup
 * ========================================================
 * Run addDropdowns() ONCE to add data-validation dropdowns
 * to the Provider_Master sheet.
 *
 * DROPDOWNS ADDED:
 *   status    → Active | Inactive
 *   featured  → Yes | No
 *   area      → list pulled live from Provider_Master's existing area values
 *               (or edit AREA_LIST below to hardcode your areas)
 *   job_1/2/3 → all standard_service names from Service_Master
 *
 * HOW TO RUN:
 *   1. Open the Google Sheet → Extensions → Apps Script
 *   2. Paste this file's contents
 *   3. Select function addDropdowns → Run
 *   4. Done! Open Provider_Master and check the columns.
 */

// ── Hardcoded area list (edit as needed) ──────────────────────
// If you prefer to pull areas dynamically from the sheet, set this to []
// and the script will collect all existing unique values from the area column.
var AREA_LIST = [
  "N1 Cidco",
  "N2 Cidco",
  "N3 Cidco",
  "N4 Cidco",
  "N5 Cidco",
  "N6 Cidco",
  "N7 Cidco",
  "N8 Cidco",
  "N9 Cidco",
  "Garkheda",
  "Hudco",
  "Bajajnagar",
  "Osmanpura",
  "Padampura",
  "Roshan Gate",
  "Kranti Chowk",
  "Cantonment",
  "Aurangpura",
  "Samarth Nagar",
  "Bharatnagar",
  "Shivajinagar",
  "Mukundwadi",
  "Waluj",
  "Chikalthana",
  "Harsul",
  "Satara"
];

// ──────────────────────────────────────────────────────────────

function addDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log("=== addDropdowns: Starting ===");

  const pmSheet = ss.getSheetByName("Provider_Master");
  if (!pmSheet) {
    Logger.log("ERROR: Sheet 'Provider_Master' not found.");
    return;
  }

  const data    = pmSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const lastRow = data.length; // includes header row

  Logger.log("Provider_Master: " + (lastRow - 1) + " data rows, columns: " + JSON.stringify(headers));

  // ── 1. status dropdown ────────────────────────────────────────
  applyListDropdown(pmSheet, headers, lastRow, "status", ["Active", "Inactive"]);

  // ── 2. featured dropdown ─────────────────────────────────────
  applyListDropdown(pmSheet, headers, lastRow, "featured", ["Yes", "No"]);

  // ── 3. area dropdown ─────────────────────────────────────────
  var areas = AREA_LIST;
  if (!areas || areas.length === 0) {
    // Collect unique non-empty area values already in the sheet
    areas = collectUniqueValues(data, headers, "area");
    Logger.log("  area: collected " + areas.length + " unique values from sheet.");
  }
  if (areas.length > 0) {
    applyListDropdown(pmSheet, headers, lastRow, "area", areas.sort());
  } else {
    Logger.log("  area: no values found — skipping dropdown.");
  }

  // ── 4. job_1 / job_2 / job_3 dropdowns ───────────────────────
  var services = getServiceNames(ss);
  if (services.length === 0) {
    Logger.log("  job dropdowns: Service_Master empty or not found — skipping.");
  } else {
    applyListDropdown(pmSheet, headers, lastRow, "job_1", services);
    applyListDropdown(pmSheet, headers, lastRow, "job_2", services);
    applyListDropdown(pmSheet, headers, lastRow, "job_3", services);
  }

  Logger.log("=== addDropdowns: Done! Open Provider_Master to verify. ===");
}

// ============================================================
// HELPER: Apply a dropdown list to an entire column (data rows only)
// ============================================================
function applyListDropdown(sheet, headers, lastRow, colName, values) {
  const colIdx = findColIdx(headers, colName); // 0-based
  if (colIdx < 0) {
    Logger.log("  SKIP: column '" + colName + "' not found in Provider_Master.");
    return;
  }

  if (lastRow < 2) {
    Logger.log("  SKIP: no data rows for column '" + colName + "'.");
    return;
  }

  // Column number is 1-based; row 2 onwards (skip header row 1)
  const range = sheet.getRange(2, colIdx + 1, lastRow - 1, 1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)   // true = show dropdown arrow
    .setAllowInvalid(false)             // reject values not in list
    .setHelpText("Please select a value from the list.")
    .build();

  range.setDataValidation(rule);
  Logger.log("  OK: '" + colName + "' → dropdown with " + values.length + " options (rows 2–" + lastRow + ")");
}

// ============================================================
// HELPER: Collect unique non-empty string values from a column
// ============================================================
function collectUniqueValues(data, headers, colName) {
  const colIdx = findColIdx(headers, colName);
  if (colIdx < 0) return [];

  const seen = {};
  const result = [];
  for (var i = 1; i < data.length; i++) {
    const val = String(data[i][colIdx] || "").trim();
    if (val && !seen[val]) {
      seen[val] = true;
      result.push(val);
    }
  }
  return result;
}

// ============================================================
// HELPER: Get all standard_service names from Service_Master
// ============================================================
function getServiceNames(ss) {
  const sheet = ss.getSheetByName("Service_Master");
  if (!sheet) return [];

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const colIdx  = findColIdx(headers, "standard_service");
  if (colIdx < 0) return [];

  const names = [];
  const seen  = {};
  for (var i = 1; i < data.length; i++) {
    const name = String(data[i][colIdx] || "").trim();
    if (name && !seen[name]) {
      seen[name] = true;
      names.push(name);
    }
  }
  return names.sort();
}

// ============================================================
// HELPER: Case-insensitive, flexible column index finder (0-based)
// ============================================================
function findColIdx(headers, targetName) {
  const normalize = function(s) {
    return String(s).toLowerCase().replace(/[\s_\-\.]+/g, "");
  };
  const target = normalize(targetName);
  return headers.findIndex(function(h) { return normalize(h) === target; });
}
