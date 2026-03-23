import { useEffect, useMemo, useRef, useState } from "react"
import { onValue, ref } from "firebase/database"
import { db } from "../firebase"
import styles from "./Dashboard.module.css"

type DashboardView = "quiz" | "water_cycle_app"

type QuizTimes = {
  question1: number | null
  question2: number | null
  question3: number | null
  question4: number | null
  question5: number | null
}

type QuizWrongAnswers = {
  question1: number | null
  question2: number | null
  question3: number | null
  question4: number | null
  question5: number | null
}

type PlayerQuiz = {
  totalTimeMs?: number | null
  totalWrongAnswers?: number | null
  completed?: boolean
  questionTimesMs?: Partial<QuizTimes>
  wrongAnswersCount?: Partial<QuizWrongAnswers>
}

type PlayerRecord = {
  age?: string
  gender?: string
  postcode?: string
  createdAt?: number
  quiz?: PlayerQuiz
}

type PlayerWithId = PlayerRecord & { id: string }

type DateRangeValue = {
  from: string
  to: string
}

const emptyTimes: QuizTimes = {
  question1: null,
  question2: null,
  question3: null,
  question4: null,
  question5: null
}

const emptyWrongAnswers: QuizWrongAnswers = {
  question1: null,
  question2: null,
  question3: null,
  question4: null,
  question5: null
}

function safeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function displayGender(gender?: string) {
  const normalized = (gender ?? "").toLowerCase().trim()
  if (normalized === "male") return "Male"
  if (normalized === "female") return "Female"
  if (normalized === "non_binary" || normalized === "non-binary") return "Non-binary"
  if (normalized === "prefer_not_to_say") return "Prefer not to say"
  return gender && gender.length > 0 ? gender : "Unknown"
}

function displayAge(age?: string) {
  if (!age) return "Unknown"
  if (age === "below_12") return "below 12"
  if (age === "13_to_17") return "13 to 17"
  if (age === "under18") return "Under 18"
  if (age === "18to24") return "18 to 24"
  if (age === "25to34") return "25 to 34"
  if (age === "35to44") return "35 to 44"
  if (age === "45to54") return "45 to 54"
  if (age === "prefer_not_to_say") return "Prefer not to say"
  return age
}

function msToDisplay(ms: number | null | undefined) {
  if (typeof ms !== "number") return "-"
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
  }
  return `${seconds}s`
}

function toInputDate(timestamp: number) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatRangeLabel(range: DateRangeValue) {
  if (!range.from || !range.to) {
    return "Choose date range"
  }

  const from = new Date(`${range.from}T00:00:00`)
  const to = new Date(`${range.to}T00:00:00`)

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  })

  return `${formatter.format(from)} - ${formatter.format(to)}`
}

function fromInputDateToMsStart(value: string) {
  if (!value) return null
  return new Date(`${value}T00:00:00`).getTime()
}

function fromInputDateToMsEnd(value: string) {
  if (!value) return null
  return new Date(`${value}T23:59:59.999`).getTime()
}

function getNegativeAnswerBadges(wrongAnswers: QuizWrongAnswers) {
  const badges: string[] = []
  const keys: Array<keyof QuizWrongAnswers> = [
    "question1",
    "question2",
    "question3",
    "question4",
    "question5"
  ]

  keys.forEach((key, index) => {
    const value = wrongAnswers[key]
    if (typeof value === "number" && value > 0) {
      badges.push(`Q${index + 1}`)
    }
  })

  return badges
}

function getNegativeAnswerBadgesWithCount(wrongAnswers: QuizWrongAnswers) {
  const badges: string[] = []
  const keys: Array<keyof QuizWrongAnswers> = [
    "question1",
    "question2",
    "question3",
    "question4",
    "question5"
  ]

  keys.forEach((key, index) => {
    const value = wrongAnswers[key]
    if (typeof value === "number" && value > 0) {
      badges.push(`Q${index + 1}:${value.toString().padStart(2, "0")}`)
    }
  })

  return badges
}

