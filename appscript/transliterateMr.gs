/**
 * transliterateMr.gs — Google Input Tools transliteration (no API key needed)
 * ============================================================================
 * Uses the same engine that powers Google Input Tools / Marathi typing.
 * No registration, no API key, completely free.
 *
 * HOW TO USE:
 *   1. Open Apps Script editor for your spreadsheet
 *   2. Paste this file
 *   3. Run testTransliterate() first to confirm it works
 *   4. Run fillMrNames() to fill the name_mr column for all providers
 *   5. Re-run fillMrNames() any time you add new providers (skips existing rows)
 *
 * AFTER RUNNING:
 *   Redeploy doGet.gs as a new version → update the URL in script.js → push to GitHub
 */


// ============================================================
// TEST: Run this first to verify the API works
// ============================================================
function testTransliterate() {
  var testNames = [
    'Santosh Rathod',
    'Kartik Wankhede',
    'Krushna Furniture',
    'Ajay Chaudhari',
    'Ramesh Shinde',
    'Vithal Barkale'
  ];

  testNames.forEach(function(name) {
    var result = transliterateToMarathi_(name);
    Logger.log(name + '  →  ' + (result || 'FAILED'));
    Utilities.sleep(200);
  });
}


// ============================================================
// MAIN: Fill name_mr for all providers in Provider_Master
// ============================================================
function fillMrNames() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Provider_Master');
  if (!sheet) { Logger.log('ERROR: Provider_Master sheet not found.'); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(String);

  // Find provider_name column (flexible match)
  var nameCol = headers.findIndex(function(h) {
    return h.toLowerCase().replace(/[\s_\-]+/g, '') === 'providername';
  });
  if (nameCol < 0) { Logger.log('ERROR: provider_name column not found.'); return; }

  // Find or create name_mr column
  var nameMrCol = headers.findIndex(function(h) {
    return h.toLowerCase().replace(/[\s_\-]+/g, '') === 'namemr';
  });
  if (nameMrCol < 0) {
    nameMrCol = headers.length;
    sheet.getRange(1, nameMrCol + 1).setValue('name_mr');
    Logger.log('Created name_mr column at position ' + (nameMrCol + 1));
  }

  var processed = 0, skipped = 0, errors = 0;

  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][nameCol] || '').trim();
    if (!name) continue;

    // Skip rows already filled
    var existing = nameMrCol < data[i].length
      ? String(data[i][nameMrCol] || '').trim()
      : '';
    if (existing) { skipped++; continue; }

    var mrName = transliterateToMarathi_(name);
    if (mrName) {
      sheet.getRange(i + 1, nameMrCol + 1).setValue(mrName);
      Logger.log('[' + i + '] ' + name + '  →  ' + mrName);
      processed++;
    } else {
      Logger.log('[' + i + '] ERROR: failed for "' + name + '"');
      errors++;
    }

    Utilities.sleep(200); // be polite to the API
  }

  Logger.log('──────────────────────────────────────');
  Logger.log('Done.  Processed: ' + processed +
             '  |  Skipped (already filled): ' + skipped +
             '  |  Errors: ' + errors);
  Logger.log('Next: redeploy doGet.gs, update the URL in script.js, push to GitHub.');
}


// ============================================================
// English business/service words → Marathi translation
// These are translated (meaning), not transliterated (sound)
// ============================================================
var ENGLISH_WORDS_MR = {
  'furniture'    : 'फर्निचर',
  'electrician'  : 'इलेक्ट्रिशियन',
  'plumber'      : 'प्लंबर',
  'plumbing'     : 'प्लंबिंग',
  'carpenter'    : 'सुतार',
  'contractor'   : 'कंत्राटदार',
  'fabrication'  : 'फॅब्रिकेशन',
  'fabricator'   : 'फॅब्रिकेटर',
  'painter'      : 'पेंटर',
  'painting'     : 'पेंटिंग',
  'cleaning'     : 'साफसफाई',
  'security'     : 'सुरक्षा',
  'catering'     : 'केटरिंग',
  'transport'    : 'वाहतूक',
  'travels'      : 'ट्रॅव्हल्स',
  'services'     : 'सेवा',
  'service'      : 'सेवा',
  'agency'       : 'एजन्सी',
  'enterprises'  : 'उद्योग',
  'enterprise'   : 'उद्योग',
  'traders'      : 'व्यापारी',
  'works'        : 'कामे',
  'brothers'     : 'बंधू',
  'sons'         : 'पुत्र',
  'and'          : 'आणि',
  '&'            : 'आणि'
};


// ============================================================
// CORE: Call Google Input Tools API for transliteration
// Pre-processes known English words before sending to API.
// ============================================================
function transliterateToMarathi_(text) {
  if (!text || !text.trim()) return '';

  // Split into words, translate known English terms, transliterate the rest
  var words  = text.trim().split(/\s+/);
  var result = [];

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    var wl   = word.toLowerCase();

    if (ENGLISH_WORDS_MR[wl]) {
      // Known English business word → use direct Marathi translation
      result.push(ENGLISH_WORDS_MR[wl]);
    } else {
      // Indian name → transliterate via Google Input Tools
      var mr = callGoogleInputTools_(word);
      result.push(mr || word); // fallback to original if API fails
      Utilities.sleep(100);
    }
  }

  return result.join(' ');
}


// ============================================================
// INTERNAL: Google Input Tools API call for one word/phrase
// ============================================================
function callGoogleInputTools_(text) {
  var url = 'https://inputtools.google.com/request'
    + '?text='       + encodeURIComponent(text.trim())
    + '&itc=mr-t-i0-und'
    + '&num=1'
    + '&cp=0&cs=1'
    + '&ie=utf-8&oe=utf-8'
    + '&app=test';

  try {
    var resp   = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var parsed = JSON.parse(resp.getContentText());

    if (parsed[0] !== 'SUCCESS') return null;

    var candidates = parsed[1] && parsed[1][0] && parsed[1][0][1];
    return (candidates && candidates.length > 0) ? candidates[0] : null;
  } catch (e) {
    Logger.log('callGoogleInputTools_ error: ' + e.message);
    return null;
  }
}
