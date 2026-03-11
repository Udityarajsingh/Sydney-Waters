import { memo, useState, useCallback, useEffect, useRef } from "react"
import styles from "./Intro.module.css"

import { ref, push } from "firebase/database"
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
import buttonBox from "../assets/button_box.svg"

import ageImg from "../assets/extra/Age.svg"
import genderImg from "../assets/extra/Gender.svg"
import postcodeImg from "../assets/extra/Postcode.svg"

import arrowDown from "../assets/extra/arrow_down.svg"

import under18 from "../assets/extra/under_18.svg"
import age18to24 from "../assets/extra/18to24.svg"
import age25to34 from "../assets/extra/25to34.svg"
import age35to44 from "../assets/extra/35to44.svg"
import age45to54 from "../assets/extra/45to54.svg"

import maleImg from "../assets/extra/male.svg"
import femaleImg from "../assets/extra/female.svg"

import line from "../assets/extra/line.svg"
import gradientBg from "../assets/background_gradient.webp"
import quizBg from "../assets/quiz_one_background.webp"
type IntroProps = {
  onStart: () => void
}

function IntroComponent({ onStart }: IntroProps) {
  const [openAge,setOpenAge] = useState(false)
  const [openGender,setOpenGender] = useState(false)
  const [showForm,setShowForm] = useState(false)
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

      await push(usersRef,{
        age:form.age,
        gender:form.gender,
        postcode:form.postcode,
        createdAt:Date.now()
      })

      
      onStart()

    }catch(err){
      console.error("Firebase write error",err)
    }

  }

  return(

<section className={styles.container}>

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
onClick={()=>setShowForm(true)}
>

<img src={buttonBox} className={styles.buttonBox}/>
<img src={tapPlay} className={styles.tapPlay}/>

</div>

)}

{/* form */}
{showForm && (

<div className={styles.formBlock}>

<p className={styles.about}>About me</p>

{/* AGE */}
<div className={styles.dropdown} onClick={()=>setOpenAge(!openAge)}>
  <img
src={ageImgSelected}
className={`${styles.dropdownLabel} ${ageImgSelected === ageImg ? styles.ageDefaultLabel : ""}`}
/>
  <img src={arrowDown} className={styles.dropdownArrow}/>
</div>

{openAge && (
<div className={styles.dropdownMenu}>

<img
src={under18}
className={`${styles.option} ${styles.optionUnder18}`}
onClick={()=>{handleChange("age","under18")
setAgeImgSelected(under18)
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

</div>
)}

{/* GENDER */}

<div className={styles.dropdown} onClick={()=>setOpenGender(!openGender)}>
  <img
src={genderImgSelected}
className={`${styles.dropdownLabel} ${styles.genderLabel} ${genderImgSelected !== genderImg ? styles.genderSelectedLabel : ""}`}
/>
  <img src={arrowDown} className={styles.dropdownArrow}/>
</div>

{openGender && (

<div className={styles.dropdownMenu}>

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

<span className={styles.keySpacer} aria-hidden="true" />

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
Submit and play
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