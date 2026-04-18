from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

DB_FILE = "nps.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # lets us return dicts instead of tuples
    return conn

# --- Route 1: Get all distinct park names ---
@app.route('/api/parks')
def get_parks():
    conn = get_db()
    parks = conn.execute(
        "SELECT DISTINCT park_name FROM visits ORDER BY park_name"
    ).fetchall()
    conn.close()
    return jsonify([row['park_name'] for row in parks])

# --- Route 2: Get visitor history for a specific park ---
@app.route('/api/parks/<park_name>/history')
def get_park_history(park_name):
    conn = get_db()
    rows = conn.execute(
        """SELECT year, recreation_visitors 
           FROM visits 
           WHERE park_name = ? 
           AND recreation_visitors IS NOT NULL
           ORDER BY year""",
        (park_name,)
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# --- Route 3: Top N parks for a given year ---
@app.route('/api/top-parks')
def get_top_parks():
    year = request.args.get('year', 2024)
    limit = request.args.get('limit', 10)
    suffixes = request.args.get('suffixes', '')

    conn = get_db()

    if suffixes:
        suffix_list = suffixes.split(',')
        placeholders = ' OR '.join([f"park_name LIKE ?" for _ in suffix_list])
        params = [f'%{s}' for s in suffix_list] + [year, limit]
        rows = conn.execute(f'''
            SELECT park_name, recreation_visitors
            FROM visits
            WHERE ({placeholders})
            AND year = ?
            AND recreation_visitors IS NOT NULL
            ORDER BY recreation_visitors DESC
            LIMIT ?''', params).fetchall()
    else:
        rows = conn.execute('''
            SELECT park_name, recreation_visitors
            FROM visits
            WHERE year = ?
            AND recreation_visitors IS NOT NULL
            ORDER BY recreation_visitors DESC
            LIMIT ?''', (year, limit)).fetchall()

    conn.close()
    return jsonify([dict(row) for row in rows])

# --- Route 4: System-wide totals by year ---
@app.route('/api/totals-by-year')
def get_totals_by_year():
    conn = get_db()
    rows = conn.execute(
        """SELECT year, SUM(recreation_visitors) as total_visitors
           FROM visits
           WHERE recreation_visitors IS NOT NULL
           GROUP BY year
           ORDER BY year"""
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/ask', methods=['POST'])
def ask_question():
    import anthropic

    data = request.get_json()
    question = data.get('question', '')

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    schema = """
    Table: visits
    Columns:
      - park_name (TEXT): Full name of the NPS unit e.g. 'Yellowstone NP', 'Grand Canyon NP'
      - year (INTEGER): Year of the record, ranges from 1904 to 2025
      - recreation_visitors (INTEGER): Number of recreation visitors that year
    """

    client = anthropic.Anthropic()

    message = client.messages.create(
        model='claude-opus-4-5',
        max_tokens=500,
        system=f'''You are a SQL expert. Convert natural language questions to SQLite SQL queries.
Only return the raw SQL query with no explanation, no markdown, no backticks.
Use only the table and columns described here:
{schema}
Always include LIMIT 20 unless the user specifies otherwise.
Only generate SELECT statements, never INSERT, UPDATE, or DELETE.''',
        messages=[{'role': 'user', 'content': question}]
    )

    sql = message.content[0].text.strip()

    try:
        conn = get_db()
        rows = conn.execute(sql).fetchall()
        conn.close()
        results = [dict(row) for row in rows]
        return jsonify({'sql': sql, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e), 'sql': sql}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)