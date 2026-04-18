import { useState, useEffect } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts"

const API = "http://localhost:5001"

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

const styles = {
  page: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "2.5rem",
    paddingBottom: "2rem",
    borderBottom: "1px solid #1e2130",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "-0.5px",
    marginBottom: "0.4rem",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#6b7280",
  },
  card: {
    background: "#161b27",
    border: "1px solid #1e2130",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#52b788",
    marginBottom: "1rem",
  },
  sectionTitle: {
    fontSize: "1.05rem",
    fontWeight: "600",
    color: "#e0e0e0",
    marginBottom: "1.25rem",
  },
  filterRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "2rem",
  },
  filterBtn: (active) => ({
    padding: "0.4rem 1rem",
    borderRadius: "999px",
    border: `1px solid ${active ? "#52b788" : "#2a2f3e"}`,
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: active ? "600" : "400",
    backgroundColor: active ? "#52b788" : "transparent",
    color: active ? "#0f1117" : "#9ca3af",
    transition: "all 0.15s",
  }),
  filterCount: {
    fontSize: "0.8rem",
    color: "#4b5563",
    marginLeft: "0.25rem",
  },
  select: {
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    backgroundColor: "#0f1117",
    color: "#e0e0e0",
    border: "1px solid #2a2f3e",
    borderRadius: "8px",
    minWidth: "280px",
    cursor: "pointer",
  },
  yearInput: {
    width: "75px",
    padding: "0.4rem 0.6rem",
    fontSize: "0.9rem",
    backgroundColor: "#0f1117",
    color: "#e0e0e0",
    border: "1px solid #2a2f3e",
    borderRadius: "8px",
    textAlign: "center",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  },
  controlLabel: {
    fontSize: "0.82rem",
    color: "#6b7280",
    fontWeight: "500",
  },
  askInput: {
    flex: 1,
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
    backgroundColor: "#0f1117",
    color: "#e0e0e0",
    border: "1px solid #2a2f3e",
    borderRadius: "8px",
    outline: "none",
  },
  askBtn: (disabled) => ({
    padding: "0.65rem 1.4rem",
    backgroundColor: disabled ? "#1e2130" : "#52b788",
    color: disabled ? "#4b5563" : "#0f1117",
    border: "none",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.15s",
  }),
  sqlBox: {
    marginBottom: "1rem",
    padding: "0.85rem 1rem",
    backgroundColor: "#0f1117",
    borderRadius: "8px",
    border: "1px solid #1e2130",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: "0.82rem",
    color: "#52b788",
    lineHeight: "1.6",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.88rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #1e2130",
    color: "#6b7280",
    fontWeight: "600",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: {
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #161b27",
    color: "#d1d5db",
  },
  errorText: {
    color: "#f87171",
    fontSize: "0.88rem",
    marginTop: "0.5rem",
  },
  chips: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  chip: {
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    border: "1px solid #2a2f3e",
    fontSize: "0.78rem",
    color: "#9ca3af",
    cursor: "pointer",
    backgroundColor: "transparent",
    transition: "all 0.15s",
  },
}

const SAMPLE_QUESTIONS = [
  "Which parks had the most visitors in 1955?",
  "Show me Yellowstone visitors by decade",
  "Which parks have grown the most since 2000?",
  "What year had the lowest total visitors?",
]

