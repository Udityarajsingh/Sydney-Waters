import { useEffect, useMemo, useState } from "react"
import { onValue, ref } from "firebase/database"
import { db } from "../firebase"
import styles from "./Dashboard.module.css"
import waterLogo from "../assets/water.svg"

type QuizTimes = {
  question1: number | null
  question2: number | null
  question3: number | null
  question4: number | null
  question5: number | null
}

type PlayerQuiz = {
  startedAt?: number | null
  endedAt?: number | null
  totalTimeMs?: number | null
  completed?: boolean
  questionTimesMs?: Partial<QuizTimes>
}

type PlayerRecord = {
  age?: string
  gender?: string
  postcode?: string
  createdAt?: number
  quiz?: PlayerQuiz
}

type PlayerWithId = PlayerRecord & { id: string }
type DashboardTab = "dashboard" | "user_data"

const emptyTimes: QuizTimes = {
  question1: null,
  question2: null,
  question3: null,
  question4: null,
  question5: null
}

function msToSeconds(ms: number | null | undefined) {
  if (typeof ms !== "number") {
    return "-"
  }
  return (ms / 1000).toFixed(2)
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function safeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function normalizeAge(age?: string) {
  if (!age) return "unknown"
  return age
}

function displayAge(age?: string) {
  const value = normalizeAge(age)
  if (value === "under18") return "Under 18"
  if (value === "18to24") return "18 to 24"
  if (value === "25to34") return "25 to 34"
  if (value === "35to44") return "35 to 44"
  if (value === "45to54") return "45 to 54"
  return "Prefer not to say"
}

function displayGender(gender?: string) {
  if (gender === "male") return "Male"
  if (gender === "female") return "Female"
  if (gender === "prefer_not_to_say") return "Prefer not to say"
  return "Unknown"
}

function toCsvDate(timestamp?: number | null) {
  if (!timestamp) return ""
  return new Date(timestamp).toISOString()
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard")
  const [players, setPlayers] = useState<PlayerWithId[]>([])
  const [readError, setReadError] = useState<string | null>(null)

  useEffect(() => {
    const playersRef = ref(db, "players")

    const unsubscribe = onValue(
      playersRef,
      (snapshot) => {
        setReadError(null)
        const raw = snapshot.val() as Record<string, PlayerRecord> | null
        if (!raw) {
          setPlayers([])
          return
        }

        const mapped = Object.entries(raw).map(([id, value]) => ({
          id,
          ...value
        }))

        mapped.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        setPlayers(mapped)
      },
      (error) => {
        setPlayers([])
        setReadError(error.message)
      }
    )

    return () => unsubscribe()
  }, [])

  const stats = useMemo(() => {
    const under18Count = players.filter((player) => normalizeAge(player.age) === "under18").length
    const age18To24Count = players.filter((player) => normalizeAge(player.age) === "18to24").length
    const age25To34Count = players.filter((player) => normalizeAge(player.age) === "25to34").length
    const age35To44Count = players.filter((player) => normalizeAge(player.age) === "35to44").length
    const age45To54Count = players.filter((player) => normalizeAge(player.age) === "45to54").length
    const maleCount = players.filter((player) => player.gender === "male").length
    const femaleCount = players.filter((player) => player.gender === "female").length
    const preferNotToSayCount = players.filter((player) => player.gender === "prefer_not_to_say").length
    const completedCount = players.filter((player) => player.quiz?.completed).length

    const totalTimes = players
      .map((player) => player.quiz?.totalTimeMs)
      .filter((value): value is number => typeof value === "number")

    const questionValues: Record<keyof QuizTimes, number[]> = {
      question1: [],
      question2: [],
      question3: [],
      question4: [],
      question5: []
    }

    for (const player of players) {
      const times = { ...emptyTimes, ...(player.quiz?.questionTimesMs ?? {}) }
      const keys = Object.keys(questionValues) as Array<keyof QuizTimes>

      for (const key of keys) {
        const value = times[key]
        if (typeof value === "number") {
          questionValues[key].push(value)
        }
      }
    }

    return {
      under18Count,
      age18To24Count,
      age25To34Count,
      age35To44Count,
      age45To54Count,
      maleCount,
      femaleCount,
      preferNotToSayCount,
      completedCount,
      averageTotalMs: average(totalTimes),
      averagePerQuestionMs: {
        question1: average(questionValues.question1),
        question2: average(questionValues.question2),
        question3: average(questionValues.question3),
        question4: average(questionValues.question4),
        question5: average(questionValues.question5)
      }
    }
  }, [players])

  function buildCsvRow(player: PlayerWithId) {
    const times = { ...emptyTimes, ...(player.quiz?.questionTimesMs ?? {}) }

    return [
      player.id,
      displayAge(player.age),
      displayGender(player.gender),
      player.postcode ?? "",
      toCsvDate(player.createdAt),
      toCsvDate(player.quiz?.startedAt),
      toCsvDate(player.quiz?.endedAt),
      player.quiz?.completed ? "yes" : "no",
      times.question1?.toString() ?? "",
      times.question2?.toString() ?? "",
      times.question3?.toString() ?? "",
      times.question4?.toString() ?? "",
      times.question5?.toString() ?? "",
      player.quiz?.totalTimeMs?.toString() ?? ""
    ]
  }

  function downloadAllPlayersCsv() {
    const headers = [
      "playerId",
      "age",
      "gender",
      "postcode",
      "createdAt",
      "startedAt",
      "endedAt",
      "completed",
      "question1Ms",
      "question2Ms",
      "question3Ms",
      "question4Ms",
      "question5Ms",
      "totalTimeMs"
    ]

    const rows = players.map((player) =>
      buildCsvRow(player).map((item) => safeCsvCell(item)).join(",")
    )

    const csv = `${headers.join(",")}\n${rows.join("\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `all_players_${Date.now()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  function renderDashboardTab() {
    return (
      <section className={`${styles.tabScreen} ${styles.dashboardScreen}`}>
        <section className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <p className={styles.metricValue}>{players.length}</p>
            <p className={styles.metricLabel}>Users Played</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricValue}>{stats.completedCount}</p>
            <p className={styles.metricLabel}>Completed Quizzes</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricValue}>{(stats.averageTotalMs / 1000).toFixed(2)}s</p>
            <p className={styles.metricLabel}>Avg Time / Quiz</p>
          </article>
        </section>

        <section className={styles.panelGrid}>
          <article className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Age Distribution</h2>
            <ul className={styles.dataList}>
              <li><span>Under 18</span><span>{stats.under18Count}</span></li>
              <li><span>18 to 24</span><span>{stats.age18To24Count}</span></li>
              <li><span>25 to 34</span><span>{stats.age25To34Count}</span></li>
              <li><span>35 to 44</span><span>{stats.age35To44Count}</span></li>
              <li><span>45 to 54</span><span>{stats.age45To54Count}</span></li>
            </ul>
          </article>

          <article className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Gender Distribution</h2>
            <ul className={styles.dataList}>
              <li><span>Male</span><span>{stats.maleCount}</span></li>
              <li><span>Female</span><span>{stats.femaleCount}</span></li>
              <li><span>Prefer not to say</span><span>{stats.preferNotToSayCount}</span></li>
            </ul>
          </article>
        </section>

        <section className={styles.panelCard}>
          <h2 className={styles.panelTitle}>Average Question Timing (seconds)</h2>
          <ul className={styles.dataList}>
            <li><span>Question 1</span><span>{(stats.averagePerQuestionMs.question1 / 1000).toFixed(2)}</span></li>
            <li><span>Question 2</span><span>{(stats.averagePerQuestionMs.question2 / 1000).toFixed(2)}</span></li>
            <li><span>Question 3</span><span>{(stats.averagePerQuestionMs.question3 / 1000).toFixed(2)}</span></li>
            <li><span>Question 4</span><span>{(stats.averagePerQuestionMs.question4 / 1000).toFixed(2)}</span></li>
            <li><span>Question 5</span><span>{(stats.averagePerQuestionMs.question5 / 1000).toFixed(2)}</span></li>
          </ul>
        </section>
      </section>
    )
  }

  function renderUserDataTab() {
    return (
      <section className={`${styles.tabScreen} ${styles.userDataScreen}`}>
      <section className={styles.panelCard}>
        <div className={styles.userDataHeader}>
          <div className={styles.userDataTitleRow}>
            <h2 className={styles.panelTitle}>User Data</h2>
            <button
              type="button"
              className={styles.downloadButton}
              onClick={downloadAllPlayersCsv}
              disabled={players.length === 0}
            >
              Download CSV
            </button>
          </div>
          <p className={styles.userDataHint}>Download one CSV with all players and all quiz information.</p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Player ID</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Postcode</th>
                <th>Q1 (s)</th>
                <th>Q2 (s)</th>
                <th>Q3 (s)</th>
                <th>Q4 (s)</th>
                <th>Q5 (s)</th>
                <th>Total (s)</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const times = { ...emptyTimes, ...(player.quiz?.questionTimesMs ?? {}) }
                return (
                  <tr key={player.id}>
                    <td>{player.id}</td>
                    <td>{displayAge(player.age)}</td>
                    <td>{displayGender(player.gender)}</td>
                    <td>{player.postcode ?? "-"}</td>
                    <td>{msToSeconds(times.question1)}</td>
                    <td>{msToSeconds(times.question2)}</td>
                    <td>{msToSeconds(times.question3)}</td>
                    <td>{msToSeconds(times.question4)}</td>
                    <td>{msToSeconds(times.question5)}</td>
                    <td>{msToSeconds(player.quiz?.totalTimeMs)}</td>
                    <td>{player.quiz?.completed ? "yes" : "no"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      </section>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarBrand}>
          <img src={waterLogo} className={styles.logo} alt="Water logo" />
        </div>

        <nav className={styles.topNav}>
          <button
            type="button"
            className={`${styles.topNavButton} ${activeTab === "dashboard" ? styles.topNavButtonActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={`${styles.topNavButton} ${activeTab === "user_data" ? styles.topNavButtonActive : ""}`}
            onClick={() => setActiveTab("user_data")}
          >
            User Data
          </button>
        </nav>
      </header>

      <section className={styles.contentArea}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          
          {readError && (
            <p className={styles.errorText}>
              Firebase read error: {readError}
            </p>
          )}
        </header>

        {activeTab === "dashboard" ? renderDashboardTab() : renderUserDataTab()}
      </section>
    </main>
  )
}
