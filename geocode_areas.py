"""
geocode_areas.py — Bulk area detection using OpenStreetMap Nominatim (FREE)
============================================================================
No API key needed. Works locally.
Reads a CSV export of Provider_Master, geocodes addresses, outputs a CSV
you can paste back into Google Sheets.

USAGE:
  1. In Google Sheets → Provider_Master → File → Download → CSV
     Save as: provider_master.csv (in same folder as this script)
  2. pip install requests pandas
  3. python geocode_areas.py
  4. Open output_with_areas.csv
  5. Copy the "area" column values back into your Google Sheet

NOTES:
  - Nominatim rate limit: 1 request/second (script handles this automatically)
  - No daily quota — process all rows in one go
  - Accuracy: very good for Aurangabad/Chhatrapati Sambhajinagar localities
"""

import time
import csv
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
CITY_SUFFIX   = "Chhatrapati Sambhajinagar, Maharashtra, India"
INPUT_FILE    = "provider_master.csv"
OUTPUT_FILE   = "output_with_areas.csv"

HEADERS = {
    "User-Agent": "ServiceFinderApp/1.0 (local geocoding script)"
}

# Column names in your CSV (case-insensitive match done below)
COL_ADDRESS = "address"
COL_AREA    = "area"
COL_NAME    = "provider_name"


def geocode(address: str) -> str | None:
    """Return sublocality / neighbourhood for an address, or None."""
    query = f"{address}, {CITY_SUFFIX}"
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": query, "format": "json", "addressdetails": 1, "limit": 1},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
        if not results:
            return None

        addr = results[0].get("address", {})

        # Priority: suburb > neighbourhood > city_district > quarter
        for key in ("suburb", "neighbourhood", "city_district", "quarter"):
            val = addr.get(key)
            if val:
                return val

        return None
    except Exception as e:
        print(f"  ERROR geocoding '{address}': {e}")
        return None


def main():
    with open(INPUT_FILE, newline="", encoding="utf-8") as f:
        reader  = csv.DictReader(f)
        # Normalise header names to lowercase
        fieldnames = [col.strip() for col in reader.fieldnames or []]
        col_map    = {c.lower(): c for c in fieldnames}

        address_col = col_map.get(COL_ADDRESS)
        area_col    = col_map.get(COL_AREA)
        name_col    = col_map.get(COL_NAME)

        if not address_col:
            print(f"ERROR: '{COL_ADDRESS}' column not found in CSV.")
            return
        if not area_col:
            print(f"ERROR: '{COL_AREA}' column not found in CSV.")
            return

        rows = list(reader)

    filled   = 0
    skipped  = 0
    notfound = []

    for i, row in enumerate(rows):
        current_area = (row.get(area_col) or "").strip()
        address      = (row.get(address_col) or "").strip()
        name         = (row.get(name_col) or f"row {i+2}").strip() if name_col else f"row {i+2}"

        if current_area:
            skipped += 1
            continue                    # already has area

        if not address:
            print(f"  SKIP (no address): {name}")
            continue

        print(f"  Geocoding ({i+2}): {name} | {address}")
        detected = geocode(address)

        if detected:
            row[area_col] = detected
            filled += 1
            print(f"    → {detected}")
        else:
            notfound.append(f"row {i+2} | {name} | {address}")
            print(f"    → not found")

        time.sleep(1.1)  # Nominatim requires ≥1 second between requests

    # Write output
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print()
    print("=== Done ===")
    print(f"Already had area (skipped): {skipped}")
    print(f"Auto-filled:                {filled}")
    print(f"Not found ({len(notfound)}):")
    for m in notfound:
        print(f"  {m}")
    print(f"\nOutput saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
