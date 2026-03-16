import { useCallback, useEffect, useRef, useState } from "react"
import { Intro } from "./components/Intro"
import { Question } from "./components/Question"
import { Result } from "./components/Result"
import { Dashboard } from "./components/Dashboard"
import { db } from "./firebase"
import { ref, update } from "firebase/database"
import styles from "./styles/Canvas.module.css"
import backgroundMusic from "./assets/background_music.mpeg"

type Screen = "intro" | "question" | "result"
type AppMode = "quiz" | "dashboard"

type QuizQuestionKey =
  | "question1"
  | "question2"
  | "question3"
  | "question4"
  | "question5"

const questionKeyByIndex: Record<number, QuizQuestionKey> = {
  0: "question1",
  1: "question2",
  2: "question3",
  3: "question4",
  4: "question5"
}

function App(){

  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef<number | null>(null)
  const currentQuestionStartRef = useRef<number | null>(null)
  const currentQuestionIndexRef = useRef<number | null>(null)
  const recordedQuestionTimesRef = useRef<Record<QuizQuestionKey, boolean>>({
    question1: false,
    question2: false,
    question3: false,
    question4: false,
    question5: false
  })
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)

  const [mode] = useState<AppMode>(() => {
    if (window.location.pathname.toLowerCase() === "/dashboard") {
      return "dashboard"
    }
    return "quiz"
  })

  const [screen,setScreen] = useState<Screen>("intro")
  const [questionIndex,setQuestionIndex] = useState(0)
  const [activePlayerId,setActivePlayerId] = useState<string | null>(null)
  const [introStartsOnAbout,setIntroStartsOnAbout] = useState(false)

  const resetTimerState = useCallback(()=>{
    timerStartRef.current = null
    currentQuestionStartRef.current = null
    currentQuestionIndexRef.current = null
    recordedQuestionTimesRef.current = {
      question1: false,
      question2: false,
      question3: false,
      question4: false,
      question5: false
    }
  },[])

  const handleStart = useCallback((playerId: string)=>{
    resetTimerState()
    setActivePlayerId(playerId)
    setIntroStartsOnAbout(false)
    setQuestionIndex(0)
    setScreen("question")
  },[resetTimerState])

  const recordCompletedQuestionTime = useCallback(async(questionIdx: number)=>{
    if (!activePlayerId) {
      return
    }

    const startedAt = currentQuestionStartRef.current
    const questionKey = questionKeyByIndex[questionIdx]

    if (!questionKey || startedAt === null) {
      return
    }

    if (recordedQuestionTimesRef.current[questionKey]) {
      return
    }

    const elapsedMs = Date.now() - startedAt
    const playerRef = ref(db,`players/${activePlayerId}`)

    await update(playerRef, {
      [`quiz/questionTimesMs/${questionKey}`]: elapsedMs
    })
    recordedQuestionTimesRef.current[questionKey] = true
  },[activePlayerId])

  const finishQuizSession = useCallback(async()=>{
    if (!activePlayerId || timerStartRef.current === null) {
      return
    }

    const endedAt = Date.now()
    const playerRef = ref(db,`players/${activePlayerId}`)

    await update(playerRef, {
      "quiz/endedAt": endedAt,
      "quiz/totalTimeMs": endedAt - timerStartRef.current,
      "quiz/completed": true
    })
  },[activePlayerId])

  const handleNextQuestion = useCallback(()=>{
    setQuestionIndex((current)=>{
      if(current >= 5){
        setScreen("result")
        return current
      }
      return current + 1
    })
  },[])

  const handleQuestionCompleted = useCallback((completedQuestionIndex: number)=>{
    void recordCompletedQuestionTime(completedQuestionIndex)

    if (completedQuestionIndex === 4) {
      void finishQuizSession()
    }
  },[finishQuizSession,recordCompletedQuestionTime])

  const handleRestart = useCallback(()=>{
    resetTimerState()
    setActivePlayerId(null)
    setIntroStartsOnAbout(false)
    setQuestionIndex(0)
    setScreen("intro")
    const music = bgMusicRef.current
    if (music) {
      music.pause()
      music.currentTime = 0
    }
  },[resetTimerState])

  const handleBackQuestion = useCallback(()=>{
    setQuestionIndex((current)=>{
      if (current === 0) {
        resetTimerState()
        setActivePlayerId(null)
        setIntroStartsOnAbout(true)
        setScreen("intro")
        return 0
      }
      return current - 1
    })
  },[resetTimerState])

  const handleHomeFromQuestion = useCallback(()=>{
    handleRestart()
  },[handleRestart])

  const handleTapToPlay = useCallback(()=>{
    const music = bgMusicRef.current
    if (!music) {
      return
    }

    music.volume = 0.08
    music.currentTime = 0
    void music.play().catch(() => {
      // Ignore autoplay-block rejections.
    })
  },[])

  const handleReturnToTapScreen = useCallback(()=>{
    const music = bgMusicRef.current
    if (!music) {
      return
    }

    music.pause()
    music.currentTime = 0
  },[])

  useEffect(()=>{
    if (screen !== "question" || !activePlayerId) {
      return
    }

    const now = Date.now()
    currentQuestionIndexRef.current = questionIndex
    currentQuestionStartRef.current = now

    if (questionIndex === 0 && timerStartRef.current === null) {
      timerStartRef.current = now
      const playerRef = ref(db,`players/${activePlayerId}`)
      void update(playerRef, {
        "quiz/startedAt": now,
        "quiz/completed": false
      })
    }
  },[activePlayerId,questionIndex,screen])

  useEffect(()=>{

    function scaleCanvas(){

      const wrapper = wrapperRef.current
      if(!wrapper) return

      const scale = Math.min(
        window.innerWidth / 387,
        window.innerHeight / 688
      )

      wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`
    }

    scaleCanvas()

    window.addEventListener("resize",scaleCanvas)

    return ()=> window.removeEventListener("resize",scaleCanvas)

  },[])

  useEffect(()=>{
    const music = new Audio(backgroundMusic)
    music.loop = true
    music.preload = "auto"
    music.volume = 0.18
    bgMusicRef.current = music

    return ()=>{
      music.pause()
      bgMusicRef.current = null
    }
  },[])

  if (mode === "dashboard") {
    return <Dashboard />
  }

  return(

    <div ref={wrapperRef} className={styles.canvasWrapper}>

      <div className={styles.canvas}>

        {screen === "intro" && (
          <Intro
            onStart={handleStart}
            initialShowForm={introStartsOnAbout}
            onTapToPlay={handleTapToPlay}
            onReturnToTapScreen={handleReturnToTapScreen}
          />
        )}

        {screen === "question" && (
          <Question
            questionIndex={questionIndex}
            onQuestionCompleted={handleQuestionCompleted}
            onNext={handleNextQuestion}
            onRestart={handleRestart}
            onBack={handleBackQuestion}
            onHome={handleHomeFromQuestion}
          />
        )}

        {screen === "result" && (
          <Result onRestart={handleRestart}/>
        )}

      </div>

    </div>

  )
}

export default App