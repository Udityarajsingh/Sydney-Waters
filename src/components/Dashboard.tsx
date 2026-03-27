import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { onValue, ref } from "firebase/database"
import { collection, onSnapshot } from "firebase/firestore"
import { db, firestoreDb } from "../firebase"
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

type DailyStatsRecord = {
  id: string
  date: string
  dateMs: number | null
  completeRuns: number
  incompleteRuns: number
  totalRuns: number
}

type ApplicationRunRecord = {
  id: string
  dateString: string
  timeString: string
  status: "complete" | "incomplete" | "unknown"
  dateMs: number | null
}

type DateRangeValue = {
  from: string
  to: string
}

const AGE_FILTER_OPTIONS = [
  "below 12",
  "13 to 17",
  "18 to 24",
  "25 to 34",
  "35 to 44",
  "45 to 54",
  "Above 55"
]

const GENDER_FILTER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"]

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
  if (
    normalized === "non_binary" ||
    normalized === "non-binary" ||
    normalized === "non binary" ||
    normalized === "nonbinary"
  ) {
    return "Non-binary"
  }
  if (normalized === "prefer_not_to_say" || normalized === "prefer not to say") {
    return "Prefer not to say"
  }
  return gender && gender.length > 0 ? gender : "Unknown"
}

function displayAge(age?: string) {
  const normalized = (age ?? "").toLowerCase().trim()
  if (!normalized) return "Unknown"
  if (normalized === "below_12" || normalized === "below 12") return "below 12"
  if (normalized === "13_to_17" || normalized === "13 to 17") return "13 to 17"
  if (normalized === "under18" || normalized === "under_18" || normalized === "under 18") return "Under 18"
  if (normalized === "18to24" || normalized === "18_to_24" || normalized === "18 to 24") return "18 to 24"
  if (normalized === "25to34" || normalized === "25_to_34" || normalized === "25 to 34") return "25 to 34"
  if (normalized === "35to44" || normalized === "35_to_44" || normalized === "35 to 44") return "35 to 44"
  if (normalized === "45to54" || normalized === "45_to_54" || normalized === "45 to 54") return "45 to 54"
  if (normalized === "above55" || normalized === "above_55" || normalized === "above 55") return "Above 55"
  if (normalized === "prefer_not_to_say" || normalized === "prefer not to say") return "Prefer not to say"
  return age ?? "Unknown"
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

function fromInputDateToMsStart(value: string) {
  if (!value) return null
  return new Date(`${value}T00:00:00`).getTime()
}

function fromInputDateToMsEnd(value: string) {
  if (!value) return null
  return new Date(`${value}T23:59:59.999`).getTime()
}

function parseSafeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function dateStringToStartMs(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function resolveTimestampMs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const millis = (value as { toMillis: () => number }).toMillis()
    return Number.isFinite(millis) ? millis : null
  }

  return null
}

function normalizeRunStatus(value: unknown): "complete" | "incomplete" | "unknown" {
  if (typeof value !== "string") {
    return "unknown"
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === "complete") {
    return "complete"
  }
  if (normalized === "incomplete") {
    return "incomplete"
  }

  return "unknown"
}

function formatDateAndTime(value: number | null) {
  if (value === null) {
    return { date: "-", time: "-" }
  }

  const date = new Date(value)
  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date)

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date)

  return {
    date: dateLabel,
    time: timeLabel
  }
}

