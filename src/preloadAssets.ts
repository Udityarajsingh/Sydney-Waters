import gradientBg from "./assets/background_gradient.webp"
import quiz1 from "./assets/quiz_one_background.webp"
import quiz2 from "./assets/quiz_two_background.webp"
import quiz3 from "./assets/quiz_three_background.webp"
import quiz4 from "./assets/quiz_four_background.webp"
import quiz5 from "./assets/quiz_five_background.webp"
import finalPage from "./assets/final_page.webp"

import clouds from "./assets/clouds.svg"
import ufo from "./assets/ufo_whole.svg"
import ufoBeam from "./assets/ufo_light.svg"

import alienLeft from "./assets/alien_left.svg"
import alienMiddle from "./assets/alien_middle.svg"
import alienRight from "./assets/alien_right.svg"

import waterText from "./assets/water.svg"
import contentText from "./assets/Content.svg"
import tapPlay from "./assets/Tap_play.svg"
import buttonBox from "./assets/button_box.svg"

import condensation from "./assets/condensation.svg"
import precipitation from "./assets/precipitation.svg"
import evaporation from "./assets/evaporation.svg"
import desalination from "./assets/Desalination.svg"
import stormwater from "./assets/Stormwater.svg"
import purified from "./assets/Purified_Water.svg"
import dams from "./assets/Dams_Rivers.svg"

import correctPage from "./assets/correct_page.svg"
import correctNext from "./assets/correct_page_next.svg"

import playAgain from "./assets/play_again.svg"

const assets = [
  gradientBg,
  quiz1,
  quiz2,
  quiz3,
  quiz4,
  quiz5,
  finalPage,

  clouds,
  ufo,
  ufoBeam,

  alienLeft,
  alienMiddle,
  alienRight,

  waterText,
  contentText,
  tapPlay,
  buttonBox,

  condensation,
  precipitation,
  evaporation,
  desalination,
  stormwater,
  purified,
  dams,

  
  correctPage,
  correctNext,
  playAgain
]

export async function preloadAssets() {

  const promises = assets.map((src) => {

    return new Promise<void>((resolve) => {

      const img = new Image()

      img.src = src

      if (img.decode) {
        img.decode().then(resolve).catch(resolve)
      } else {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      }

    })

  })

  await Promise.all(promises)

}