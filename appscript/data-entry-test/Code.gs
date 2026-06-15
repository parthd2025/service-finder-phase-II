/**
 * Code.gs — Standalone Data Entry Form (Test Version)
 * =====================================================
 * Deploy this as a Web App to get a hosted data entry form.
 * Data is written to a single Google Sheet: "Service_Providers"
 *
 * DEPLOY SETTINGS:
 *   Execute as: Me
 *   Who has access: Only myself  ← keeps it private
 *
 * HOW TO SET UP:
 *   1. Open script.google.com → New project
 *   2. Paste this file as "Code.gs"
 *   3. Create a new HTML file named "form" (File → New → HTML file)
 *   4. Paste form.html content into it
 *   5. Deploy → New deployment → Web App
 *   6. Open the URL — form is ready!
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────

var SHEET_NAME = "Service_Providers";

var AREAS = [
  "Garkheda",
  "N1 Cidco", "N2 Cidco", "N3 Cidco", "N4 Cidco", "N5 Cidco",
  "N6 Cidco", "N7 Cidco", "N8 Cidco", "N9 Cidco", "N10 Cidco",
  "N11 Cidco", "N12 Cidco",
  "Harsul", "Satara Parisar", "Bajaj Nagar", "MIDC Waluj",
  "Osmanpura", "Cantonment", "Kranti Chowk", "Jalna Road",
  "Aurangabad Station Area", "Gajanan Colony", "Padampura",
  "Hudco", "Pundaliknagar", "Mukundwadi", "Rohanpur",
  "Other"
];

var SERVICES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "AC Repair",
  "AC Service",
  "Refrigerator Repair",
  "Washing Machine Repair",
  "2 Wheeler Repair",
  "4 Wheeler Repair",
  "Tyre Repair",
  "Taxi / Cab",
  "Auto Rickshaw",
  "Mobile Repair",
  "Computer / Laptop Repair",
  "CCTV Installation",
  "Internet / Network",
  "Welding / Fabrication",
  "Mason / Construction",
  "Pest Control",
  "Cleaning / Housekeeping",
  "Catering / Food",
  "Tiffin Service",
  "Water / RO / Boring",
  "Pump Repair",
  "Milk / Dairy",
  "Dhobi / Laundry",
  "Tailor / Cloth",
  "Key Maker",
  "D2H / Dish Antenna",
  "Garden / Tree Cutting",
  "Doctor / Medical",
  "Advocate / Lawyer",
  "Interior / Architect",
  "Other"
];

// ─── WEB APP ENTRY POINT ──────────────────────────────────────────────────────

function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('form')
    .setTitle('Service Provider — Data Entry')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── CLIENT-CALLABLE FUNCTIONS ────────────────────────────────────────────────

/**
 * Returns dropdown options for the form.
 * Called once on page load via google.script.run.
 */
function getFormOptions() {
  return {
    areas:    AREAS,
    services: SERVICES
  };
}

/**
 * Validates and inserts a new provider row.
 * Called on form submit via google.script.run.
 *
 * @param {Object} data - Form fields from the client
 * @returns {Object} { success: bool, message: string, provider_id: number }
 */
function submitProvider(data) {
  try {
    // ── Server-side validation ──────────────────────────────────────────────
    var errors = [];

    var name = trim(data.provider_name);
    if (!name) errors.push("Provider name is required.");

    var mobile1 = trim(data.mobile_1).replace(/\D/g, "");
    if (!mobile1)            errors.push("Mobile 1 is required.");
    else if (mobile1.length !== 10) errors.push("Mobile 1 must be exactly 10 digits.");

    var mobile2 = trim(data.mobile_2).replace(/\D/g, "");
    if (mobile2 && mobile2.length !== 10) errors.push("Mobile 2 must be exactly 10 digits (or leave blank).");

    var area = trim(data.area);
    if (!area || area === "") errors.push("Area is required.");

    var job1 = trim(data.job_1);
    if (!job1 || job1 === "") errors.push("At least one service (Job 1) is required.");

    if (errors.length > 0) {
      return { success: false, message: errors.join(" ") };
    }

    // ── Duplicate phone check ───────────────────────────────────────────────
    var dupCheck = checkDuplicatePhone(mobile1);
    if (dupCheck.exists) {
      return {
        success: false,
        message: "Mobile number " + mobile1 + " already exists (Provider: " + dupCheck.name + ")."
      };
    }

    // ── Write to sheet ──────────────────────────────────────────────────────
    var sheet      = getOrCreateSheet();
    var providerId = getNextProviderId(sheet);
    var now        = new Date();

    var row = [
      providerId,
      name,
      mobile1,
      mobile2 || "",
      trim(data.address)          || "",
      area,
      trim(data.sub_area)         || "",
      job1,
      trim(data.job_2)            || "",
      trim(data.job_3)            || "",
      trim(data.status)           || "Active",
      trim(data.featured)         || "No",
      trim(data.reference_source) || "",
      now
    ];

    sheet.appendRow(row);

    // Auto-format the new row
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 14).setNumberFormat("dd/mm/yyyy hh:mm");

    return {
      success:     true,
      message:     "Provider \"" + name + "\" added successfully! (ID: " + providerId + ")",
      provider_id: providerId
    };

  } catch (err) {
    return { success: false, message: "Server error: " + err.message };
  }
}

/**
 * Checks if a mobile number already exists in the sheet.
 * @returns {Object} { exists: bool, name: string }
 */
function checkDuplicatePhone(phone) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { exists: false };

  var data = sheet.getDataRange().getValues();
  // mobile_1 is column index 2 (0-based), provider_name is index 1
  for (var i = 1; i < data.length; i++) {
    var existing = String(data[i][2] || "").replace(/\D/g, "");
    if (existing === phone) {
      return { exists: true, name: String(data[i][1] || "Unknown") };
    }
  }
  return { exists: false };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getOrCreateSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      "provider_id", "provider_name",
      "mobile_1", "mobile_2",
      "address", "area", "sub_area",
      "job_1", "job_2", "job_3",
      "status", "featured",
      "reference_source", "submitted_at"
    ];
    sheet.appendRow(headers);

    // Style the header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#3d0c0c");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);

    // Set column widths
    sheet.setColumnWidth(1, 80);   // provider_id
    sheet.setColumnWidth(2, 180);  // provider_name
    sheet.setColumnWidth(3, 110);  // mobile_1
    sheet.setColumnWidth(4, 110);  // mobile_2
    sheet.setColumnWidth(5, 200);  // address
    sheet.setColumnWidth(6, 120);  // area
    sheet.setColumnWidth(7, 120);  // sub_area
    sheet.setColumnWidth(8, 150);  // job_1
    sheet.setColumnWidth(9, 150);  // job_2
    sheet.setColumnWidth(10, 150); // job_3
    sheet.setColumnWidth(11, 80);  // status
    sheet.setColumnWidth(12, 80);  // featured
    sheet.setColumnWidth(13, 150); // reference_source
    sheet.setColumnWidth(14, 140); // submitted_at
  }

  return sheet;
}

function getNextProviderId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1; // only header row exists

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var maxId = 0;
  data.forEach(function(row) {
    var id = parseInt(row[0], 10);
    if (!isNaN(id) && id > maxId) maxId = id;
  });
  return maxId + 1;
}

function trim(val) {
  return String(val || "").trim();
}