function displayRunStatus(status: "complete" | "incomplete" | "unknown") {
  if (status === "complete") {
    return "Complete"
  }
  if (status === "incomplete") {
    return "Incomplete"
  }
  return "Unknown"
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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<DashboardView>("quiz")
  const [players, setPlayers] = useState<PlayerWithId[]>([])
  const [readError, setReadError] = useState<string | null>(null)
  const [usageReadError, setUsageReadError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedAgeFilter, setSelectedAgeFilter] = useState("all")
  const [selectedGenderFilter, setSelectedGenderFilter] = useState("all")
  const [dailyStats, setDailyStats] = useState<DailyStatsRecord[]>([])
  const [applicationRuns, setApplicationRuns] = useState<ApplicationRunRecord[]>([])
  const [appStatusFilter, setAppStatusFilter] = useState<"all" | "complete" | "incomplete">("all")

  const filterRef = useRef<HTMLDivElement | null>(null)

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: "",
    to: ""
  })

  const [appDateRange, setAppDateRange] = useState<DateRangeValue>({
    from: "",
    to: ""
  })

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (username === "Sydney@admin" && password === "sydney#2026") {
      setIsAuthenticated(true)
      setAuthError(null)
      return
    }

    setAuthError("Invalid credentials")
  }

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
    const dailyStatsCollection = collection(firestoreDb, "dailyStats")
    const applicationRunsCollection = collection(firestoreDb, "applicationRuns")

    const unsubscribeDailyStats = onSnapshot(
      dailyStatsCollection,
      (snapshot) => {
        setUsageReadError(null)
        const rows: DailyStatsRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>
          const date = typeof data.date === "string" ? data.date : doc.id
          const dateMs = dateStringToStartMs(date)
          const completeRuns = parseSafeNumber(data.completeRuns)
          const incompleteRuns = parseSafeNumber(data.incompleteRuns)
          const totalRunsRaw = parseSafeNumber(data.totalRuns)
          const totalRuns = totalRunsRaw > 0 ? totalRunsRaw : completeRuns + incompleteRuns

          return {
            id: doc.id,
            date,
            dateMs,
            completeRuns,
            incompleteRuns,
            totalRuns
          }
        })

        rows.sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0))

        setDailyStats(rows)
      },
      (error) => {
        setDailyStats([])
        setUsageReadError(error.message)
      }
    )

    const unsubscribeApplicationRuns = onSnapshot(
      applicationRunsCollection,
      (snapshot) => {
        setUsageReadError(null)

        const rows: ApplicationRunRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>
          const dateFromString =
            typeof data.dateString === "string" ? dateStringToStartMs(data.dateString) : null
          const dateFromTimestamp = resolveTimestampMs(data.timestamp)
          const dateMs = dateFromString ?? dateFromTimestamp
          const dateAndTime = formatDateAndTime(dateMs)

          return {
            id: doc.id,
            dateString: dateAndTime.date,
            timeString: dateAndTime.time,
            status: normalizeRunStatus(data.status),
            dateMs
          }
        })

        rows.sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0))

        setApplicationRuns(rows)
      },
      (error) => {
        setApplicationRuns([])
        setUsageReadError(error.message)
      }
    )

    return () => {
      unsubscribeDailyStats()
      unsubscribeApplicationRuns()
    }
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
    if (appDateRange.from || appDateRange.to) {
      return
    }

    const allDates = [
      ...dailyStats.map((row) => row.dateMs),
      ...applicationRuns.map((row) => row.dateMs)
    ].filter((value): value is number => typeof value === "number")

    if (allDates.length === 0) {
      return
    }

    const latestMs = Math.max(...allDates)
    const latestDate = new Date(latestMs)
    const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0)

    setAppDateRange({
      from: toInputDate(monthStart.getTime()),
      to: toInputDate(monthEnd.getTime())
    })
  }, [applicationRuns, appDateRange.from, appDateRange.to, dailyStats])

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

    const ageOptions = AGE_FILTER_OPTIONS
    const genderOptions = GENDER_FILTER_OPTIONS

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

  const appUsageDerived = useMemo(() => {
    const startMs = fromInputDateToMsStart(appDateRange.from)
    const endMs = fromInputDateToMsEnd(appDateRange.to)

    const inRange = (dateMs: number | null) => {
      if (dateMs === null) {
        return false
      }
      if (startMs === null || endMs === null) {
        return true
      }
      return dateMs >= startMs && dateMs <= endMs
    }

    const runsInDateRange = applicationRuns.filter((row) => inRange(row.dateMs))
    const runsFilteredByStatus =
      appStatusFilter === "all"
        ? runsInDateRange
        : runsInDateRange.filter((row) => row.status === appStatusFilter)

    const dailyStatsInDateRange = dailyStats.filter((row) => inRange(row.dateMs))

    const completeFromRuns = runsInDateRange.reduce((sum, row) => {
      return row.status === "complete" ? sum + 1 : sum
    }, 0)
    const incompleteFromRuns = runsInDateRange.reduce((sum, row) => {
      return row.status === "incomplete" ? sum + 1 : sum
    }, 0)

    const hasDailyStats = dailyStatsInDateRange.length > 0
    const completeRuns = hasDailyStats
      ? dailyStatsInDateRange.reduce((sum, row) => sum + row.completeRuns, 0)
      : completeFromRuns
    const incompleteRuns = hasDailyStats
      ? dailyStatsInDateRange.reduce((sum, row) => sum + row.incompleteRuns, 0)
      : incompleteFromRuns
    const totalRuns = hasDailyStats
      ? dailyStatsInDateRange.reduce((sum, row) => sum + row.totalRuns, 0)
      : completeRuns + incompleteRuns

    const filteredRuns =
      appStatusFilter === "all"
        ? totalRuns
        : appStatusFilter === "complete"
          ? completeRuns
          : incompleteRuns

    return {
      runsInDateRange,
      runsFilteredByStatus,
      dailyStatsInDateRange,
      totalRuns,
      completeRuns,
      incompleteRuns,
      filteredRuns
    }
  }, [appDateRange.from, appDateRange.to, appStatusFilter, applicationRuns, dailyStats])

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

        <section className={styles.kpiGrid}>
          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Completed Runs</p>
            <p className={styles.kpiValue}>{appUsageDerived.completeRuns.toLocaleString("en-US")}</p>
          </article>
          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Incomplete Runs</p>
            <p className={styles.kpiValue}>{appUsageDerived.incompleteRuns.toLocaleString("en-US")}</p>
          </article>
          <article className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Total Runs</p>
            <p className={styles.kpiValue}>{appUsageDerived.totalRuns.toLocaleString("en-US")}</p>
          </article>
        </section>

        <section className={styles.tableCard} style={{ marginBottom: "24px" }}>
          <header className={styles.tableTop}>
            <h2 className={styles.tableTitle}>Daily Stats</h2>
          </header>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Complete Runs</th>
                  <th>Incomplete Runs</th>
                  <th>Total Runs</th>
                </tr>
              </thead>
              <tbody>
                {appUsageDerived.dailyStatsInDateRange.length === 0 && (
                  <tr>
                    <td colSpan={4} className={styles.noData}>
                      No daily stats match the selected date range.
                    </td>
                  </tr>
                )}

                {appUsageDerived.dailyStatsInDateRange.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.completeRuns.toLocaleString("en-US")}</td>
                    <td>{row.incompleteRuns.toLocaleString("en-US")}</td>
                    <td>{row.totalRuns.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.tableCard}>
          <header className={styles.tableTop}>
            <h2 className={styles.tableTitle}>Application Runs</h2>
            <div className={styles.tableControls}>
              <input
                type="date"
                className={styles.inlineControl}
                value={appDateRange.from}
                onChange={(event) => {
                  const next = event.target.value
                  setAppDateRange((current) => ({ ...current, from: next }))
                }}
                aria-label="Filter water cycle from date"
              />
              <input
                type="date"
                className={styles.inlineControl}
                value={appDateRange.to}
                onChange={(event) => {
                  const next = event.target.value
                  setAppDateRange((current) => ({ ...current, to: next }))
                }}
                aria-label="Filter water cycle to date"
              />
              <select
                className={styles.inlineControl}
                value={appStatusFilter}
                onChange={(event) =>
                  setAppStatusFilter(event.target.value as "all" | "complete" | "incomplete")
                }
                aria-label="Filter water cycle by completion status"
              >
                <option value="all">All Statuses</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
          </header>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Run ID</th>
                </tr>
              </thead>
              <tbody>
                {appUsageDerived.runsFilteredByStatus.length === 0 && (
                  <tr>
                    <td colSpan={3} className={styles.noData}>
                      No application runs match the selected filters.
                    </td>
                  </tr>
                )}

                {appUsageDerived.runsFilteredByStatus.map((row) => (
                  <tr key={row.id}>
                    <td>{row.dateString}</td>
                    <td>{displayRunStatus(row.status)}</td>
                    <td>{row.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.page}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <h1 className={styles.brandText}>Sydney Water</h1>
          </div>

          <section className={styles.navSection}>
            <p className={styles.navLabel}>APPLICATIONS</p>

            Dashboard Login
          </section>
        </aside>

        <section className={styles.main}>
          

          <section className={`${styles.content} ${styles.loginContent}`}>
            <div className={styles.loginPanel}>
              <div className={styles.loginCard}>
                <h3 className={styles.loginTitle}>Admin Login</h3>

                <form className={styles.loginForm} onSubmit={handleLoginSubmit}>
                  <input
                    type="text"
                    className={styles.loginInput}
                    placeholder="User"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    aria-label="Dashboard username"
                  />
                  <div className={styles.passwordField}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`${styles.loginInput} ${styles.passwordInput}`}
                      placeholder="Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      aria-label="Dashboard password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <svg viewBox="0 0 24 24" className={styles.eyeIcon} aria-hidden="true" focusable="false">
                        <path d="M12 5C6.8 5 2.4 8.1 1 12c1.4 3.9 5.8 7 11 7s9.6-3.1 11-7c-1.4-3.9-5.8-7-11-7Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Z" />
                        <circle cx="12" cy="12" r="2.2" />
                      </svg>
                    </button>
                  </div>
                  <button type="submit" className={styles.loginButton}>
                    Login
                  </button>
                </form>

                {authError && <p className={styles.loginError}>{authError}</p>}
              </div>
            </div>
          </section>
        </section>
      </main>
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
          {usageReadError && activeView === "water_cycle_app" && (
            <p className={styles.error}>Firestore read error: {usageReadError}</p>
          )}
          {activeView === "quiz" ? renderQuiz() : renderApplicationUsage()}
        </section>
      </section>
    </main>
  )
}

export default Dashboard
