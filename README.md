# 🏕️ National Park Visitor Dashboard

An interactive data dashboard exploring 120 years of National Park Service 
visitor statistics, with an AI-powered natural language query feature.

## Features

- **Park Visitor History** — Line chart showing visitor trends for any of 
  406 NPS units from 1904 to 2025
- **Top 10 Most Visited** — Bar chart ranking parks by visitors for any 
  selected year
- **System-Wide Trends** — Total NPS visitors per year across all parks, 
  including the dramatic 2020 COVID dip and recovery
- **Park Type Filter** — Toggle between All NPS Units, National Parks Only, 
  or Parks + Monuments + Seashores
- **Natural Language Queries** — Ask questions in plain English and get 
  answers powered by Claude AI translating to SQL

## Tech Stack

- **Frontend:** React + Vite + Recharts
- **Backend:** Python + Flask
- **Database:** SQLite (24,372 rows across 406 parks)
- **AI:** Anthropic Claude API (text-to-SQL)
- **Data Source:** NPS Visitor Use Statistics (IRMA Portal)

## How It Works

The natural language query feature sends user questions to Claude along 
with the database schema. Claude returns a SQL query string which Flask 
runs directly against the SQLite database. No query results pass through 
Claude — it acts purely as a natural language to SQL translator.

## Project Structure
nps-dashboard/
├── api.py                 # Flask REST API
├── load_data.py           # CSV ingestion script
├── nps.db                 # SQLite database (not committed)
├── Annual Summary Report  # Raw CSV (not committed)
└── client/                # React frontend
└── src/
└── App.jsx

## Setup

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors anthropic python-dotenv
```

Create a `.env` file in the root folder: ANTHROPIC_API_KEY=your-key-here

Download the NPS Annual Summary Report CSV from the 
[IRMA Portal](https://irma.nps.gov/Stats/) and place it in the root folder, 
then run:
```bash
python3 load_data.py
python3 api.py
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Sample Queries

- *"Which parks had the most visitors in 1955?"*
- *"Which parks have seen the biggest increase in visitors since 2000?"*
- *"Show me Yellowstone visitor counts by decade"*
- *"What year had the lowest total visitors across all parks?"*