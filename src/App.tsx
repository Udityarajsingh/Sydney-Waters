import { useCallback, useEffect, useRef, useState } from "react"
import { Intro } from "./components/Intro"
import { Question } from "./components/Question"
import { Result } from "./components/Result"
import styles from "./styles/Canvas.module.css"

type Screen = "intro" | "question" | "result"

function App(){

  const wrapperRef = useRef<HTMLDivElement>(null)

  const [screen,setScreen] = useState<Screen>("intro")
  const [questionIndex,setQuestionIndex] = useState(0)

  const handleStart = useCallback(()=>{
    setQuestionIndex(0)
    setScreen("question")
  },[])

  const handleNextQuestion = useCallback(()=>{
    setQuestionIndex((current)=>{
      if(current >= 5){
        setScreen("result")
        return current
      }
      return current + 1
    })
  },[])

  const handleRestart = useCallback(()=>{
    setQuestionIndex(0)
    setScreen("intro")
  },[])

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

  return(

    <div ref={wrapperRef} className={styles.canvasWrapper}>

      <div className={styles.canvas}>

        {screen === "intro" && <Intro onStart={handleStart}/>}

        {screen === "question" && (
          <Question
            key={questionIndex}
            questionIndex={questionIndex}
            onNext={handleNextQuestion}
            onRestart={handleRestart}
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