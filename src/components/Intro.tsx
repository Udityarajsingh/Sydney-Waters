import { memo, useState, useCallback, useEffect, useRef } from "react"
import styles from "./Intro.module.css"

import { ref, push, set } from "firebase/database"
import { db } from "../firebase"

import clouds from "../assets/clouds.svg"
import ufo from "../assets/ufo_whole.svg"
import ufoBeam from "../assets/ufo_light.svg"

import alienLeft from "../assets/alien_left.svg"
import alienMiddle from "../assets/alien_middle.svg"
import alienRight from "../assets/alien_right.svg"

import waterText from "../assets/water.svg"
import contentText from "../assets/content.svg"
import tapPlay from "../assets/tap_play.svg"
import submitAndPlay from "../assets/submit_and_play.svg"
import buttonBox from "../assets/button_box.svg"
import backButton from "../assets/back_button.svg"

import ageImg from "../assets/extra/Age.svg"
import genderImg from "../assets/extra/Gender.svg"
import postcodeImg from "../assets/extra/Postcode.svg"

import arrowDown from "../assets/extra/arrow_down.svg"

import below12 from "../assets/below_12.svg"
import age13to17 from "../assets/13_to_17.svg"
import age18to24 from "../assets/extra/18to24.svg"
import age25to34 from "../assets/extra/25to34.svg"
import age35to44 from "../assets/extra/35to44.svg"
import age45to54 from "../assets/extra/45to54.svg"
import above55 from "../assets/above_55.svg"

import maleImg from "../assets/extra/male.svg"
import femaleImg from "../assets/extra/female.svg"
import nonBinaryImg from "../assets/non_binary.svg"
import preferNotToSayImg from "../assets/prefer_not_to_say.svg"

import line from "../assets/extra/line.svg"
import aboutMeSvg from "../assets/About_me.svg"

type IntroProps = {
  onStart: (playerId: string) => void
  initialShowForm?: boolean
  onTapToPlay?: () => void
  onReturnToTapScreen?: () => void
}

