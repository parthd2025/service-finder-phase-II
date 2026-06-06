/**
 * doGet.gs — Service Finder API
 * ==============================
 * Replace the existing Apps Script content with this file after running setup.gs.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * DATA FLOW:
 *   Provider_Master (job_1/2/3 columns)
 *     → normalize via Provider_Service_Map (raw → standard)
 *     → enrich via Service_Master (standard → emoji, category)
 *     → return providers[] with services[] array
 *
 * RESPONSE SHAPE:
 * {
 *   "providers": [
 *     {
 *       "provider_id": "1",
 *       "name": "Vetal",
 *       "phone": "9850108096",
 *       "address": "Gajanan Colony",
 *       "area": "N4 Cidco",
 *       "status": "Active",
 *       "featured": "No",
 *       "services": [
 *         { "service_id": "3", "name": "AC Repair", "category": "Home Services", "emoji": "❄️" }
 *       ]
 *     }
 *   ],
 *   "categories": ["Automobile", "Home Services", ...],
 *   "areas":      ["Garkheda", "N1 Cidco", ...]
 * }
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Build lookup tables
    const categoryMap      = buildCategoryMap(ss);
    const serviceMap       = buildServiceMap(ss, categoryMap);
    const normalizationMap = buildNormalizationMap(ss, serviceMap);
    const providers        = buildProviders(ss, normalizationMap);

    // Collect unique categories and areas from actual data
    const categorySet = new Set();
    const areaSet     = new Set();
    providers.forEach(function(p) {
      p.services.forEach(function(s) { if (s.category) categorySet.add(s.category); });
      if (p.area) areaSet.add(p.area);
    });

    const result = {
      providers:  providers,
      categories: Array.from(categorySet).sort(),
      areas:      Array.from(areaSet).sort()
    };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack || "" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// BUILD CATEGORY MAP
// Returns: { "1" → "Home Services", ... }
// ============================================================
function buildCategoryMap(ss) {
  const sheet = ss.getSheetByName("Category_Master");
  if (!sheet) return {};

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idCol   = indexOfFlexible(headers, "category_id");
  const nameCol = indexOfFlexible(headers, "category_name");
  if (idCol < 0 || nameCol < 0) return {};

  const map = {};
  for (var i = 1; i < data.length; i++) {
    const id   = String(data[i][idCol]   || "").trim();
    const name = String(data[i][nameCol] || "").trim();
    if (id && name) map[id] = name;
  }
  return map;
}

// ============================================================
// BUILD SERVICE MAP
// Returns: { "1" → { service_id, name, category, emoji } }
// and also keyed by normalized name for lookup:
//   { "electrician" → { ... }, "mseb work" → { ... } }
// ============================================================
function buildServiceMap(ss, categoryMap) {
  const sheet = ss.getSheetByName("Service_Master");
  if (!sheet) return {};

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  const idCol      = indexOfFlexible(headers, "service_id");
  const nameCol    = indexOfFlexible(headers, "standard_service");
  const catIdCol   = indexOfFlexible(headers, "category_id");
  const catNameCol = indexOfFlexible(headers, "category_name");
  const emojiCol   = indexOfFlexible(headers, "emoji");

  const map = {};
  for (var i = 1; i < data.length; i++) {
    const id   = String(data[i][idCol]   || "").trim();
    const name = String(data[i][nameCol] || "").trim();
    if (!name) continue;

    var category = "";
    if (catIdCol >= 0) {
      const catId = String(data[i][catIdCol] || "").trim();
      if (catId && categoryMap[catId]) category = categoryMap[catId];
    }
    if (!category && catNameCol >= 0) {
      category = String(data[i][catNameCol] || "").trim();
    }

    const emoji = (emojiCol >= 0) ? String(data[i][emojiCol] || "📋").trim() : "📋";

    const svcObj = { service_id: id, name: name, category: category || "Other", emoji: emoji };

    // Store by ID and by normalized name (for fallback lookup)
    if (id) map["id_" + id] = svcObj;
    map[name.toLowerCase()] = svcObj;
  }
  return map;
}

// ============================================================
// BUILD NORMALIZATION MAP
// Combines Provider_Service_Map (raw → standard) with Service_Master details.
// Returns: { "rawJobNameLower" → { service_id, name, category, emoji } }
// ============================================================
function buildNormalizationMap(ss, serviceMap) {
  // Start with all standard_service names already in serviceMap
  const normMap = Object.assign({}, serviceMap);

  const sheet = ss.getSheetByName("Provider_Service_Map");
  if (!sheet) return normMap;

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  const rawCol      = indexOfFlexible(headers, "raw_service");
  const standardCol = indexOfFlexible(headers, "standard_service");
  const catNameCol  = indexOfFlexible(headers, "category_name");

  if (rawCol < 0) return normMap;

  for (var i = 1; i < data.length; i++) {
    const raw      = String(data[i][rawCol]      || "").trim();
    const standard = standardCol >= 0 ? String(data[i][standardCol] || "").trim() : raw;

    if (!raw) continue;
    const rawKey = raw.toLowerCase();

    // If raw already maps to a known service, skip
    if (normMap[rawKey]) continue;

    // Try to find the standard service in serviceMap
    const standardKey = standard.toLowerCase();
    if (serviceMap[standardKey]) {
      normMap[rawKey] = serviceMap[standardKey];
    } else {
      // standard not in Service_Master — create a basic entry
      const category = catNameCol >= 0 ? String(data[i][catNameCol] || "Other").trim() : "Other";
      normMap[rawKey] = {
        service_id: "",
        name:       standard || raw,
        category:   category,
        emoji:      getEmojiForService(standard || raw)
      };
    }
  }

  return normMap;
}

// ============================================================
// BUILD PROVIDERS ARRAY
// Reads Provider_Master, uses job_1/2/3 columns to build services[]
// ============================================================
function buildProviders(ss, normalizationMap) {
  const sheet = ss.getSheetByName("Provider_Master");
  if (!sheet) throw new Error("Sheet 'Provider_Master' not found.");

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(String);

  function col(name) { return indexOfFlexible(headers, name); }
  function val(row, colName) {
    const idx = col(colName);
    return idx >= 0 ? String(row[idx] || "").trim() : "";
  }

  const providerIdIdx = col("provider_id");
  if (providerIdIdx < 0) {
    throw new Error("Provider_Master is missing 'provider_id'. Run setup.gs first.");
  }

  const providers = [];
  for (var i = 1; i < data.length; i++) {
    const row        = data[i];
    const providerId = String(row[providerIdIdx] || "").trim();
    if (!providerId) continue;

    const name = val(row, "provider_name");
    if (!name) continue;

    // Build services array from job_1, job_2, job_3
    const services = [];
    const seenNames = {};
    ["job_1", "job_2", "job_3"].forEach(function(jobCol) {
      const jobName = val(row, jobCol);
      if (!jobName) return;

      const key = jobName.toLowerCase();
      if (seenNames[key]) return; // deduplicate
      seenNames[key] = true;

      const svc = normalizationMap[key];
      if (svc) {
        services.push(svc);
      } else {
        // Not found in normalization — use raw name with best-guess emoji
        services.push({
          service_id: "",
          name:       jobName,
          category:   "Other",
          emoji:      getEmojiForService(jobName)
        });
      }
    });

    var nameMr = val(row, "name_mr"); // Marathi name from transliterateMr.gs

    providers.push({
      provider_id: providerId,
      name:        name,
      name_mr:     nameMr,
      phone:       val(row, "mobile_1"),
      phone2:      val(row, "mobile_2"),
      address:     val(row, "address"),
      area:        val(row, "area"),
      sub_area:    val(row, "sub_area"),
      status:      val(row, "status")   || "Active",
      featured:    val(row, "featured") || "No",
      reference:   val(row, "reference_source"),
      services:    services
    });
  }

  return providers;
}

// ============================================================
// HELPER: Flexible column index finder
// ============================================================
function indexOfFlexible(headers, targetName) {
  const normalize = function(s) { return String(s).toLowerCase().replace(/[\s_\-\.]+/g, ""); };
  const target = normalize(targetName);
  return headers.findIndex(function(h) { return normalize(h) === target; });
}

// ============================================================
// HELPER: Emoji mapping for service names
// ============================================================
function getEmojiForService(serviceName) {
  const s = (serviceName || "").toLowerCase();
  const mapping = [
    ["2 wheeler", "🛵"], ["bike repair", "🛵"], ["motorcycle", "🛵"],
    ["tyre", "🛞"], ["tire", "🛞"],
    ["ac repair", "❄️"], ["freeze", "❄️"], ["refrigerat", "❄️"],
    ["air condition", "❄️"], ["cooler", "❄️"], ["washing machine", "🫧"],
    ["electrician", "⚡"], ["electric", "⚡"], ["mseb", "⚡"], ["wiring", "⚡"],
    ["plumber", "🔧"], ["plumbing", "🔧"],
    ["carpenter", "🪚"], ["carpentry", "🪚"], ["furniture", "🪑"],
    ["taxi", "🚕"], ["cab", "🚕"], ["driver", "🚗"],
    ["auto rickshaw", "🛺"], ["rickshaw", "🛺"],
    ["milk", "🥛"], ["dairy", "🥛"],
    ["painter", "🎨"], ["painting", "🎨"],
    ["cleaning", "🧹"], ["housekeeping", "🧹"], ["pest", "🪲"],
    ["tiles", "🪟"], ["flooring", "🪟"],
    ["cctv", "📷"], ["camera", "📷"], ["security", "🔒"],
    ["internet", "🌐"], ["network", "🌐"],
    ["computer", "💻"], ["laptop", "💻"],
    ["mobile", "📱"], ["phone repair", "📱"],
    ["welding", "🔩"], ["fabricat", "🔩"], ["aluminium", "🔩"],
    ["gate", "🚪"], ["door", "🚪"],
    ["digging", "⛏️"], ["cutting", "✂️"],
    ["tree", "🌳"], ["garden", "🌳"],
    ["catering", "🍽️"], ["tiffin", "🍱"], ["annapurna", "🍱"],
    ["water", "💧"], ["bore", "💧"], ["pump", "💧"],
    ["doctor", "🏥"], ["medical", "🏥"],
    ["advocate", "⚖️"], ["lawyer", "⚖️"],
    ["dhobi", "👕"], ["laundry", "👕"], ["key", "🔑"],
    ["d2h", "📡"], ["cloth", "🧣"], ["tailor", "🧣"],
    ["construction", "🏗️"], ["civil", "🏗️"], ["mason", "🏗️"],
    ["architect", "📐"], ["interior", "📐"],
    ["auto", "🛺"], ["ac", "❄️"]
  ];
  for (var k = 0; k < mapping.length; k++) {
    if (s.includes(mapping[k][0])) return mapping[k][1];
  }
  return "📋";
}
