import csv
import sqlite3
import os

# --- Config ---
CSV_FILE = "Annual Summary Report (1904 - Last Calendar Year).csv"
DB_FILE = "nps.db"

# --- Connect to SQLite (creates the file if it doesn't exist) ---
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# --- Create the visits table ---
cursor.execute("""
    CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        park_name TEXT NOT NULL,
        year INTEGER NOT NULL,
        recreation_visitors INTEGER
    )
""")

# --- Read and clean the CSV ---
loaded = 0
skipped = 0

with open(CSV_FILE, newline='', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    
    # Skip rows until we hit the real header row
    for row in reader:
        if row and row[0].strip() == 'ParkName':
            break  # found the header, stop skipping
    
    # Now read actual data rows
    for row in reader:
        # Skip empty rows
        if not row or not row[0].strip():
            skipped += 1
            continue
        
        park_name = row[0].strip()
        
        # Skip footer/summary rows (they won't have a real park name)
        if park_name.lower() in ['title', 'annual summary report', 'parkname']:
            skipped += 1
            continue
        
        # Skip rows where year column isn't a 4-digit number
        try:
            year = int(row[1].strip())
            if year < 1900 or year > 2100:
                skipped += 1
                continue
        except (ValueError, IndexError):
            skipped += 1
            continue
        
        # Clean visitor count — remove commas, handle blanks
        try:
            visitors_raw = row[2].strip().replace(',', '')
            recreation_visitors = int(visitors_raw) if visitors_raw else None
        except (ValueError, IndexError):
            recreation_visitors = None
        
        cursor.execute("""
            INSERT INTO visits (park_name, year, recreation_visitors)
            VALUES (?, ?, ?)
        """, (park_name, year, recreation_visitors))
        
        loaded += 1

# --- Save and close ---
conn.commit()
conn.close()

print(f"Done! Loaded {loaded} rows, skipped {skipped} rows.")
print(f"Database saved to: {os.path.abspath(DB_FILE)}")