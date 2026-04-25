import { useState, useEffect, useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar, LabelList,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts"

const API = import.meta.env.VITE_API_URL

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

  const filteredParks = useMemo(() => {
    const filter = FILTERS[activeFilter]
    return allParks.filter(p => matchesFilter(p, filter))
  }, [allParks, activeFilter])

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/parks`).then(r => r.json()),
      fetch(`${API}/api/totals-by-year`).then(r => r.json()),
    ]).then(([parks, totals]) => {
      setAllParks(parks)
      setTotals(totals)
    })
  }, [])

  useEffect(() => {
    if (filteredParks.length > 0) setSelectedPark(filteredParks[0])
  }, [filteredParks])

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

  const historyRange = history.length > 0
    ? `${history[0].year}–${history[history.length - 1].year}`
    : ""
  const topTotal = topParks.reduce((sum, p) => sum + (p.recreation_visitors || 0), 0)
  const peakYear = totals.length > 0
    ? totals.reduce((max, t) => t.total_visitors > max.total_visitors ? t : max).year
    : ""

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: #0a0e1a; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .nps-page { max-width: 1000px; margin: 0 auto; padding: 1.5rem; }
        .header-badges { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 0.75rem; }
        .header-badge { font-size: 0.72rem; color: #9ca3af; border: 1px solid #1e2a3a; border-radius: 999px; padding: 0.2rem 0.75rem; background: #111827; }
        .filter-row { display: flex; gap: 0.5rem; overflow-x: auto; flex-wrap: nowrap; align-items: center; margin-bottom: 2rem; padding-bottom: 0.25rem; -webkit-overflow-scrolling: touch; }
        .filter-row::-webkit-scrollbar { display: none; }
        .filter-btn { padding: 0.4rem 1rem; border-radius: 999px; cursor: pointer; font-size: 0.82rem; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
        .filter-btn.active { background: #2563eb; border: 1px solid #2563eb; color: #fff; font-weight: 600; }
        .filter-btn.inactive { background: transparent; border: 1px solid #2a2f3e; color: #9ca3af; font-weight: 400; }
        .filter-count { font-size: 0.8rem; color: #4b5563; margin-left: 0.25rem; white-space: nowrap; flex-shrink: 0; }
        .card { background: #111827; border: 1px solid #1e2a3a; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
        .icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
        .card-title-group { flex: 1; min-width: 0; }
        .card-title { font-size: 1.05rem; font-weight: 600; color: #e0e0e0; }
        .card-subtitle { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
        .card-badge { font-size: 0.72rem; color: #9ca3af; background: #1a2333; border: 1px solid #2a3a4a; border-radius: 6px; padding: 0.2rem 0.6rem; white-space: nowrap; flex-shrink: 0; }
        .control-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
        .control-label { font-size: 0.82rem; color: #6b7280; font-weight: 500; }
        .park-select { padding: 0.5rem 0.75rem; font-size: 0.9rem; background: #0f1117; color: #e0e0e0; border: 1px solid #2a2f3e; border-radius: 8px; min-width: 280px; cursor: pointer; }
        .year-input { width: 75px; padding: 0.4rem 0.6rem; font-size: 0.9rem; background: #0f1117; color: #e0e0e0; border: 1px solid #2a2f3e; border-radius: 8px; text-align: center; }
        .chart-260 { height: 260px; }
        .chart-280 { height: 280px; }
        .chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .chip { padding: 0.3rem 0.75rem; border-radius: 999px; border: 1px solid #2a2f3e; font-size: 11px; color: #9ca3af; cursor: pointer; background: transparent; transition: all 0.15s; }
        .ask-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .ask-input { flex: 1; padding: 0.65rem 1rem; font-size: 0.95rem; background: #0f1117; color: #e0e0e0; border: 1px solid #2a2f3e; border-radius: 8px; outline: none; min-width: 0; }
        .ask-btn { padding: 0.65rem 1.4rem; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .ask-btn.ready { background: #2563eb; color: #fff; }
        .ask-btn.waiting { background: #1e2130; color: #4b5563; cursor: not-allowed; }
        .sql-box { margin-bottom: 1rem; padding: 0.85rem 1rem; background: #0f1117; border-radius: 8px; border: 1px solid #1e2130; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.82rem; color: #52b788; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
        .results-wrap { overflow-x: auto; }
        .results-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
        .results-table th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #1e2130; color: #6b7280; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .results-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #161b27; color: #d1d5db; }
        .error-text { color: #f87171; font-size: 0.88rem; margin-top: 0.5rem; }
        @media (max-width: 600px) {
          .nps-page { padding: 1rem; }
          .card { padding: 1rem; }
          .header-title { font-size: 1.4rem !important; }
          .chart-260 { height: 200px; }
          .chart-280 { height: 240px; }
          .park-select { width: 100%; min-width: unset; }
          .card-title { font-size: 0.95rem; }
          .ask-input { font-size: 0.88rem; }
        }
      `}</style>

      <div className="nps-page">

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: "1px solid #1e2a3a" }}>
          <div className="header-title" style={{ fontSize: "2rem", fontWeight: "700", color: "#ffffff", letterSpacing: "-0.5px" }}>
            National Park Visitor Dashboard
          </div>
          <div className="header-badges">
            <span className="header-badge">406 parks</span>
            <span className="header-badge">1904–2025</span>
            <span className="header-badge">24k records</span>
          </div>
        </div>

        {/* Filter row */}
        <div className="filter-row">
          {Object.entries(FILTERS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`filter-btn ${activeFilter === key ? "active" : "inactive"}`}
            >
              {val.label}
            </button>
          ))}
          <span className="filter-count">{filteredParks.length} parks</span>
        </div>

        {/* Park History Card */}
        <div className="card">
          <div className="card-header">
            <div className="icon-box" style={{ background: "#1e3a5f" }}>
              <span style={{ color: "#60a5fa", fontSize: "16px" }}>↗</span>
            </div>
            <div className="card-title-group">
              <div className="card-title">Park Visitor History</div>
              <div className="card-subtitle">Annual recreation visitor count by park</div>
            </div>
            {historyRange && <span className="card-badge">{historyRange}</span>}
          </div>
          <div className="control-row">
            <span className="control-label">Park</span>
            <select value={selectedPark} onChange={e => setSelectedPark(e.target.value)} className="park-select">
              {filteredParks.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {loading ? <p style={{ color: "#6b7280" }}>Loading...</p> : (
            <div className="chart-260">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                  <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11 }} ticks={[1920, 1940, 1960, 1980, 2000, 2020]} />
                  <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Visitors"]} />
                  <Area type="monotone" dataKey="recreation_visitors" stroke="#60a5fa" strokeWidth={2.5} fill="url(#blueGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top 10 Card */}
        <div className="card">
          <div className="card-header">
            <div className="icon-box" style={{ background: "#3d2a00" }}>
              <span style={{ color: "#fbbf24", fontSize: "16px" }}>★</span>
            </div>
            <div className="card-title-group">
              <div className="card-title">Top 10 Most Visited</div>
              <div className="card-subtitle">Most visited NPS units for selected year</div>
            </div>
            {topTotal > 0 && <span className="card-badge">{formatMillions(topTotal)} total</span>}
          </div>
          <div className="control-row">
            <span className="control-label">Year</span>
            <input type="number" min="1904" max="2025" value={topYear}
              onChange={e => setTopYear(e.target.value)} className="year-input" />
          </div>
          <div className="chart-280">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topParks} margin={{ top: 20, right: 20, left: 20, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                <XAxis dataKey="park_name" stroke="#4b5563" interval={0}
                  tick={{ fontSize: 9, fill: "#6b7280", angle: -45, textAnchor: "end" }} height={100} />
                <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Visitors"]} />
                <Bar dataKey="recreation_visitors" fill="#fbbf24" radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={false}>
                  <LabelList dataKey="recreation_visitors" position="top" formatter={formatMillions} style={{ fontSize: "10px", fill: "#9ca3af" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Trends Card */}
        <div className="card">
          <div className="card-header">
            <div className="icon-box" style={{ background: "#003d2e" }}>
              <span style={{ color: "#34d399", fontSize: "16px" }}>◎</span>
            </div>
            <div className="card-title-group">
              <div className="card-title">System-Wide Visitor Trends</div>
              <div className="card-subtitle">Total recreation visitors across all NPS units per year</div>
            </div>
            {peakYear && <span className="card-badge">Peak: {peakYear}</span>}
          </div>
          <div className="chart-260">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totals} margin={{ left: 10 }}>
                <defs>
                  <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11 }} ticks={[1920, 1940, 1960, 1980, 2000, 2020]} />
                <YAxis tickFormatter={formatMillions} stroke="#4b5563" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString(), "Total Visitors"]} />
                <Area type="monotone" dataKey="total_visitors" stroke="#34d399" strokeWidth={2.5} fill="url(#tealGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ask Card */}
        <div className="card">
          <div className="card-header">
            <div className="icon-box" style={{ background: "#2d1f5e" }}>
              <span style={{ color: "#a78bfa", fontSize: "16px" }}>✦</span>
            </div>
            <div className="card-title-group">
              <div className="card-title">Ask a Question</div>
              <div className="card-subtitle">Claude translates natural language to SQL and runs it</div>
            </div>
          </div>
          <div className="chips">
            {SAMPLE_QUESTIONS.map(q => (
              <button key={q} className="chip" onClick={() => setQuestion(q)}>{q}</button>
            ))}
          </div>
          <div className="ask-row">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAsk()}
              placeholder="e.g. Which parks had the most visitors in 1955?"
              className="ask-input"
            />
            <button onClick={handleAsk} disabled={asking} className={`ask-btn ${asking ? "waiting" : "ready"}`}>
              {asking ? "Thinking..." : "Ask"}
            </button>
          </div>
          {askError && <p className="error-text">{askError}</p>}
          {sqlGenerated && <div className="sql-box">{sqlGenerated}</div>}
          {askResults.length > 0 && (
            <div className="results-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(askResults[0]).map(key => (
                      <th key={key}>{key.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {askResults.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(row).map(([key, val], j) => (
                        <td key={j}>
                          {typeof val === "number"
                            ? (key.includes("year") || key.includes("decade") ? val.toString() : val.toLocaleString())
                            : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