const tooltipStyle = {
  backgroundColor: "#1a1f2e",
  border: "1px solid #2a2f3e",
  borderRadius: "8px",
  color: "#e0e0e0",
  fontSize: "0.85rem",
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
  const [askResults, setAskResults] = useState([])
  const [sqlGenerated, setSqlGenerated] = useState("")
  const [askError, setAskError] = useState("")

  useEffect(() => {
    fetch(`${API}/api/parks`).then(r => r.json()).then(setAllParks)
    fetch(`${API}/api/totals-by-year`).then(r => r.json()).then(setTotals)
  }, [])

  useEffect(() => {
    const filter = FILTERS[activeFilter]
    const filtered = allParks.filter(p => matchesFilter(p, filter))
    setFilteredParks(filtered)
    if (filtered.length > 0) setSelectedPark(filtered[0])
  }, [allParks, activeFilter])

  useEffect(() => {
    if (!selectedPark) return
    setLoading(true)
    fetch(`${API}/api/parks/${encodeURIComponent(selectedPark)}/history`)
      .then(r => r.json()).then(data => { setHistory(data); setLoading(false) })
  }, [selectedPark])

  useEffect(() => {
    const filter = FILTERS[activeFilter]
    const suffixParam = filter.suffixes ? filter.suffixes.join(",") : ""
    const url = `${API}/api/top-parks?year=${topYear}&limit=10${suffixParam ? `&suffixes=${encodeURIComponent(suffixParam)}` : ""}`
    fetch(url).then(r => r.json()).then(setTopParks)
  }, [topYear, activeFilter])

  async function handleAsk() {
    if (!question.trim()) return
    setAsking(true)
    setAskError("")
    setAskResults([])
    setSqlGenerated("")
    try {
      const res = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      if (data.error) setAskError(`Error: ${data.error}`)
      else { setSqlGenerated(data.sql); setAskResults(data.results) }
    } catch { setAskError("Failed to reach API") }
    setAsking(false)
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>🏕️ National Park Visitor Dashboard</div>
        <div style={styles.subtitle}>
          Recreation visitor data 1904–2025 &nbsp;·&nbsp; {allParks.length} parks tracked
        </div>
      </div>

      {/* Filter row */}
      <div style={styles.filterRow}>
        {Object.entries(FILTERS).map(([key, val]) => (
          <button key={key} onClick={() => setActiveFilter(key)} style={styles.filterBtn(activeFilter === key)}>
            {val.label}
          </button>
        ))}
        <span style={styles.filterCount}>{filteredParks.length} parks</span>
      </div>

      {/* Park History */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Park Visitor History</div>
        <div style={styles.controlRow}>
          <span style={styles.controlLabel}>Park</span>
          <select value={selectedPark} onChange={e => setSelectedPark(e.target.value)} style={styles.select}>
            {filteredParks.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: "1rem" }}>
          {selectedPark}
        </div>
        {loading ? <p style={{ color: "#6b7280" }}>Loading...</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
              <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Visitors"]} />
              <Line type="monotone" dataKey="recreation_visitors" stroke="#52b788" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 10 */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Top 10 Most Visited</div>
        <div style={styles.controlRow}>
          <span style={styles.controlLabel}>Year</span>
          <input type="number" min="1904" max="2025" value={topYear}
            onChange={e => setTopYear(e.target.value)} style={styles.yearInput} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topParks} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
            <XAxis dataKey="park_name" stroke="#4b5563" interval={0}
              tick={{ fontSize: 10, fill: "#6b7280", angle: -45, textAnchor: "end" }} height={100} />
            <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Visitors"]} />
            <Bar dataKey="recreation_visitors" fill="#52b788" radius={[4, 4, 0, 0]}
              isAnimationActive={false} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Totals */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>System-Wide Visitor Trends</div>
        <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1.25rem" }}>
          Total recreation visitors across all NPS units per year
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={totals} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
            <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Total Visitors"]} />
            <Line type="monotone" dataKey="total_visitors" stroke="#74c69d" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ask */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Ask a Question</div>
        <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>
          Ask anything about the data — Claude will translate it to SQL and run it
        </div>
        <div style={styles.chips}>
          {SAMPLE_QUESTIONS.map(q => (
            <button key={q} style={styles.chip} onClick={() => setQuestion(q)}>{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            placeholder="e.g. Which parks had the most visitors in 1955?"
            style={styles.askInput}
          />
          <button onClick={handleAsk} disabled={asking} style={styles.askBtn(asking)}>
            {asking ? "Thinking..." : "Ask"}
          </button>
        </div>
        {askError && <p style={styles.errorText}>{askError}</p>}
        {sqlGenerated && <div style={styles.sqlBox}>{sqlGenerated}</div>}
        {askResults.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                {Object.keys(askResults[0]).map(key => (
                  <th key={key} style={styles.th}>{key.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {askResults.map((row, i) => (
                <tr key={i}>
                  {Object.entries(row).map(([key, val], j) => (
                    <td key={j} style={styles.td}>
                      {typeof val === "number"
                        ? (key.includes("year") || key.includes("decade") ? val.toString() : val.toLocaleString())
                        : val}
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
