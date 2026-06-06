/**
 * fixCategories.gs — One-time Category Correction Script
 * ========================================================
 * Paste this into Apps Script editor and run fixCategories().
 * It reads Service_Master, finds rows where category_name is "Other"
 * or blank, and reassigns them using keyword matching.
 *
 * AFTER RUNNING:
 *   1. Check the log (View → Logs) to see what changed.
 *   2. Open Service_Master in the sheet and review flagged rows.
 *   3. Delete this script from the editor.
 *   4. Redeploy doGet.gs as a NEW deployment (so the cache clears).
 */
function fixCategories() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Service_Master");

  if (!sheet) {
    Logger.log("ERROR: Service_Master sheet not found.");
    return;
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  // Find columns (flexible — handles any casing or spacing)
  const normalize = function(s) { return String(s).toLowerCase().replace(/[\s_]+/g, ""); };
  const col = function(name) {
    return headers.findIndex(function(h) { return normalize(h) === normalize(name); });
  };

  const standardSvcCol = col("standard_service");
  const categoryCol    = col("category_name");

  if (standardSvcCol < 0) { Logger.log("ERROR: 'standard_service' column not found."); return; }
  if (categoryCol < 0)    { Logger.log("ERROR: 'category_name' column not found."); return; }

  Logger.log("=== Starting category fix ===");
  Logger.log("Total service rows: " + (data.length - 1));

  var changed   = 0;
  var unchanged = 0;
  var skipped   = 0;
  var flagged   = []; // services that couldn't be auto-categorized

  for (var i = 1; i < data.length; i++) {
    const serviceName   = String(data[i][standardSvcCol] || "").trim();
    const currentCategory = String(data[i][categoryCol]  || "").trim();

    if (!serviceName) { skipped++; continue; }

    // Only touch rows that are "Other" or blank
    if (currentCategory !== "Other" && currentCategory !== "") {
      unchanged++;
      continue;
    }

    const newCategory = detectCategory(serviceName);

    if (newCategory === "Other") {
      flagged.push(serviceName);
    } else {
      // Write new category to sheet
      sheet.getRange(i + 1, categoryCol + 1).setValue(newCategory);
      Logger.log("  CHANGED: '" + serviceName + "' → " + newCategory);
      changed++;
    }
  }

  Logger.log("\n=== RESULTS ===");
  Logger.log("Changed:   " + changed);
  Logger.log("Unchanged (already categorized): " + unchanged);
  Logger.log("Skipped (blank rows): " + skipped);
  Logger.log("Still 'Other' (needs manual review): " + flagged.length);

  if (flagged.length > 0) {
    Logger.log("\n--- Needs manual review in sheet ---");
    flagged.forEach(function(name) { Logger.log("  • " + name); });
  }

  Logger.log("\n=== DONE ===");
  Logger.log("Redeploy doGet.gs as a NEW deployment after reviewing.");
}

/**
 * Detects the best category for a service name using keyword matching.
 * Returns the matched category, or "Other" if no match found.
 */
function detectCategory(serviceName) {
  const s = (serviceName || "").toLowerCase();

  // ── Home Services ──────────────────────────────────────────────────────────
  // Electricians, plumbers, AC, appliance repair, cleaning, pest, milk, water
  if (matches(s, [
    "electric", "mseb", "wiring",
    "plumb",
    "ac", "air condition", "freeze", "refriger", "cooler", "washing machine",
    "cctv", "camera", "security system",
    "cleaning", "housekeeping",
    "pest",
    "milk", "dairy",
    "water filter", "ro ", "ro-", "water purif",
    "d2h", "dish tv", "tata sky",
    "gas", "lpg",
    "pump repair", "motor repair",
    "inverter", "solar",
    "painting", "colour", "color",
    "gardening", "tree cutting", "tree trimming",
    "bore well", "borewell",
    "handyman"
  ])) return "Home Services";

  // ── Construction & Home Improvement ────────────────────────────────────────
  // Civil, tiles, carpentry, fabrication, interior, renovation
  if (matches(s, [
    "civil", "construction", "mason", "masonry",
    "tiles", "tile", "flooring", "marble",
    "carpenter", "carpent", "furniture",
    "welding", "fabricat",
    "aluminium", "aluminum",
    "gate", "grill", "railing",
    "door", "window",
    "plaster", "cement",
    "painting house", "paint",
    "architect", "interior", "decorator",
    "renovation", "repair home",
    "waterproof",
    "digging", "excavat",
    "false ceiling", "pop",
    "glass work",
    "kitchen",
    "ro installation"
  ])) return "Construction & Home Improvement";

  // ── Automobile ─────────────────────────────────────────────────────────────
  // Vehicles, repair, taxi, auto, bikes
  if (matches(s, [
    "taxi", "cab", "car rent",
    "auto rickshaw", "rickshaw", "auto",
    "2 wheeler", "bike", "motorcycle", "scooter",
    "tyre", "tire",
    "puncture",
    "vehicle", "car repair", "car service",
    "driving", "driver",
    "transport",
    "petrol",
    "mechanic"
  ])) return "Automobile";

  // ── Health & Medical ────────────────────────────────────────────────────────
  if (matches(s, [
    "doctor", "physician",
    "clinic", "hospital",
    "dentist", "dental",
    "physiother",
    "nurse", "nursing",
    "medical", "medicine",
    "ayurved",
    "homeopath",
    "pathology", "lab test",
    "ambulance"
  ])) return "Health & Medical";

  // ── Professional Services ───────────────────────────────────────────────────
  if (matches(s, [
    "advocate", "lawyer", "legal",
    "ca ", "chartered accountant", "accountant",
    "notary",
    "agent",
    "insurance",
    "property", "real estate",
    "consultant",
    "duplicate key", "key maker",
    "courier",
    "printing", "xerox", "lamination",
    "photography", "photo",
    "it service", "computer repair", "laptop repair",
    "mobile repair", "phone repair",
    "internet", "broadband", "wifi"
  ])) return "Professional Services";

  // ── Events & Hospitality ───────────────────────────────────────────────────
  if (matches(s, [
    "caterer", "catering",
    "tiffin",
    "annapurna",
    "event", "decoration",
    "wedding", "marriage",
    "tent",
    "DJ", "sound",
    "photographer event",
    "hotel", "lodge",
    "restaurant",
    "food delivery",
    "cook", "cooking"
  ])) return "Events & Hospitality";

  // ── Retail & Shops ─────────────────────────────────────────────────────────
  if (matches(s, [
    "cloth", "garment", "textile",
    "tailor", "stitching",
    "hardware", "tools",
    "grocery", "kirana",
    "book", "stationery",
    "mobile shop", "electronics shop",
    "shoe", "footwear",
    "jewel",
    "pharmacy", "medical shop",
    "spare part"
  ])) return "Retail & Shops";

  // ── Personal Care ───────────────────────────────────────────────────────────
  if (matches(s, [
    "salon", "saloon", "parlour", "parlor",
    "barber", "hair",
    "beauty",
    "spa", "massage",
    "dhobi", "laundry", "dry clean",
    "tailor"
  ])) return "Personal Care";

  return "Other";
}

/**
 * Returns true if the text includes ANY of the given keywords.
 */
function matches(text, keywords) {
  for (var k = 0; k < keywords.length; k++) {
    if (text.includes(keywords[k].toLowerCase())) return true;
  }
  return false;
}
