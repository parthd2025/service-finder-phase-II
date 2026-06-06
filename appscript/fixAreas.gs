/**
 * fixAreas.gs — One-time Area Auto-Assignment Script
 * =====================================================
 * 1. Paste this into your Google Apps Script editor (alongside doGet.gs).
 * 2. Run  fixAreas()  once.
 * 3. Check View → Logs for a summary of what was set vs what needs manual review.
 * 4. After confirming the data, DELETE this file from the editor and
 *    redeploy doGet.gs as a NEW deployment.
 *
 * What it does:
 *   – Reads every provider in Provider_Master whose "area" column is blank.
 *   – Scans their "address" field for known locality/colony/sector keywords.
 *   – Writes the matched area name back into the "area" column.
 *   – Logs providers that could NOT be auto-matched (for manual fill-in).
 *
 * Add or edit entries in AREA_KEYWORDS below to improve coverage.
 */

// ─────────────────────────────────────────────────────────────────
//  AREA KEYWORD MAP
//  Key   = canonical area name (must match Area_Master "area" values)
//  Value = array of substrings to look for inside the address
//          (all comparisons are case-insensitive)
// ─────────────────────────────────────────────────────────────────
var AREA_KEYWORDS = {
  // CIDCO nodes
  'N1 Cidco'  : ['n1 cidco', 'n-1 cidco', 'cidco n1', 'n1cidco'],
  'N2 Cidco'  : ['n2 cidco', 'n-2 cidco', 'cidco n2', 'n2cidco'],
  'N3 Cidco'  : ['n3 cidco', 'n-3 cidco', 'cidco n3', 'n3cidco'],
  'N4 Cidco'  : ['n4 cidco', 'n-4 cidco', 'cidco n4', 'n4cidco', 'jay bhavani nagar'],
  'N5 Cidco'  : ['n5 cidco', 'n-5 cidco', 'cidco n5', 'n5cidco'],
  'N6 Cidco'  : ['n6 cidco', 'n-6 cidco', 'cidco n6', 'n6cidco'],
  'N7 Cidco'  : ['n7 cidco', 'n-7 cidco', 'cidco n7', 'n7cidco'],
  'N8 Cidco'  : ['n8 cidco', 'n-8 cidco', 'cidco n8', 'n8cidco'],
  'N9 Cidco'  : ['n9 cidco', 'n-9 cidco', 'cidco n9', 'n9cidco'],
  'N10 Cidco' : ['n10 cidco', 'n-10 cidco', 'cidco n10'],
  'N11 Cidco' : ['n11 cidco', 'n-11 cidco', 'cidco n11'],
  'N12 Hudco' : ['n12 hudco', 'hudco', 'n12cidco', 'n12 cidco'],

  // Old city / Aurangabad core
  'Osmanpura'     : ['osmanpura', 'osman pura'],
  'Garkheda'      : ['garkheda', 'garkheda parisar'],
  'Cidco'         : ['cidco'],           // generic fallback after node-specific
  'Bajaj Nagar'   : ['bajaj nagar', 'bajajnagar'],
  'Roshan Gate'   : ['roshan gate', 'roshangate'],
  'Gulmandi'      : ['gulmandi'],
  'Kranti Chowk'  : ['kranti chowk', 'krantichowk'],
  'Aurangpura'    : ['aurangpura'],
  'Jalna Road'    : ['jalna road', 'jalna rd'],
  'Beed Bypass'   : ['beed bypass', 'beed by pass'],
  'Satara Parisar': ['satara parisar', 'satara'],
  'Pundliknagar'  : ['pundliknagar', 'pundlik nagar'],
  'Mukundwadi'    : ['mukundwadi'],
  'Waluj'         : ['waluj', 'waluj midc', 'waluj naka'],
  'Chikalthana'   : ['chikalthana', 'chikalthan'],
  'Cantonment'    : ['cantonment', 'cantt'],
  'Padegaon'      : ['padegaon'],
  'Harsul'        : ['harsul'],
  'Nirala Bazar'  : ['nirala bazar', 'nirala bazaar'],
  'Samarth Nagar' : ['samarth nagar', 'samathnagar'],
  'Chetak Ghoda'  : ['chetak ghoda', 'chetak'],
  'Jaibhimnagar'  : ['jaibhimnagar', 'jai bhim nagar'],
  'Gajanan Colony': ['gajanan colony'],
  'Vijay Nagar'   : ['vijay nagar', 'vijaynagar'],
  'Tanaji Chowk'  : ['tanaji chowk'],
  'Shivshankar Colony' : ['shivshankar colony'],

  // Added from geocodeAreas unmatched results
  'Sutgirni'          : ['sutgirni', 'kabra nagar'],
  'Aurangpura'        : ['biwi makbara', 'bibi makbara', 'aurangpura'],
  'Baudhh Nagar'      : ['baudhh nagar', 'baudh nagar', 'bodhh nagar'],
  'Pundaliknagar'     : ['pundalik nagar', 'pundaliknagar', 'gajanan nagar'],
  'Uttam Nagar'       : ['uttam nagar', 'uttamnagar'],
  'Jalgaon Road'      : ['jalgaon rd', 'jalgaon road', 'pawan nagar'],
};