function IntroComponent({ onStart, initialShowForm = false, onTapToPlay, onReturnToTapScreen }: IntroProps) {
  const [openAge,setOpenAge] = useState(false)
  const [openGender,setOpenGender] = useState(false)
  const [showForm,setShowForm] = useState(initialShowForm)
  const keyboardRef = useRef<HTMLDivElement>(null)
  const [form,setForm] = useState({
    age:"",
    gender:"",
    postcode:""
  })
  const [showKeyboard,setShowKeyboard] = useState(false)
  const handleChange = useCallback((key:string,value:string)=>{
    setForm(prev => ({
      ...prev,
      [key]:value
    }))
  },[])
  const [ageImgSelected,setAgeImgSelected] = useState(ageImg)
const [genderImgSelected,setGenderImgSelected] = useState(genderImg)
useEffect(()=>{

const handleClickOutside = (e:any)=>{

if(!keyboardRef.current) return

if(keyboardRef.current.contains(e.target)) return

setShowKeyboard(false)

}

document.addEventListener("mousedown",handleClickOutside)

return ()=>{
document.removeEventListener("mousedown",handleClickOutside)
}

},[])
  const handleSubmit = async () => {

if(!form.age || !form.gender || form.postcode.length === 0 || form.postcode.length > 8){
return
}

    try{

      const usersRef = ref(db,"players")

      const newPlayerRef = push(usersRef)

      await set(newPlayerRef,{
        age:form.age,
        gender:form.gender,
        postcode:form.postcode,
        createdAt:Date.now(),
        quiz: {
          startedAt: null,
          endedAt: null,
          totalTimeMs: null,
          completed: false,
          questionTimesMs: {
            question1: null,
            question2: null,
            question3: null,
            question4: null,
            question5: null
          }
        }
      })

      if (!newPlayerRef.key) {
        return
      }

      onStart(newPlayerRef.key)

    }catch(err){
      console.error("Firebase write error",err)
    }

  }

  const handleBackFromAbout = useCallback(() => {
    setOpenAge(false)
    setOpenGender(false)
    setShowKeyboard(false)
    setShowForm(false)
    onReturnToTapScreen?.()
  }, [onReturnToTapScreen])

  const handleTapToPlay = useCallback(() => {
    onTapToPlay?.()
    setShowForm(true)
  }, [onTapToPlay])

  return(

<section className={styles.container}>

{showForm && (
<button
type="button"
className={styles.aboutBackButton}
onClick={handleBackFromAbout}
>
<img src={backButton} className={styles.aboutBackButtonImage} alt="Back" />
</button>
)}

{/* clouds */}
<img src={clouds} className={styles.clouds} alt="" />

{/* ufo */}
<img src={ufoBeam} className={styles.ufoBeam} />
<img src={ufo} className={styles.ufo} alt="" />

{/* text block */}
<div className={styles.textBlock}>

<img
src={waterText}
className={`${styles.waterTitle} ${showForm ? styles.moveUp : ""}`}
/>

<img
src={contentText}
className={`${styles.contentText} ${showForm ? styles.moveUp : ""}`}
/>

{/* play button */}
{!showForm && (

<div
className={styles.playWrapper}
onClick={handleTapToPlay}
>

<img src={buttonBox} className={styles.buttonBox}/>
<img src={tapPlay} className={styles.tapPlay}/>

</div>

)}

{/* form */}
{showForm && (

<div className={styles.formBlock}>

<img src={aboutMeSvg} className={styles.aboutMeImage} alt="About me" />

{/* AGE */}
<div className={styles.dropdown} onClick={()=>{
setOpenAge(prev => {
  const next = !prev
  if(next){
    setOpenGender(false)
  }
  return next
})
}}>
  <img
src={ageImgSelected}
className={`${styles.dropdownLabel} ${ageImgSelected === ageImg ? styles.ageDefaultLabel : ""} ${ageImgSelected === below12 || ageImgSelected === age13to17 ? styles.ageCompactSelectedLabel : ""}`}
/>
  <img src={arrowDown} className={styles.dropdownArrow}/>
</div>

{openAge && (
<div className={`${styles.dropdownMenu} ${styles.ageDropdownMenu}`}>

<img
src={below12}
className={`${styles.option} ${styles.optionBelow12}`}
onClick={()=>{handleChange("age","below_12")
setAgeImgSelected(below12)
setOpenAge(false)
}}
/>

<img src={line} className={styles.line}/>

<img
src={age13to17}
className={`${styles.option} ${styles.option13To17}`}
onClick={()=>{handleChange("age","13_to_17")
setAgeImgSelected(age13to17)
setOpenAge(false)
}}
/>

<img src={line} className={styles.line}/>

<img src={age18to24}
className={styles.option}
onClick={()=>{handleChange("age","18to24")
setAgeImgSelected(age18to24)
setOpenAge(false)
}}
/>

<img src={line} className={styles.line}/>

<img src={age25to34}
className={styles.option}
onClick={()=>{handleChange("age","25to34")
setAgeImgSelected(age25to34)
setOpenAge(false)}}
/>

<img src={line} className={styles.line}/>

<img src={age35to44}
className={styles.option}
onClick={()=>{handleChange("age","35to44")
setAgeImgSelected(age35to44)
setOpenAge(false)}}
/>

<img src={line} className={styles.line}/>

<img src={age45to54}
className={styles.option}
onClick={()=>{handleChange("age","45to54")
setAgeImgSelected(age45to54)
setOpenAge(false)}}
/>

<img src={line} className={styles.line}/>

<img src={above55}
className={styles.option}
onClick={()=>{handleChange("age","above_55")
setAgeImgSelected(above55)
setOpenAge(false)}}
/>

</div>
)}

{/* GENDER */}

<div className={`${styles.dropdown} ${styles.genderDropdown}`} onClick={()=>{
setOpenGender(prev => {
  const next = !prev
  if(next){
    setOpenAge(false)
  }
  return next
})
}}>
  <img
src={genderImgSelected}
className={`${styles.dropdownLabel} ${styles.genderLabel} ${genderImgSelected !== genderImg ? styles.genderSelectedLabel : ""}`}
/>
  <img src={arrowDown} className={styles.dropdownArrow}/>
</div>

{openGender && (

<div className={`${styles.dropdownMenu} ${styles.genderDropdownMenu}`}>

<img
src={maleImg}
className={styles.option}
onClick={()=>{
handleChange("gender","male")
setGenderImgSelected(maleImg)
setOpenGender(false)
}}
/>

<img src={line} className={styles.line}/>

<img
src={femaleImg}
className={styles.option}
onClick={()=>{handleChange("gender","female")
setGenderImgSelected(femaleImg)
setOpenGender(false)}}
/>

<img src={line} className={styles.line}/>

<img
src={nonBinaryImg}
className={styles.option}
onClick={()=>{handleChange("gender","non_binary")
setGenderImgSelected(nonBinaryImg)
setOpenGender(false)}}
/>

<img src={line} className={styles.line}/>

<img
src={preferNotToSayImg}
className={styles.option}
onClick={()=>{handleChange("gender","prefer_not_to_say")
setGenderImgSelected(preferNotToSayImg)
setOpenGender(false)}}
/>

</div>

)}

{/* POSTCODE */}

<div
className={styles.postcodeBox}
onClick={()=>setShowKeyboard(true)}
>

{form.postcode === "" && (
<img
src={postcodeImg}
className={`${styles.dropdownLabel} ${styles.postcodeLabel}`}
/>
)}

<input
className={styles.postcodeInput}
value={form.postcode}
readOnly
/>

</div>

{showKeyboard && (

<div ref={keyboardRef} className={styles.keypad}>

{[1,2,3,4,5,6,7,8,9].map(num => (

<button
key={num}
className={styles.key}
onClick={()=>{

if(form.postcode.length < 8){
handleChange("postcode",form.postcode + num)
}

}}
>
{num}
</button>

))}

<button
className={styles.tickKey}
onClick={()=>setShowKeyboard(false)}
>
✓
</button>

<button
className={styles.key}
onClick={()=>handleChange("postcode",form.postcode + "0")}
>
0
</button>

<button
className={styles.backspaceKey}
onClick={()=>handleChange("postcode",form.postcode.slice(0,-1))}
>
⌫
</button>

</div>

)}


<button
className={styles.submit}
onClick={handleSubmit}
>
<img src={submitAndPlay} alt="Submit and play" className={styles.submitIcon} />
</button>

</div>

)}

</div>

{/* aliens */}
<img src={alienLeft} className={styles.alienLeft} alt="" />
<img src={alienMiddle} className={styles.alienMiddle} alt="" />
<img src={alienRight} className={styles.alienRight} alt="" />

</section>

  )
}

export const Intro = memo(IntroComponent)