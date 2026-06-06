/**
 * geocodeAreas.gs — Auto-fill "area" column using Google Maps Geocoding
 * ======================================================================
 * Uses the FREE built-in Maps service in Google Apps Script.
 * No API key required — works with your Google account quota.
 *
 * FREE QUOTA: ~100 geocoding requests per day (consumer accounts)
 *             ~1000/day (Google Workspace accounts)
 *
 * HOW TO USE:
 *  1. Paste this file into your Apps Script editor.
 *  2. Click Run → geocodeAreas
 *  3. The FIRST time, Google will ask you to authorize Maps service access — allow it.
 *  4. Check View → Logs for progress and results.
 *  5. If you have more than 100 providers without area, run again tomorrow (quota resets daily).
 *  6. After all areas are filled, DELETE this file and redeploy doGet.gs as a NEW deployment.
 *
 * WHAT IT DOES:
 *  - Reads Provider_Master
 *  - Skips rows where "area" is already filled
 *  - Skips rows where "address" is blank
 *  - Geocodes remaining addresses → extracts sublocality / neighbourhood
 *  - Writes the detected area back into the "area" column
 */

// How many providers to process per run (keep ≤ 90 to stay under daily quota)
var BATCH_SIZE = 90;

// Appended to every address to improve geocoding accuracy
var CITY_SUFFIX = ', Chhatrapati Sambhajinagar, Maharashtra, India';

// ─────────────────────────────────────────────────────────────────
function geocodeAreas() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName('Provider_Master');

  if (!sheet) { Logger.log('ERROR: Provider_Master sheet not found.'); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().trim().toLowerCase(); });

  var areaCol    = headers.indexOf('area');
  var addressCol = headers.indexOf('address');
  var nameCol    = headers.indexOf('provider_name');

  if (areaCol    === -1) { Logger.log('ERROR: "area" column not found');    return; }
  if (addressCol === -1) { Logger.log('ERROR: "address" column not found'); return; }

  var geocoder   = Maps.newGeocoder().setRegion('IN').setLanguage('en');
  var processed  = 0;
  var filled     = 0;
  var notFound   = [];

  for (var i = 1; i < data.length; i++) {
    if (processed >= BATCH_SIZE) {
      Logger.log('Batch limit reached (' + BATCH_SIZE + '). Run again tomorrow for remaining rows.');
      break;
    }

    var currentArea = (data[i][areaCol] || '').toString().trim();
    if (currentArea) continue;  // already set — skip

    var address = (data[i][addressCol] || '').toString().trim();
    if (!address) continue;  // no address to geocode — skip

    processed++;

    var detectedArea = geocodeToArea(geocoder, address);

    if (detectedArea) {
      sheet.getRange(i + 1, areaCol + 1).setValue(detectedArea);
      filled++;
      var name = nameCol >= 0 ? data[i][nameCol] : ('row ' + (i + 1));
      Logger.log('✓ ' + name + ' → ' + detectedArea);
    } else {
      var name = nameCol >= 0 ? data[i][nameCol] : ('row ' + (i + 1));
      notFound.push('Row ' + (i + 1) + ' | ' + name + ' | address: ' + address);
    }

    // Pause 300ms between requests to respect rate limits
    Utilities.sleep(300);
  }

  Logger.log('');
  Logger.log('=== geocodeAreas complete ===');
  Logger.log('Geocoded: ' + processed);
  Logger.log('Area filled: ' + filled);
  Logger.log('Could not detect area (' + notFound.length + '):');
  notFound.forEach(function(m) { Logger.log('  ' + m); });
  Logger.log('=============================');
}

// ─────────────────────────────────────────────────────────────────
//  GEOCODING LOGIC
// ─────────────────────────────────────────────────────────────────
function geocodeToArea(geocoder, address) {
  try {
    var result = geocoder.geocode(address + CITY_SUFFIX);

    if (!result || result.status !== 'OK' || !result.results || result.results.length === 0) {
      return null;
    }

    var components = result.results[0].address_components;

    // Priority order for extracting area:
    // 1. sublocality_level_2 (most specific — e.g. "N4")
    // 2. sublocality_level_1 (e.g. "CIDCO")
    // 3. sublocality         (generic)
    // 4. neighborhood        (some areas use this)
    var priority = [
      'sublocality_level_2',
      'sublocality_level_1',
      'sublocality',
      'neighborhood'
    ];

    for (var p = 0; p < priority.length; p++) {
      var val = getComponent(components, priority[p]);
      if (val) return val;
    }

    return null;

  } catch (e) {
    Logger.log('Geocoding error for "' + address + '": ' + e.message);
    return null;
  }
}

function getComponent(components, type) {
  for (var i = 0; i < components.length; i++) {
    if (components[i].types.indexOf(type) !== -1) {
      return components[i].long_name;
    }
  }
  return null;
}
