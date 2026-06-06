/**
 * fixServices.gs — Service Name Normalization Script
 * =====================================================
 * HOW IT WORKS:
 *   1. Reads all raw job names from Provider_Master (job_1, job_2, job_3 columns)
 *   2. Skips any that already have a mapping in Provider_Service_Map
 *   3. For each unmapped raw name, uses keyword rules to find a canonical service name
 *   4. Adds new rows to Provider_Service_Map so doGet.gs normalizes them automatically
 *   5. Logs unmatched names for manual review (you fix those directly in the sheet)
 *
 * HOW TO USE:
 *   1. Paste this into Apps Script editor
 *   2. Run  fixServices()
 *   3. View → Logs to see what was mapped and what needs manual review
 *   4. Manually fix the unmatched rows in Provider_Service_Map sheet
 *   5. Redeploy doGet.gs as a NEW deployment after done
 *
 * NOTE: This only adds to Provider_Service_Map. It never edits Provider_Master
 *       or Service_Master, so no provider links are broken.
 */

// ─────────────────────────────────────────────────────────────────
// SERVICE NORMALIZATION MAP
// Key   = canonical (clean) service name
// Value = array of raw name fragments to match (case-insensitive)
// ─────────────────────────────────────────────────────────────────
var SERVICE_MAP = {
  // Electrical
  'Electrician'         : ['electric', 'electrician', 'wiring', 'mseb', 'bijli', 'light fitting', 'switchboard'],

  // Plumbing
  'Plumber'             : ['plumb', 'plumber', 'pipe', 'water tank', 'sanitary', 'drainage', 'nali'],

  // Carpentry
  'Carpenter'           : ['carpent', 'wood work', 'woodwork', 'furniture', 'door repair', 'window repair', 'sofa repair'],

  // AC & Cooling
  'AC Repair'           : ['ac service', 'ac repair', 'ac ,', 'ac,', 'freeze', 'a.c.', 'air condition', 'cooler repair', 'refrigerat'],

  // Painting
  'Painter'             : ['paint', 'colour', 'color', 'distemper', 'wall paint'],

  // Two Wheeler
  'Two Wheeler Repair'  : ['two wheeler', '2 wheeler', 'bike repair', 'bike service', 'motorcycle', 'scooter'],

  // Four Wheeler / Auto
  'Car Repair'          : ['car repair', 'car service', 'four wheeler', '4 wheeler', 'automobile service', 'vehicle service'],

  // Auto Rickshaw
  'Auto Rickshaw'       : ['auto rickshaw', 'auto driver', 'rickshaw', 'auto service'],

  // Taxi / Car Hire
  'Taxi Service'        : ['taxi', 'cab', 'car hire', 'city taxi', 'travel service'],

  // Construction
  'Construction'        : ['construction', 'building', 'bandhkam', 'contractor', 'civil work', 'masonry', 'mason', 'rangkam'],

  // Fabrication & Welding
  'Fabrication'         : ['fabricat', 'welding', 'iron work', 'grill', 'window grill'],

  // Computer / IT
  'Computer Repair'     : ['computer', 'laptop', 'printer', 'it service', 'software', 'hardware', 'cctv instal'],

  // CCTV / Security
  'CCTV Installation'   : ['cctv', 'camera instal', 'security camera'],

  // Mobile Repair
  'Mobile Repair'       : ['mobile repair', 'phone repair', 'smartphone repair'],

  // DTH / Cable
  'DTH & Cable Service' : ['dth', 'dish tv', 'tata sky', 'airtel dth', 'cable tv', 'set top'],

  // Aluminium Work
  'Aluminium Work'      : ['aluminium', 'aluminum', 'upvc'],

  // Milk Delivery
  'Milk Delivery'       : ['milk', 'dairy', 'dudh'],

  // Laundry / Dry Cleaning
  'Laundry'             : ['laundry', 'dry clean', 'cloth wash', 'cloth dry', 'curtain wash', 'dhobi', 'ironing'],

  // Tailoring
  'Tailoring'           : ['tailor', 'cloth alter', 'stitching', 'blouse', 'dress alter', 'silai'],

  // Salon / Grooming
  'Salon'               : ['salon', 'hair cut', 'haircut', 'barber', 'beauty parlour', 'parlour'],

  // Catering / Events
  'Catering'            : ['cater', 'food supply', 'tiffin', 'mess service', 'jewan'],

  // Event Management
  'Event Management'    : ['event', 'decoration', 'balloon', 'mandap', 'wedding planner', 'party organiz'],

  // Pest Control
  'Pest Control'        : ['pest control', 'pest cant', 'termite', 'cockroach', 'rat control', 'fumigat'],

  // Cleaning Services
  'Cleaning Service'    : ['cleaning', 'housekeeping', 'sweeping', 'floor clean'],

  // Flex Board / Printing
  'Flex Board & Printing': ['flex board', 'flex print', 'banner', 'hoarding', 'signage', 'sign board', 'printing'],

  // Agriculture / Irrigation
  'Agriculture Service' : ['agro', 'irrigation', 'drip', 'krishi', 'farm', 'tree cut', 'tree trim', 'digging'],

  // Home Repair (general)
  'Home Repair'         : ['home repair', 'all home', 'all work', 'general repair', 'maintenance'],

  // Appliance Repair
  'Appliance Repair'    : ['washing machine', 'washing mac', 'microwave', 'oven repair', 'ovenrepair', 'geyser', 'fridge', 'dish washer', 'dishwasher'],

  // Grocery / Retail
  'Grocery & Retail'    : ['grocery', 'kirana', 'dryfruit', 'dry fruit', 'wholesale', 'retail'],

  // Tractor / Heavy Vehicle
  'Heavy Vehicle Repair': ['tractor', 'truck', 'jcb', 'heavy vehicle'],

  // Tourism
  'Tourism'             : ['tourism', 'travel agent', 'tour'],

  // Electronics Repair (TV, Fan, etc.)
  'Electronics Repair'  : ['tv repair', 'television', 'fan repair', 'repairing of tv', 'repairing of fan', 'led repair', 'lcd repair'],

  // Gas Appliance Repair
  'Gas Appliance Repair': ['gas burner', 'gas stove', 'cooker repair', 'gas repair', 'lpg'],

  // Furniture & Upholstery
  'Furniture & Upholstery': ['sofa', 'cushion', 'mattress', 'upholstery', 'rexine'],

  // Solar & Chimney
  'Solar & Kitchen Services': ['solar', 'chimney', 'kitchen chimney', 'solar panel'],
};

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
function fixServices() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var pmSheet  = ss.getSheetByName('Provider_Master');
  var psmSheet = ss.getSheetByName('Provider_Service_Map');

  if (!pmSheet)  { Logger.log('ERROR: Provider_Master sheet not found.');      return; }
  if (!psmSheet) { Logger.log('ERROR: Provider_Service_Map sheet not found.'); return; }

  // ── Read all raw job names from Provider_Master ──────────────
  var pmData    = pmSheet.getDataRange().getValues();
  var pmHeaders = pmData[0].map(function(h) { return h.toString().trim().toLowerCase(); });

  var job1Col = pmHeaders.indexOf('job_1');
  var job2Col = pmHeaders.indexOf('job_2');
  var job3Col = pmHeaders.indexOf('job_3');

  if (job1Col === -1) { Logger.log('ERROR: job_1 column not found in Provider_Master'); return; }

  var rawNamesSet = {};
  for (var i = 1; i < pmData.length; i++) {
    [job1Col, job2Col, job3Col].forEach(function(col) {
      if (col === -1) return;
      var val = (pmData[i][col] || '').toString().trim();
      if (val) rawNamesSet[val] = true;
    });
  }
  var allRawNames = Object.keys(rawNamesSet);
  Logger.log('Total distinct raw job names found: ' + allRawNames.length);

  // ── Read existing mappings in Provider_Service_Map ───────────
  var psmData    = psmSheet.getDataRange().getValues();
  var psmHeaders = psmData[0].map(function(h) { return h.toString().trim().toLowerCase(); });

  var rawCol      = psmHeaders.indexOf('raw_service');
  var standardCol = psmHeaders.indexOf('standard_service');
  var catCol      = psmHeaders.indexOf('category_name');

  if (rawCol === -1 || standardCol === -1) {
    Logger.log('ERROR: Provider_Service_Map must have "raw_service" and "standard_service" columns');
    return;
  }

  var alreadyMapped = {};
  for (var i = 1; i < psmData.length; i++) {
    var raw = (psmData[i][rawCol] || '').toString().trim().toLowerCase();
    if (raw) alreadyMapped[raw] = true;
  }

  // ── Map unmapped raw names ────────────────────────────────────
  var newRows  = [];
  var unmatched = [];

  allRawNames.forEach(function(rawName) {
    if (alreadyMapped[rawName.toLowerCase()]) return; // already mapped

    var canonical = detectCanonical(rawName);
    if (canonical) {
      var row = [];
      // Fill columns up to standardCol and rawCol
      var maxCol = Math.max(rawCol, standardCol, catCol >= 0 ? catCol : 0);
      for (var c = 0; c <= maxCol; c++) row.push('');

      row[rawCol]      = rawName;
      row[standardCol] = canonical.name;
      if (catCol >= 0) row[catCol] = canonical.category;

      newRows.push(row);
      Logger.log('✓ "' + rawName + '" → "' + canonical.name + '" (' + canonical.category + ')');
    } else {
      unmatched.push(rawName);
    }
  });

  // ── Write new rows to Provider_Service_Map ───────────────────
  if (newRows.length > 0) {
    var lastRow = psmSheet.getLastRow();
    psmSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  Logger.log('');
  Logger.log('=== fixServices complete ===');
  Logger.log('New mappings added: ' + newRows.length);
  Logger.log('Needs manual review (' + unmatched.length + '):');
  unmatched.forEach(function(n) { Logger.log('  "' + n + '"'); });
  Logger.log('============================');
  Logger.log('');
  Logger.log('For unmatched names above:');
  Logger.log('  Open Provider_Service_Map sheet and manually add a row:');
  Logger.log('  | raw_service = <name above> | standard_service = <clean name> | category_name = <category> |');
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function detectCanonical(rawName) {
  var lower = rawName.toLowerCase();

  var canonicalNames = Object.keys(SERVICE_MAP);
  for (var k = 0; k < canonicalNames.length; k++) {
    var canonical = canonicalNames[k];
    var keywords  = SERVICE_MAP[canonical];
    for (var j = 0; j < keywords.length; j++) {
      if (lower.indexOf(keywords[j].toLowerCase()) !== -1) {
        return { name: canonical, category: guessCategory(canonical) };
      }
    }
  }
  return null;
}

function guessCategory(canonicalName) {
  var c = canonicalName.toLowerCase();
  if (c.match(/electric|plumb|ac repair|appliance|carpenter|paint|home repair|cleaning|pest|aluminium/))
    return 'Home Services';
  if (c.match(/construction|fabricat|masonry/))
    return 'Construction & Home Improvement';
  if (c.match(/car|bike|two wheel|auto rickshaw|taxi|heavy vehicle/))
    return 'Automobile';
  if (c.match(/cctv|computer|mobile|dth/))
    return 'Professional Services';
  if (c.match(/salon|laundry|tailor/))
    return 'Personal Care';
  if (c.match(/catering|event|tourism/))
    return 'Events & Hospitality';
  if (c.match(/grocery|retail|dryfruit/))
    return 'Retail & Shops';
  if (c.match(/milk/))
    return 'Home Services';
  if (c.match(/agri|irrigation/))
    return 'Agriculture';
  if (c.match(/electronic|tv|fan repair|gas appliance/))
    return 'Home Services';
  if (c.match(/furniture|upholstery/))
    return 'Home Services';
  if (c.match(/solar|chimney/))
    return 'Home Services';
  return 'Other';
}
