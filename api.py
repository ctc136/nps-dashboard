from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
load_dotenv(override=True)

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL, connect_timeout=10, sslmode="require")

# --- Route 1: Get all distinct park names ---
@app.route('/api/parks')
def get_parks():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT DISTINCT park_name FROM visits ORDER BY park_name")
    parks = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([row['park_name'] for row in parks])

# --- Route 2: Get visitor history for a specific park ---
@app.route('/api/parks/<park_name>/history')
def get_park_history(park_name):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """SELECT year, recreation_visitors
           FROM visits
           WHERE park_name = %s
           AND recreation_visitors IS NOT NULL
           ORDER BY year""",
        (park_name,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(row) for row in rows])

# --- Route 3: Top N parks for a given year ---
@app.route('/api/top-parks')
def get_top_parks():
    year = request.args.get('year', 2024)
    limit = request.args.get('limit', 10)
    suffixes = request.args.get('suffixes', '')

    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if suffixes:
        suffix_list = suffixes.split(',')
        placeholders = ' OR '.join(['park_name LIKE %s' for _ in suffix_list])
        params = [f'%{s}' for s in suffix_list] + [year, limit]
        cur.execute(f'''
            SELECT park_name, recreation_visitors
            FROM visits
            WHERE ({placeholders})
            AND year = %s
            AND recreation_visitors IS NOT NULL
            ORDER BY recreation_visitors DESC
            LIMIT %s''', params)
    else:
        cur.execute('''
            SELECT park_name, recreation_visitors
            FROM visits
            WHERE year = %s
            AND recreation_visitors IS NOT NULL
            ORDER BY recreation_visitors DESC
            LIMIT %s''', (year, limit))

    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(row) for row in rows])

# --- Route 4: System-wide totals by year ---
@app.route('/api/totals-by-year')
def get_totals_by_year():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """SELECT year, SUM(recreation_visitors) as total_visitors
           FROM visits
           WHERE recreation_visitors IS NOT NULL
           GROUP BY year
           ORDER BY year"""
    )
    rows = cur.fetchall()
    cur.close()
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
        system=f'''You are a SQL expert. Convert natural language questions to PostgreSQL SQL queries.
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
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        results = [dict(row) for row in rows]
        return jsonify({'sql': sql, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e), 'sql': sql}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
