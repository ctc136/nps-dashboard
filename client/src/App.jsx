import { useState, useEffect } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts"

const API = "http://localhost:5001"

// Park type filters
const FILTERS = {
  all: { label: "All NPS Units", suffixes: null },
  parks: { label: "National Parks Only", suffixes: ["NP", "NP & PRES", "NP&PRES"] },
  natural: { label: "Parks + Monuments + Seashores", suffixes: ["NP", "NP & PRES", "NP&PRES", "NPRES", "NM", "NS", "NL", "NRA"] }
}

function matchesFilter(parkName, filter) {
  if (!filter.suffixes) return true
  return filter.suffixes.some(suffix => parkName.endsWith(suffix))
}

function formatMillions(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value
}


export default function App() {
  const [allParks, setAllParks] = useState([])
  const [filteredParks, setFilteredParks] = useState([])
  const [selectedPark, setSelectedPark] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [history, setHistory] = useState([])
  const [topParks, setTopParks] = useState([])
  const [totals, setTotals] = useState([])
  const [topYear, setTopYear] = useState(2024)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState("")
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState("")
  const [sqlGenerated, setSqlGenerated] = useState("")
  const [askResults, setAskResults] = useState([])

  async function handleAsk() {
    if (!question.trim()) return
    setAsking(true)
    setAskError("")
    setSqlGenerated("")
    setAskResults([])
    try {
      const res = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      if (data.error) {
        setAskError(data.error)
        if (data.sql) setSqlGenerated(data.sql)
      } else {
        setSqlGenerated(data.sql)
        setAskResults(data.results)
      }
    } catch (err) {
      setAskError("Failed to reach the server.")
    } finally {
      setAsking(false)
    }
  }

  // Load all parks once
  useEffect(() => {
    fetch(`${API}/api/parks`)
      .then(res => res.json())
      .then(data => setAllParks(data))
  }, [])

  // Load totals by year once
  useEffect(() => {
    fetch(`${API}/api/totals-by-year`)
      .then(res => res.json())
      .then(setTotals)
  }, [])

  // Apply filter whenever allParks or activeFilter changes
  useEffect(() => {
    const filter = FILTERS[activeFilter]
    const filtered = allParks.filter(p => matchesFilter(p, filter))
    setFilteredParks(filtered)
    if (filtered.length > 0) setSelectedPark(filtered[0])
  }, [allParks, activeFilter])

  // Load park history when selection changes
  useEffect(() => {
    if (!selectedPark) return
    setLoading(true)
    fetch(`${API}/api/parks/${encodeURIComponent(selectedPark)}/history`)
      .then(res => res.json())
      .then(data => {
        setHistory(data)
        setLoading(false)
      })
  }, [selectedPark])

  // Load top parks when year or filter changes
  useEffect(() => {
    const filter = FILTERS[activeFilter]
    const suffixParam = filter.suffixes ? filter.suffixes.join(',') : ''
    const url = `${API}/api/top-parks?year=${topYear}&limit=10${suffixParam ? `&suffixes=${encodeURIComponent(suffixParam)}` : ''}`
    fetch(url)
      .then(res => res.json())
      .then(data => setTopParks(data))
  }, [topYear, activeFilter])

  console.log('topParks data:', JSON.stringify(topParks))
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>

      {/* Header */}
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        🏕️ National Park Visitor Dashboard
      </h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Recreation visitor data 1904–2025 · {allParks.length} total parks
      </p>

      {/* Filter toggle */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {Object.entries(FILTERS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid #444",
              cursor: "pointer",
              fontSize: "0.85rem",
              backgroundColor: activeFilter === key ? "#2d6a4f" : "transparent",
              color: activeFilter === key ? "white" : "#ccc",
              transition: "all 0.2s"
            }}
          >
            {val.label}
          </button>
        ))}
        <span style={{ color: "#888", fontSize: "0.85rem", alignSelf: "center", marginLeft: "0.5rem" }}>
          {filteredParks.length} parks shown
        </span>
      </div>

      {/* Section 1: Park history */}
      <div style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <label style={{ fontWeight: "bold" }}>Park:</label>
          <select
            value={selectedPark}
            onChange={e => setSelectedPark(e.target.value)}
            style={{ padding: "0.4rem", fontSize: "0.95rem", minWidth: "280px" }}
          >
            {filteredParks.map(park => (
              <option key={park} value={park}>{park}</option>
            ))}
          </select>
        </div>

        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem", color: "#ccc" }}>
          Visitor History — {selectedPark}
        </h2>

        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="year" stroke="#888" />
              <YAxis tickFormatter={formatMillions} stroke="#888" />
              <Tooltip formatter={(v) => [v.toLocaleString(), "Visitors"]} />
              <Line type="monotone" dataKey="recreation_visitors" stroke="#52b788" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 2: Top parks bar chart */}
      <div style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", color: "#ccc", margin: 0 }}>Top 10 Most Visited Parks</h2>
          <input
            type="number"
            min="1904"
            max="2025"
            value={topYear}
            onChange={e => setTopYear(e.target.value)}
            style={{ width: "70px", padding: "0.3rem", fontSize: "0.95rem" }}
          />
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topParks} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="park_name"
              stroke="#888"
              interval={0}
              tick={{ fontSize: 10, fill: '#888', angle: -45, textAnchor: 'end' }}
              height={100}
            />
            <YAxis tickFormatter={formatMillions} stroke="#888" />
            <Tooltip formatter={(v) => [v.toLocaleString(), "Visitors"]} />
            <Bar dataKey="recreation_visitors" fill="#52b788" radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3: System-wide totals */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.05rem", color: "#ccc", marginBottom: "0.75rem" }}>
          Total NPS Visitors Per Year (All Parks)
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={totals} margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="year" stroke="#888" />
            <YAxis tickFormatter={formatMillions} stroke="#888" />
            <Tooltip formatter={(v) => [v.toLocaleString(), "Total Visitors"]} />
            <Line type="monotone" dataKey="total_visitors" stroke="#95d5b2" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 4: Ask a question */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.05rem', color: '#ccc', marginBottom: '0.75rem' }}>
          Ask a Question
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type='text'
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder='e.g. Which parks had the most visitors in 1955?'
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.95rem', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#1a1a1a', color: 'white' }}
          />
          <button
            onClick={handleAsk}
            disabled={asking}
            style={{ padding: '0.5rem 1.2rem', backgroundColor: '#2d6a4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {askError && <p style={{ color: '#ff6b6b' }}>{askError}</p>}
        {sqlGenerated && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#111', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#95d5b2' }}>
            {sqlGenerated}
          </div>
        )}
        {askResults.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                {Object.keys(askResults[0]).map(key => (
                  <th key={key} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #444', color: '#888' }}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {askResults.map((row, i) => (
                <tr key={i}>
                  {Object.keys(row).map((key, j) => (
                    <td key={j} style={{ padding: '0.5rem', borderBottom: '1px solid #222', color: '#ccc', textAlign: 'left' }}>
                      {typeof row[key] === 'number'
                        ? (key.includes('year') || key.includes('decade')
                          ? row[key].toString()
                          : row[key].toLocaleString())
                        : row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}