// ─────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────
function fixAreas() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var pmSheet = ss.getSheetByName('Provider_Master');

  if (!pmSheet) {
    Logger.log('ERROR: Provider_Master sheet not found.');
    return;
  }

  var data    = pmSheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim().toLowerCase(); });

  var areaCol    = headers.indexOf('area');
  var addressCol = headers.indexOf('address');
  var nameCol    = headers.indexOf('provider_name');

  if (areaCol === -1)    { Logger.log('ERROR: "area" column not found in Provider_Master');    return; }
  if (addressCol === -1) { Logger.log('ERROR: "address" column not found in Provider_Master'); return; }

  var filled  = 0;
  var skipped = 0;  // already had area
  var manual  = []; // could not auto-match

  for (var i = 1; i < data.length; i++) {
    var currentArea = (data[i][areaCol] || '').toString().trim();
    if (currentArea !== '') { skipped++; continue; }  // already set

    var address = (data[i][addressCol] || '').toString().trim();
    if (!address) {
      var name = nameCol >= 0 ? data[i][nameCol] : ('row ' + (i + 1));
      manual.push('Row ' + (i + 1) + ' | ' + name + ' — no address');
      continue;
    }

    var matched = detectArea(address);
    if (matched) {
      pmSheet.getRange(i + 1, areaCol + 1).setValue(matched);
      filled++;
    } else {
      var provName = nameCol >= 0 ? data[i][nameCol] : ('row ' + (i + 1));
      manual.push('Row ' + (i + 1) + ' | ' + provName + ' | address: ' + address);
    }
  }

  Logger.log('=== fixAreas complete ===');
  Logger.log('Already had area (skipped): ' + skipped);
  Logger.log('Auto-filled: ' + filled);
  Logger.log('Needs manual review (' + manual.length + '):');
  manual.forEach(function(m) { Logger.log('  ' + m); });
  Logger.log('========================');

  if (manual.length > 0) {
    Logger.log('\nTIP: Add more keywords to AREA_KEYWORDS in fixAreas.gs for the');
    Logger.log('addresses listed above, then run fixAreas() again.');
  }
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
function detectArea(address) {
  var addr = address.toLowerCase();

  // Iterate in order so more-specific keys (e.g. "N4 Cidco") win over
  // the generic "Cidco" fallback at the bottom of the map.
  var keys = Object.keys(AREA_KEYWORDS);
  for (var k = 0; k < keys.length; k++) {
    var areaName = keys[k];
    var keywords = AREA_KEYWORDS[areaName];
    for (var j = 0; j < keywords.length; j++) {
      if (addr.indexOf(keywords[j].toLowerCase()) !== -1) {
        return areaName;
      }
    }
  }
  return null;
}
