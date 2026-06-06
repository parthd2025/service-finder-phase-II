/**
 * diagnose() — Run this to see all sheet names and column headers.
 * Helps verify the actual structure before running setup().
 */
function diagnose() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  Logger.log("=== SHEET STRUCTURE DIAGNOSIS ===");
  Logger.log("Total sheets: " + sheets.length);

  sheets.forEach(function(sheet) {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(String);
    const rowCount = data.length - 1;

    Logger.log("\n--- " + name + " ---");
    Logger.log("Columns (" + headers.length + "): " + JSON.stringify(headers));
    Logger.log("Data rows: " + rowCount);

    for (var i = 1; i <= Math.min(2, data.length - 1); i++) {
      Logger.log("Row " + i + ": " + JSON.stringify(data[i].map(String)));
    }
  });

  Logger.log("\n=== END DIAGNOSIS ===");
}

/**
 * setup.gs — One-time Migration Script
 * =====================================
 * Paste this entire file into the Google Apps Script editor.
 * Run setup() ONCE to migrate the Google Sheet.
 *
 * PREREQUISITES:
 *   - Master List.xlsx must be imported as a sheet named "Master List"
 *     (with columns: Service Provider Name, Job 1, Job 2, Job 3)
 *
 * WHAT IT DOES:
 *   1. Adds category_id to Category_Master
 *   2. Adds service_id, category_id, emoji to Service_Master
 *   3. Adds provider_id, area, status, featured to Provider_Master
 *   4. Adds job_1, job_2, job_3 to Provider_Master from Master List data
 *
 * AFTER RUNNING:
 *   - Delete this file from the editor
 *   - Paste doGet.gs and deploy as a new web app
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    Logger.log("=== Starting setup migration ===");

    Logger.log("Step 1/4: Category_Master...");
    const categoryIdMap = setupCategoryMaster(ss);
    Logger.log("  Done. Categories: " + Object.keys(categoryIdMap).length);

    Logger.log("Step 2/4: Service_Master...");
    const serviceIdMap = setupServiceMaster(ss, categoryIdMap);
    Logger.log("  Done. Services: " + Object.keys(serviceIdMap).length);

    Logger.log("Step 3/4: Provider_Master (base columns)...");
    setupProviderMaster(ss);
    Logger.log("  Done.");

    Logger.log("Step 4/4: Adding job_1/2/3 to Provider_Master from Master List...");
    const stats = buildProviderJobsFromMasterList(ss);
    Logger.log("  Done. Matched: " + stats.matched + ", No match: " + stats.unmatched);

    Logger.log("=== SETUP COMPLETE ===");
    Logger.log("NEXT STEPS:");
    Logger.log("  1. Fill the 'area' column in Provider_Master for each provider.");
    Logger.log("  2. Delete this setup.gs code from the editor.");
    Logger.log("  3. Paste doGet.gs and deploy as a new web app.");
    Logger.log("  4. Copy the new URL into script.js line 26.");

  } catch (e) {
    Logger.log("=== SETUP FAILED ===");
    Logger.log("Error: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}

// ============================================================
// HELPER: Flexible column finder
// Matches regardless of case, spaces, or underscores.
// e.g. "Service Provider Name", "service_provider_name", "SERVICEPROVIDER" all normalize the same.
// ============================================================
function normalizeHeader(s) {
  return String(s).toLowerCase().replace(/[\s_\-\.]+/g, "");
}

function findCol(headers, targetName) {
  const target = normalizeHeader(targetName);
  return headers.findIndex(function(h) { return normalizeHeader(h) === target; });
}

// ============================================================
// STEP 1: Category_Master — add category_id
// Returns: { "Home Services" → 1, ... }
// ============================================================
function setupCategoryMaster(ss) {
  const sheet = ss.getSheetByName("Category_Master");
  if (!sheet) throw new Error("Sheet 'Category_Master' not found.");

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const nameCol = findCol(headers, "category_name");
  if (nameCol < 0) throw new Error("Category_Master: 'category_name' column not found.");

  const idMap = {};

  if (findCol(headers, "category_id") >= 0) {
    Logger.log("  Category_Master already has category_id.");
    const idCol = findCol(headers, "category_id");
    for (var i = 1; i < data.length; i++) {
      const name = String(data[i][nameCol] || "").trim();
      const id   = data[i][idCol];
      if (name && id !== "" && id !== null) idMap[name] = id;
    }
    return idMap;
  }

  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue("category_id");
  for (var i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, 1).setValue(i);
    const name = String(data[i][nameCol] || "").trim();
    if (name) idMap[name] = i;
  }
  return idMap;
}

// ============================================================
// STEP 2: Service_Master — add service_id, category_id, emoji
// Returns: { "mseb work" → { id, name }, ... }
// ============================================================
function setupServiceMaster(ss, categoryIdMap) {
  const sheet      = ss.getSheetByName("Service_Master");
  if (!sheet) throw new Error("Sheet 'Service_Master' not found.");
  const serviceIdMap = {};

  // Add service_id as first column if missing
  {
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(String);
    if (findCol(headers, "service_id") < 0) {
      sheet.insertColumnBefore(1);
      sheet.getRange(1, 1).setValue("service_id");
      for (var i = 1; i < data.length; i++) sheet.getRange(i + 1, 1).setValue(i);
    }
  }

  // Add category_id column if missing
  {
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(String);
    if (findCol(headers, "category_id") < 0) {
      const catNameCol = findCol(headers, "category_name");
      if (catNameCol < 0) throw new Error("Service_Master: 'category_name' column not found.");
      const insertAt = headers.length + 1;
      sheet.getRange(1, insertAt).setValue("category_id");
      for (var i = 1; i < data.length; i++) {
        const catName = String(data[i][catNameCol] || "").trim();
        sheet.getRange(i + 1, insertAt).setValue(categoryIdMap[catName] || "");
      }
    }
  }

  // Add emoji column if missing
  {
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(String);
    if (findCol(headers, "emoji") < 0) {
      const svcCol   = findCol(headers, "standard_service");
      if (svcCol < 0) throw new Error("Service_Master: 'standard_service' column not found.");
      const insertAt = headers.length + 1;
      sheet.getRange(1, insertAt).setValue("emoji");
      for (var i = 1; i < data.length; i++) {
        const name = String(data[i][svcCol] || "").trim();
        sheet.getRange(i + 1, insertAt).setValue(getEmojiForService(name));
      }
    }
  }

  // Build and return map
  {
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(String);
    const idCol   = findCol(headers, "service_id");
    const svcCol  = findCol(headers, "standard_service");
    for (var i = 1; i < data.length; i++) {
      const id   = data[i][idCol];
      const name = String(data[i][svcCol] || "").trim();
      if (id && name) serviceIdMap[name.toLowerCase()] = { id: id, name: name };
    }
  }

  return serviceIdMap;
}

// ============================================================
// STEP 3: Provider_Master — add provider_id, area, status, featured
// ============================================================
function setupProviderMaster(ss) {
  const sheet = ss.getSheetByName("Provider_Master");
  if (!sheet) throw new Error("Sheet 'Provider_Master' not found.");

  // Add provider_id
  {
    const data = sheet.getDataRange().getValues();
    if (findCol(data[0].map(String), "provider_id") < 0) {
      sheet.insertColumnBefore(1);
      sheet.getRange(1, 1).setValue("provider_id");
      for (var i = 1; i < data.length; i++) sheet.getRange(i + 1, 1).setValue(i);
    }
  }
  // Add area
  {
    const data = sheet.getDataRange().getValues();
    if (findCol(data[0].map(String), "area") < 0) {
      sheet.getRange(1, data[0].length + 1).setValue("area");
    }
  }
  // Add status
  {
    const data = sheet.getDataRange().getValues();
    if (findCol(data[0].map(String), "status") < 0) {
      const insertAt = data[0].length + 1;
      sheet.getRange(1, insertAt).setValue("status");
      for (var i = 1; i < data.length; i++) sheet.getRange(i + 1, insertAt).setValue("Active");
    }
  }
  // Add featured
  {
    const data = sheet.getDataRange().getValues();
    if (findCol(data[0].map(String), "featured") < 0) {
      const insertAt = data[0].length + 1;
      sheet.getRange(1, insertAt).setValue("featured");
      for (var i = 1; i < data.length; i++) sheet.getRange(i + 1, insertAt).setValue("No");
    }
  }
}

// ============================================================
// STEP 4: Add job_1, job_2, job_3 to Provider_Master
//         by matching names from the imported "Master List" sheet
// Returns: { matched, unmatched }
// ============================================================
function buildProviderJobsFromMasterList(ss) {
  // Find the Master List sheet (flexible name matching)
  const allSheets = ss.getSheets();
  let masterSheet = null;
  for (var s = 0; s < allSheets.length; s++) {
    const sheetName = normalizeHeader(allSheets[s].getName());
    if (sheetName === "masterlist" || sheetName === "master list" || sheetName === "masterlists") {
      masterSheet = allSheets[s];
      break;
    }
  }
  if (!masterSheet) throw new Error(
    "Sheet 'Master List' not found. Import Master List.xlsx first (Insert new sheet(s)). " +
    "Available sheets: " + allSheets.map(function(s) { return s.getName(); }).join(", ")
  );

  Logger.log("  Using sheet: " + masterSheet.getName());

  const masterData    = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0].map(String);
  Logger.log("  Master List headers: " + JSON.stringify(masterHeaders));

  const nameCol = findCol(masterHeaders, "Service Provider Name");
  const job1Col = findCol(masterHeaders, "Job 1");
  const job2Col = findCol(masterHeaders, "Job 2");
  const job3Col = findCol(masterHeaders, "Job 3");

  if (nameCol < 0) throw new Error(
    "Master List: 'Service Provider Name' column not found. " +
    "Actual headers: " + JSON.stringify(masterHeaders)
  );

  // Build lookup: normalizedName → { job1, job2, job3 }
  const jobsLookup = {};
  for (var i = 1; i < masterData.length; i++) {
    const name = String(masterData[i][nameCol] || "").trim();
    if (!name) continue;
    const key  = name.toLowerCase().replace(/\s+/g, " ");
    const job1 = job1Col >= 0 ? String(masterData[i][job1Col] || "").trim() : "";
    const job2 = job2Col >= 0 ? String(masterData[i][job2Col] || "").trim() : "";
    const job3 = job3Col >= 0 ? String(masterData[i][job3Col] || "").trim() : "";
    if (job1 || job2 || job3) jobsLookup[key] = { job1: job1, job2: job2, job3: job3 };
  }
  Logger.log("  Job data found for " + Object.keys(jobsLookup).length + " providers in Master List.");

  // Now add job_1, job_2, job_3 columns to Provider_Master
  const pmSheet = ss.getSheetByName("Provider_Master");
  if (!pmSheet) throw new Error("Sheet 'Provider_Master' not found.");

  // Add columns if missing
  {
    const data = pmSheet.getDataRange().getValues();
    if (findCol(data[0].map(String), "job_1") < 0) {
      const at = data[0].length + 1;
      pmSheet.getRange(1, at).setValue("job_1");
      pmSheet.getRange(1, at + 1).setValue("job_2");
      pmSheet.getRange(1, at + 2).setValue("job_3");
    }
  }

  // Fill in job values by matching provider names
  const pmData    = pmSheet.getDataRange().getValues();
  const pmHeaders = pmData[0].map(String);
  const pmNameCol = findCol(pmHeaders, "provider_name");
  const pmJob1Col = findCol(pmHeaders, "job_1");
  const pmJob2Col = findCol(pmHeaders, "job_2");
  const pmJob3Col = findCol(pmHeaders, "job_3");

  if (pmNameCol < 0) throw new Error("Provider_Master: 'provider_name' column not found.");

  let matched   = 0;
  let unmatched = 0;
  const unmatchedNames = [];

  for (var i = 1; i < pmData.length; i++) {
    const name = String(pmData[i][pmNameCol] || "").trim();
    if (!name) continue;
    const key  = name.toLowerCase().replace(/\s+/g, " ");
    const jobs = jobsLookup[key];

    if (jobs) {
      // Only write if the job cells are currently empty
      const currentJob1 = String(pmData[i][pmJob1Col] || "").trim();
      if (!currentJob1) {
        pmSheet.getRange(i + 1, pmJob1Col + 1).setValue(jobs.job1);
        pmSheet.getRange(i + 1, pmJob2Col + 1).setValue(jobs.job2);
        pmSheet.getRange(i + 1, pmJob3Col + 1).setValue(jobs.job3);
      }
      matched++;
    } else {
      unmatched++;
      unmatchedNames.push(name);
    }
  }

  if (unmatchedNames.length > 0) {
    Logger.log("  Unmatched providers (not in Master List): " + JSON.stringify(unmatchedNames.slice(0, 20)));
  }

  return { matched: matched, unmatched: unmatched };
}

// ============================================================
// HELPER: Emoji mapping for service names
// ============================================================
function getEmojiForService(serviceName) {
  const s = (serviceName || "").toLowerCase();

  const mapping = [
    ["2 wheeler", "🛵"], ["bike repair", "🛵"], ["motorcycle", "🛵"], ["scooter", "🛵"],
    ["tyre", "🛞"], ["tire", "🛞"],
    ["ac repair", "❄️"], ["ac washing", "❄️"], ["ac service", "❄️"], ["ac sales", "❄️"],
    ["freeze", "❄️"], ["refrigerat", "❄️"], ["air condition", "❄️"], ["cooler", "❄️"],
    ["washing machine", "🫧"],
    ["electrician", "⚡"], ["electric", "⚡"], ["mseb", "⚡"], ["wiring", "⚡"],
    ["plumber", "🔧"], ["plumbing", "🔧"],
    ["carpenter", "🪚"], ["carpentry", "🪚"],
    ["furniture", "🪑"],
    ["taxi", "🚕"], ["cab", "🚕"], ["travel", "🚕"], ["driver", "🚗"],
    ["auto rickshaw", "🛺"], ["rickshaw", "🛺"],
    ["milk", "🥛"], ["dairy", "🥛"],
    ["painter", "🎨"], ["painting", "🎨"], ["colour", "🎨"], ["color", "🎨"],
    ["cleaning", "🧹"], ["housekeeping", "🧹"],
    ["pest", "🪲"],
    ["tiles", "🪟"], ["flooring", "🪟"],
    ["cctv", "📷"], ["camera", "📷"],
    ["security", "🔒"],
    ["internet", "🌐"], ["network", "🌐"],
    ["computer", "💻"], ["laptop", "💻"],
    ["mobile", "📱"], ["phone repair", "📱"],
    ["welding", "🔩"], ["fabricat", "🔩"], ["aluminium", "🔩"],
    ["gate", "🚪"], ["door", "🚪"],
    ["digging", "⛏️"], ["cutting", "✂️"],
    ["tree", "🌳"], ["garden", "🌳"],
    ["catering", "🍽️"], ["food", "🍽️"],
    ["tiffin", "🍱"], ["annapurna", "🍱"],
    ["water", "💧"], ["bore", "💧"], ["pump", "💧"], ["ro", "💧"],
    ["doctor", "🏥"], ["medical", "🏥"], ["health", "🏥"],
    ["advocate", "⚖️"], ["lawyer", "⚖️"],
    ["dhobi", "👕"], ["laundry", "👕"],
    ["key", "🔑"],
    ["d2h", "📡"], ["dish", "📡"],
    ["cloth", "🧣"], ["tailor", "🧣"],
    ["construction", "🏗️"], ["civil", "🏗️"], ["mason", "🏗️"],
    ["architect", "📐"], ["interior", "📐"],
    ["dharwala", "🏺"],
    ["auto", "🛺"],
    ["ac", "❄️"]
  ];

  for (var k = 0; k < mapping.length; k++) {
    if (s.includes(mapping[k][0])) return mapping[k][1];
  }
  return "📋";
}