export function Dashboard() {
  const [activeView, setActiveView] = useState<DashboardView>("quiz")
  const [players, setPlayers] = useState<PlayerWithId[]>([])
  const [readError, setReadError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedAgeFilter, setSelectedAgeFilter] = useState("all")
  const [selectedGenderFilter, setSelectedGenderFilter] = useState("all")

  const filterRef = useRef<HTMLDivElement | null>(null)

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: "",
    to: ""
  })

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

  useEffect(() => {
    if (players.length === 0) {
      return
    }

    const withCreatedAt = players.filter((player) => typeof player.createdAt === "number")

    if (withCreatedAt.length === 0) {
      return
    }

    const latestMs = Math.max(...withCreatedAt.map((player) => player.createdAt as number))
    const latestDate = new Date(latestMs)
    const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0)

    setDateRange({
      from: toInputDate(monthStart.getTime()),
      to: toInputDate(monthEnd.getTime())
    })
  }, [players])

  useEffect(() => {
    function onGlobalPointer(event: PointerEvent) {
      if (!filterOpen) {
        return
      }

      const target = event.target as Node
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false)
      }
    }

    window.addEventListener("pointerdown", onGlobalPointer)
    return () => window.removeEventListener("pointerdown", onGlobalPointer)
  }, [filterOpen])

  const derived = useMemo(() => {
    const startMs = fromInputDateToMsStart(dateRange.from)
    const endMs = fromInputDateToMsEnd(dateRange.to)

    const inDateRange = players.filter((player) => {
      if (startMs === null || endMs === null) {
        return true
      }

      if (typeof player.createdAt !== "number") {
        return false
      }

      return player.createdAt >= startMs && player.createdAt <= endMs
    })

    const ageOptions = Array.from(
      new Set(inDateRange.map((player) => displayAge(player.age)).filter((value) => value !== "Unknown"))
    ).sort((a, b) => a.localeCompare(b))

    const genderOptions = Array.from(
      new Set(inDateRange.map((player) => displayGender(player.gender)).filter((value) => value !== "Unknown"))
    ).sort((a, b) => a.localeCompare(b))

    const filteredRows = inDateRange.filter((player) => {
      const ageOk = selectedAgeFilter === "all" || displayAge(player.age) === selectedAgeFilter
      const genderOk =
        selectedGenderFilter === "all" || displayGender(player.gender) === selectedGenderFilter
      return ageOk && genderOk
    })

    const completionTimes = filteredRows
      .map((player) => player.quiz?.totalTimeMs)
      .filter((value): value is number => typeof value === "number")

    const avgTimeMs =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, value) => sum + value, 0) / completionTimes.length
        : 0

    const fastestTimeMs =
      completionTimes.length > 0
        ? Math.min(...completionTimes)
        : 0

    const negativeAnswersLogged = filteredRows.reduce((sum, player) => {
      const wrong = player.quiz?.totalWrongAnswers
      if (typeof wrong === "number") {
        return sum + wrong
      }
      return sum
    }, 0)

    return {
      ageOptions,
      genderOptions,
      rows: filteredRows,
      participants: filteredRows.length,
      avgTimeMs,
      fastestTimeMs,
      negativeAnswersLogged
    }
  }, [dateRange.from, dateRange.to, players, selectedAgeFilter, selectedGenderFilter])

  function downloadQuizCsv() {
    const headers = [
      "postcode",
      "age",
      "gender",
      "totalTime",
      "q1Time",
      "q2Time",
      "q3Time",
      "q4Time",
      "q5Time",
      "negativeAnswers"
    ]

    const rows = derived.rows.map((player) => {
      const times = { ...emptyTimes, ...(player.quiz?.questionTimesMs ?? {}) }
      const wrongAnswers = { ...emptyWrongAnswers, ...(player.quiz?.wrongAnswersCount ?? {}) }
      const negatives = getNegativeAnswerBadges(wrongAnswers)

      return [
        player.postcode ?? "",
        displayAge(player.age),
        displayGender(player.gender),
        msToDisplay(player.quiz?.totalTimeMs),
        msToDisplay(times.question1),
        msToDisplay(times.question2),
        msToDisplay(times.question3),
        msToDisplay(times.question4),
        msToDisplay(times.question5),
        negatives.join(" ")
      ]
        .map((value) => safeCsvCell(value))
        .join(",")
    })

    const csv = `${headers.join(",")}\n${rows.join("\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `quiz_data_${Date.now()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  function resetColumnFilters() {
    setSelectedAgeFilter("all")
    setSelectedGenderFilter("all")
  }

  function renderQuiz() {
    return (
      <>
        <section className={styles.kpiGrid}>
          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Participants</p>
            <p className={styles.kpiValue}>{derived.participants.toLocaleString("en-US")}</p>
          </article>

          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Avg. Completion Time</p>
            <p className={styles.kpiValue}>{msToDisplay(derived.avgTimeMs)}</p>
          </article>

          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Fastest Time Taken</p>
            <p className={styles.kpiValue}>{msToDisplay(derived.fastestTimeMs)}</p>
          </article>

          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Negative Answers Logged</p>
            <p className={styles.kpiValue}>{derived.negativeAnswersLogged.toLocaleString("en-US")}</p>
          </article>
        </section>

        <section className={styles.tableCard}>
          <header className={styles.tableTop}>
            <h2 className={styles.tableTitle}>Participant Submissions</h2>

            <div className={styles.tableControls}>
              <input
                type="date"
                className={styles.inlineControl}
                value={dateRange.from}
                onChange={(event) => {
                  const next = event.target.value
                  setDateRange((current) => ({ ...current, from: next }))
                }}
                aria-label="Filter from date"
              />
              <input
                type="date"
                className={styles.inlineControl}
                value={dateRange.to}
                onChange={(event) => {
                  const next = event.target.value
                  setDateRange((current) => ({ ...current, to: next }))
                }}
                aria-label="Filter to date"
              />

              <div className={styles.filterWrap} ref={filterRef}>
              <button type="button" className={styles.filterButton} onClick={() => setFilterOpen((v) => !v)}>
                Filter Columns
              </button>

              {filterOpen && (
                <div className={styles.filterPanel}>
                  <p className={styles.filterLabel}>Age</p>
                  <select
                    className={styles.filterControl}
                    value={selectedAgeFilter}
                    onChange={(event) => setSelectedAgeFilter(event.target.value)}
                  >
                    <option value="all">All Ages</option>
                    {derived.ageOptions.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>

                  <p className={styles.filterLabel}>Gender</p>
                  <select
                    className={styles.filterControl}
                    value={selectedGenderFilter}
                    onChange={(event) => setSelectedGenderFilter(event.target.value)}
                  >
                    <option value="all">All Genders</option>
                    {derived.genderOptions.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>

                  <div className={styles.filterActions}>
                    <button type="button" className={styles.ghostButton} onClick={resetColumnFilters}>
                      Clear
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={() => setFilterOpen(false)}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </header>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Postcode</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Total Time</th>
                  <th>Q1 Time</th>
                  <th>Q2 Time</th>
                  <th>Q3 Time</th>
                  <th>Q4 Time</th>
                  <th>Q5 Time</th>
                  <th>Negative Answers</th>
                </tr>
              </thead>

              <tbody>
                {derived.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className={styles.noData}>
                      No quiz submissions match the selected filters.
                    </td>
                  </tr>
                )}

                {derived.rows.map((player) => {
                  const times = { ...emptyTimes, ...(player.quiz?.questionTimesMs ?? {}) }
                  const wrongAnswers = { ...emptyWrongAnswers, ...(player.quiz?.wrongAnswersCount ?? {}) }
                  const badges = getNegativeAnswerBadgesWithCount(wrongAnswers)

                  return (
                    <tr key={player.id}>
                      <td>{player.postcode ?? "-"}</td>
                      <td>{displayAge(player.age)}</td>
                      <td>{displayGender(player.gender)}</td>
                      <td>{msToDisplay(player.quiz?.totalTimeMs)}</td>
                      <td>{msToDisplay(times.question1)}</td>
                      <td>{msToDisplay(times.question2)}</td>
                      <td>{msToDisplay(times.question3)}</td>
                      <td>{msToDisplay(times.question4)}</td>
                      <td>{msToDisplay(times.question5)}</td>
                      <td>
                        {badges.length > 0 ? (
                          <div className={styles.badgeList}>
                            {badges.map((badge) => (
                              <span
                                key={badge}
                                className={styles.badge}
                                title={`No. of times answer marked wrong in ${badge.split(":")[0]}`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.subtle}>None</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  function renderApplicationUsage() {
    return (
      <>
        <section className={styles.appUsageTop}>
          <p className={styles.breadcrumb}>Applications › Water Cycle App</p>
          <h2 className={styles.usageTitle}>Application Usage</h2>
          <p className={styles.usageSubtitle}>
            Real-time metrics tracking the total launches of the interactive water cycle experience.
          </p>
        </section>

        <section className={styles.usageFilters}>
          <input
            className={styles.inlineControl}
            type="text"
            value={formatRangeLabel(dateRange)}
            readOnly
            aria-label="Selected date range"
          />
        </section>

        <section className={styles.usageCard}>
          <p className={styles.usageCardLabel}>TOTAL APPLICATION RUNS</p>
          <p className={styles.usageCardValue}>8,492</p>
        </section>
      </>
    )
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h1 className={styles.brandText}>Sydney Water</h1>
        </div>

        <section className={styles.navSection}>
          <p className={styles.navLabel}>APPLICATIONS</p>

          <nav className={styles.navList}>
            <button
              type="button"
              className={`${styles.navButton} ${activeView === "quiz" ? styles.navButtonActive : ""}`}
              onClick={() => setActiveView("quiz")}
            >
              Quiz
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${activeView === "water_cycle_app" ? styles.navButtonActive : ""}`}
              onClick={() => setActiveView("water_cycle_app")}
            >
              Water Cycle App
            </button>
          </nav>
        </section>
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>{activeView === "quiz" ? "Quiz Data" : "Application Usage"}</h2>

          {activeView === "quiz" && (
            <div className={styles.headerTools}>
              <button type="button" className={styles.exportButton} onClick={downloadQuizCsv}>
                Export CSV
              </button>
            </div>
          )}
        </header>

        <section className={styles.content}>
          {readError && <p className={styles.error}>Firebase read error: {readError}</p>}
          {activeView === "quiz" ? renderQuiz() : renderApplicationUsage()}
        </section>
      </section>
    </main>
  )
}

export default Dashboard
