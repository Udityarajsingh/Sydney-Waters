import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { memo, useMemo, useState, useEffect} from "react";
import condensationSvg from "../assets/condensation.svg";
import precipitationSvg from "../assets/precipitation.svg";
import evaporationSvg from "../assets/evaporation.svg";
import desalinationSvg from "../assets/Desalination.svg";
import stormwaterSvg from "../assets/Stormwater.svg";
import purifiedWaterSvg from "../assets/Purified_Water.svg";
import damsRiversSvg from "../assets/Dams_Rivers.svg";
import dragAnswerHereSvg from "../assets/Drag_answer_here.svg";
import correctPageSvg from "../assets/correct_page.svg";
import correctPageNextSvg from "../assets/correct_page_next.svg";
import quizOneBg from "../assets/quiz_one_background.webp";
import oneSvg from "../assets/one.svg";
import twoSvg from "../assets/two.svg";
import quizTwoBg from "../assets/quiz_two_background.webp";
import quizThreeBg from "../assets/quiz_three_background.webp";
import quizFourBg from "../assets/quiz_four_background.webp";
import quizFiveBg from "../assets/quiz_five_background.webp";
import finalPageBg from "../assets/final_page.webp";
import playAgainSvg from "../assets/play_again.svg";
import turnTheTapSvg from "../assets/Turn_the_tap.svg";
import useTriggerNozzleSvg from "../assets/Use_trigger_nozzle.svg";
import letTheShowerSvg from "../assets/Let_the_shower.svg";
import runDishwasherSvg from "../assets/Run_the_dishwasher.svg";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent
} from "@dnd-kit/core";

import styles from "./Question.module.css";

type QuestionProps = {
  questionIndex: number;
  onNext: () => void;
  onRestart: () => void;
};

type BoundsRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type QuestionMarker = {
  src: string;
  className: string;
  alt: string;
};

type QuestionOption = {
  id: string;
  icon: string;
  className?: string;
  pillClassName?: string;
  iconClassName?: string;
};

type QuestionDrop = {
  id: string;
  className: string;
  answerId?: string;
  acceptIds?: string[];
  pillClassName?: string;
  iconClassName?: string;
  placeholderIcon?: string;
  placeholderIconClassName?: string;
  nearTolerance?: number;
};

type QuestionVisualConfig = {
  backgroundImage: string;
  markers: QuestionMarker[];
  options: QuestionOption[];
  drops: QuestionDrop[];
  optionsContainerClassName?: string;
};

type QuestionSelectOption = {
  id: string;
  label: string;
  className: string;
  labelClassName?: string;
};

type QuestionSelectOptionText = {
  id: string;
  label: string;
  className: string;
  labelClassName?: string;
};

const questionOneOptions = [
  { id: "condensation", icon: condensationSvg },
  { id: "precipitation", icon: precipitationSvg },
  { id: "evaporation", icon: evaporationSvg }
];

const questionTwoOptions = [
  {
    id: "desalination",
    icon: desalinationSvg,
    className: styles.q2OptionDesalination,
    pillClassName: styles.q2OptionPill,
    iconClassName: styles.q2OptionIcon
  },
  {
    id: "stormwater",
    icon: stormwaterSvg,
    className: styles.q2OptionStormwater,
    pillClassName: styles.q2OptionPill,
    iconClassName: styles.q2OptionIcon
  },
  {
    id: "purified_water",
    icon: purifiedWaterSvg,
    className: styles.q2OptionPurified,
    pillClassName: styles.q2OptionPill,
    iconClassName: styles.q2OptionIcon
  },
  {
    id: "dams_rivers",
    icon: damsRiversSvg,
    className: styles.q2OptionDams,
    pillClassName: styles.q2OptionPill,
    iconClassName: styles.q2OptionIcon
  }
];

const questionFiveOptions = [
  {
    id: "turn_the_tap",
    icon: turnTheTapSvg,
    className: styles.q5OptionOne,
    pillClassName: styles.q5OptionPill,
    iconClassName: styles.q5IconTurnTap
  },
  {
    id: "use_trigger_nozzle",
    icon: useTriggerNozzleSvg,
    className: styles.q5OptionTwo,
    pillClassName: styles.q5OptionPill,
    iconClassName: styles.q5IconTriggerNozzle
  },
  {
    id: "let_the_shower",
    icon: letTheShowerSvg,
    className: styles.q5OptionThree,
    pillClassName: styles.q5OptionPill,
    iconClassName: styles.q5IconLetShower
  },
  {
    id: "run_the_dishwasher",
    icon: runDishwasherSvg,
    className: styles.q5OptionFour,
    pillClassName: styles.q5OptionPill,
    iconClassName: styles.q5IconRunDishwasher
  }
];

const q5FilledIconClassById: Record<string, string> = {
  turn_the_tap: styles.q5IconTurnTap,
  use_trigger_nozzle: styles.q5IconTriggerNozzle,
  let_the_shower: styles.q5IconLetShower,
  run_the_dishwasher: styles.q5IconRunDishwasher
};

const optionIcons: Record<string, string> = {
  condensation: condensationSvg,
  precipitation: precipitationSvg,
  evaporation: evaporationSvg,
  desalination: desalinationSvg,
  stormwater: stormwaterSvg,
  purified_water: purifiedWaterSvg,
  dams_rivers: damsRiversSvg
  ,turn_the_tap: turnTheTapSvg
  ,use_trigger_nozzle: useTriggerNozzleSvg
  ,let_the_shower: letTheShowerSvg
  ,run_the_dishwasher: runDishwasherSvg
};

const questionVisuals: Record<number, QuestionVisualConfig> = {
  0: {
    backgroundImage: quizOneBg,
    markers: [
      { src: oneSvg, className: styles.markerOne, alt: "1" },
      { src: twoSvg, className: styles.markerTwo, alt: "2" }
    ],
    options: questionOneOptions,
    drops: [
      { id: "clouds", className: styles.dropClouds, answerId: "condensation", nearTolerance: 36 },
      { id: "rain", className: styles.dropRain, answerId: "precipitation", nearTolerance: 36 },
      { id: "sun", className: styles.dropSun, answerId: "evaporation", nearTolerance: 52 }
    ],
    optionsContainerClassName: styles.optionsRow
  },
  1: {
    backgroundImage: quizTwoBg,
    markers: [],
    options: questionTwoOptions,
    drops: [
      {
        id: "q2_source",
        className: styles.q2DropOne,
        answerId: "dams_rivers",
        pillClassName: styles.q2DropPill,
        placeholderIcon: dragAnswerHereSvg,
        placeholderIconClassName: styles.q2PlaceholderIcon,
        nearTolerance: 34
      },
      {
        id: "q2_desalination",
        className: styles.q2DropTwo,
        answerId: "desalination",
        pillClassName: styles.q2DropPill,
        placeholderIcon: dragAnswerHereSvg,
        placeholderIconClassName: styles.q2PlaceholderIcon,
        nearTolerance: 34
      },
      {
        id: "q2_purified",
        className: styles.q2DropThree,
        answerId: "purified_water",
        pillClassName: styles.q2DropPill,
        placeholderIcon: dragAnswerHereSvg,
        placeholderIconClassName: styles.q2PlaceholderIcon,
        nearTolerance: 34
      },
      {
        id: "q2_stormwater",
        className: styles.q2DropFour,
        answerId: "stormwater",
        pillClassName: styles.q2DropPill,
        placeholderIcon: dragAnswerHereSvg,
        placeholderIconClassName: styles.q2PlaceholderIcon,
        nearTolerance: 34
      }
    ]
  },
  2: {
    backgroundImage: quizThreeBg,
    markers: [],
    options: [],
    drops: []
  },
  3: {
    backgroundImage: quizFourBg,
    markers: [],
    options: [],
    drops: []
  },
  4: {
    backgroundImage: quizFiveBg,
    markers: [],
    options: questionFiveOptions,
    drops: [
      {
        id: "q5_waste_top",
        className: styles.q5DropWasteTop,
        acceptIds: ["let_the_shower", "run_the_dishwasher", "collect_rainwater"],
        pillClassName: styles.q5DropPill,
        iconClassName: styles.q5OptionIcon,
        nearTolerance: 30
      },
      {
        id: "q5_wise_top",
        className: styles.q5DropWiseTop,
        acceptIds: ["turn_the_tap", "use_trigger_nozzle"],
        pillClassName: styles.q5DropPill,
        iconClassName: styles.q5OptionIcon,
        nearTolerance: 30
      },
      {
        id: "q5_waste_bottom",
        className: styles.q5DropWasteBottom,
        acceptIds: ["let_the_shower", "run_the_dishwasher", "collect_rainwater"],
        pillClassName: styles.q5DropPill,
        iconClassName: styles.q5OptionIcon,
        nearTolerance: 30
      },
      {
        id: "q5_wise_bottom",
        className: styles.q5DropWiseBottom,
        acceptIds: ["turn_the_tap", "use_trigger_nozzle"],
        pillClassName: styles.q5DropPill,
        iconClassName: styles.q5OptionIcon,
        nearTolerance: 30
      }
    ]
  },
  5: {
    backgroundImage: finalPageBg,
    markers: [],
    options: [],
    drops: []
  }
};

const questionThreeGroupOneOptions: QuestionSelectOption[] = [
  { id: "crying_robots", label: "Crying robots", className: styles.q3G1CryRobots },
  { id: "bath_toilet", label: "Bath and toilet", className: styles.q3G1BathToilet },
  { id: "kitchen_sink", label: "Kitchen sink", className: styles.q3G1KitchenSink },
  { id: "alien_spaceships", label: "Alien Spaceships", className: styles.q3G1AlienSpaceships },
  { id: "factories_shops", label: "Factories and shops", className: styles.q3G1FactoriesShops }
];

const questionThreeGroupTwoOptions: QuestionSelectOption[] = [
  { id: "wet_wipes", label: "Wet Wipes", className: styles.q3G2WetWipes },
  { id: "toothpaste", label: "Toothpaste", className: styles.q3G2Toothpaste },
  { id: "soap_bubbles", label: "Soap bubbles", className: styles.q3G2SoapBubbles },
  {
    id: "coffee_food_waste",
    label: "Coffee Grounds and Food Waste",
    className: styles.q3G2CoffeeFood,
    labelClassName: styles.q3SmallLabel
  },
  { id: "milk_oil", label: "Milk and Oil", className: styles.q3G2MilkOil }
];

const questionFourOptions: QuestionSelectOptionText[] = [
  {
    id: "take_shorter_showers",
    label: "Take shorter showers",
    className: styles.q4OptionOne,
    labelClassName: styles.q4OptionText
  },
  {
    id: "fix_leaking_taps",
    label: "Fix leaking taps",
    className: styles.q4OptionTwo,
    labelClassName: styles.q4OptionText
  },
  {
    id: "sprinkler_running",
    label: "Leave the sprinkler running",
    className: styles.q4OptionThree,
    labelClassName: styles.q4OptionText
  },
  {
    id: "wash_driveway",
    label: "Wash the driveway with a hose",
    className: styles.q4OptionFour,
    labelClassName: styles.q4OptionText
  },
  {
    id: "collect_rainwater",
    label: "Collect rainwater in a tank",
    className: styles.q4OptionFive,
    labelClassName: styles.q4OptionText
  }
];

function DraggableOption({
  id,
  icon,
  className,
  pillClassName,
  iconClassName
}: {
  id: string;
  icon: string;
  className?: string;
  pillClassName?: string;
  iconClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const scale = Math.min(
  window.innerWidth / 387,
  window.innerHeight / 688
)

const style = {
  transform: transform
    ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px,0)`
    : undefined,
  touchAction: "none" as const
};

  return (
    <div
      ref={setNodeRef}
      className={`${styles.option} ${pillClassName ?? ""} ${className ?? ""} ${isDragging ? styles.optionDragging : ""}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <img
        src={icon}
        className={`${styles.optionIcon} ${iconClassName ?? ""}`}
        draggable={false}
      />
    </div>
  );
}

function DropZone({
  id,
  filled,
  className,
  showCorrect,
  pillClassName,
  iconClassName,
  placeholderIcon,
  placeholderIconClassName
}: {
  id: string;
  filled?: string;
  className?: string;
  showCorrect?: boolean;
  pillClassName?: string;
  iconClassName?: string;
  placeholderIcon?: string;
  placeholderIconClassName?: string;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.dropzone} ${pillClassName ?? ""} ${className ?? ""} ${filled ? styles.dropzoneFilled : ""}`}
      data-drop-id={id}
    >
      {filled && (
        <img
          src={optionIcons[filled]}
          className={`${styles.optionIcon} ${iconClassName ?? ""} ${q5FilledIconClassById[filled] ?? ""}`}
          draggable={false}
        />
      )}
      {!filled && placeholderIcon && (
        <img
          src={placeholderIcon}
          className={placeholderIconClassName}
          draggable={false}
          alt="Drag answer here"
        />
      )}
      
    </div>
  );
}

function QuestionComponent({ questionIndex, onNext, onRestart }: QuestionProps) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [questionThreeSelectedCorrect, setQuestionThreeSelectedCorrect] = useState<Record<string, boolean>>({});
  const [questionThreeWrongPulse, setQuestionThreeWrongPulse] = useState<Record<string, boolean>>({});
  const [questionFourSelectedCorrect, setQuestionFourSelectedCorrect] = useState<Record<string, boolean>>({});
  const [questionFourWrongPulse, setQuestionFourWrongPulse] = useState<Record<string, boolean>>({});

  const questionThreeCorrectIds = useMemo(
    () => new Set(["bath_toilet", "kitchen_sink", "wet_wipes", "milk_oil", "coffee_food_waste"]),
    []
  );

  const questionFourCorrectIds = useMemo(
    () => new Set(["take_shorter_showers", "fix_leaking_taps", "collect_rainwater"]),
    []
  );

  const currentVisuals =
    questionVisuals[questionIndex] ??
    ({
      backgroundImage: quizOneBg,
      markers: [],
      options: questionOneOptions,
      drops: [],
      optionsContainerClassName: styles.optionsRow
    } satisfies QuestionVisualConfig);

  useEffect(() => {
    setPlaced({});
    setShowSuccess(false);
    setQuestionThreeSelectedCorrect({});
    setQuestionThreeWrongPulse({});
    setQuestionFourSelectedCorrect({});
    setQuestionFourWrongPulse({});
  }, [questionIndex]);
  void questionIndex;

  const availableOptions = useMemo(
    () =>
      currentVisuals.options.filter(
        (option) => !Object.values(placed).includes(option.id)
      ),
    [currentVisuals.options, placed]
  );

  function isNearDrop(activeRect: BoundsRect, dropRect: DOMRect, tolerance: number) {

    return (
      activeRect.left < dropRect.right + tolerance &&
      activeRect.right > dropRect.left - tolerance &&
      activeRect.top < dropRect.bottom + tolerance &&
      activeRect.bottom > dropRect.top - tolerance
    );
  }

  function placeAnswer(dropId: string, optionId: string) {
    const newPlaced = {
      ...placed,
      [dropId]: optionId
    };

    setPlaced(newPlaced);

    if (Object.keys(newPlaced).length === currentVisuals.drops.length) {
      setShowSuccess(true);
    }
  }

  function findNearCorrectDrop(
    optionId: string,
    activeRect: BoundsRect
  ): string | null {
    const matchingDrops = currentVisuals.drops.filter((drop) =>
      drop.answerId
        ? drop.answerId === optionId
        : Boolean(drop.acceptIds?.includes(optionId))
    );

    if (matchingDrops.length === 0) {
      return null;
    }

    for (const correctDrop of matchingDrops) {
      const correctDropElement = document.querySelector(
        `[data-drop-id="${correctDrop.id}"]`
      ) as HTMLElement | null;

      if (!correctDropElement) {
        continue;
      }

      const tolerance = correctDrop.nearTolerance ?? 36;
      const correctDropRect = correctDropElement.getBoundingClientRect();
      if (isNearDrop(activeRect, correctDropRect, tolerance)) {
        return correctDrop.id;
      }
    }

    return null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const optionId = active.id as string;

    if (over) {
      const dropId = over.id as string;
      const drop = currentVisuals.drops.find((item) => item.id === dropId);
      const isAccepted = drop
        ? drop.answerId
          ? drop.answerId === optionId
          : Boolean(drop.acceptIds?.includes(optionId))
        : false;

      if (isAccepted) {
        placeAnswer(dropId, optionId);
        return;
      }
    }

    const activeRect = active.rect.current.translated
      ? new DOMRect(
          active.rect.current.translated.left,
          active.rect.current.translated.top,
          active.rect.current.translated.width,
          active.rect.current.translated.height
        )
      : active.rect.current.initial;

    if (!activeRect) {
      return;
    }

    const activeBounds: BoundsRect = {
      left: activeRect.left,
      right: activeRect.right,
      top: activeRect.top,
      bottom: activeRect.bottom
    };

    const nearDropId = findNearCorrectDrop(optionId, activeBounds);
    if (nearDropId) {
      placeAnswer(nearDropId, optionId);
    }
  }

  function handleQuestionThreeSelect(optionId: string) {
    if (questionThreeCorrectIds.has(optionId)) {
      setQuestionThreeSelectedCorrect((prev) => {
        if (prev[optionId]) {
          return prev;
        }

        const next = { ...prev, [optionId]: true };
        if (Object.keys(next).length === questionThreeCorrectIds.size) {
          setShowSuccess(true);
        }

        return next;
      });
      return;
    }

    setQuestionThreeWrongPulse((prev) => ({
      ...prev,
      [optionId]: false
    }));

    setTimeout(() => {
      setQuestionThreeWrongPulse((prev) => ({
        ...prev,
        [optionId]: true
      }));
    }, 0);

    setTimeout(() => {
      setQuestionThreeWrongPulse((prev) => ({
        ...prev,
        [optionId]: false
      }));
    }, 320);
  }

  function renderQuestionThreeOptions() {
    if (questionIndex !== 2) {
      return null;
    }

    return (
      <div className={styles.q3OptionsLayer}>
        <div className={styles.q3GroupOneWrap}>
          {questionThreeGroupOneOptions.map((option) => {
            const isSelected = Boolean(questionThreeSelectedCorrect[option.id]);
            const isWrongPulse = Boolean(questionThreeWrongPulse[option.id]);
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.q3OptionPill} ${option.className} ${isSelected ? styles.q3OptionSelected : ""} ${isWrongPulse ? styles.q3OptionWrongPulse : ""}`}
                onClick={() => handleQuestionThreeSelect(option.id)}
              >
                <span className={`${styles.q3OptionText} ${option.labelClassName ?? ""}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        

        <div className={styles.q3GroupTwoWrap}>
          {questionThreeGroupTwoOptions.map((option) => {
            const isSelected = Boolean(questionThreeSelectedCorrect[option.id]);
            const isWrongPulse = Boolean(questionThreeWrongPulse[option.id]);
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.q3OptionPill} ${option.className} ${isSelected ? styles.q3OptionSelected : ""} ${isWrongPulse ? styles.q3OptionWrongPulse : ""}`}
                onClick={() => handleQuestionThreeSelect(option.id)}
              >
                <span className={`${styles.q3OptionText} ${option.labelClassName ?? ""}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function handleQuestionFourSelect(optionId: string) {
    if (questionFourCorrectIds.has(optionId)) {
      setQuestionFourSelectedCorrect((prev) => {
        if (prev[optionId]) {
          return prev;
        }

        const next = { ...prev, [optionId]: true };
        if (Object.keys(next).length === questionFourCorrectIds.size) {
          setShowSuccess(true);
        }

        return next;
      });
      return;
    }

    setQuestionFourWrongPulse((prev) => ({
      ...prev,
      [optionId]: false
    }));

    setTimeout(() => {
      setQuestionFourWrongPulse((prev) => ({
        ...prev,
        [optionId]: true
      }));
    }, 0);

    setTimeout(() => {
      setQuestionFourWrongPulse((prev) => ({
        ...prev,
        [optionId]: false
      }));
    }, 320);
  }

  function renderQuestionFourOptions() {
    if (questionIndex !== 3) {
      return null;
    }

    return (
      <div className={styles.q4OptionsLayer}>
        {questionFourOptions.map((option) => {
          const isSelected = Boolean(questionFourSelectedCorrect[option.id]);
          const isWrongPulse = Boolean(questionFourWrongPulse[option.id]);

          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.q4OptionPill} ${option.className} ${isSelected ? styles.q4OptionSelected : ""} ${isWrongPulse ? styles.q4OptionWrongPulse : ""}`}
              onClick={() => handleQuestionFourSelect(option.id)}
            >
              <span className={`${styles.q4OptionText} ${option.labelClassName ?? ""}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section
      className={styles.screen}
      style={{ backgroundImage: `url(${currentVisuals.backgroundImage})` }}
    >
      <DndContext
  onDragEnd={handleDragEnd}
  modifiers={[restrictToWindowEdges]}
>

        {currentVisuals.markers.map((marker) => (
          <img
            key={`${questionIndex}-${marker.className}`}
            src={marker.src}
            className={marker.className}
            draggable={false}
            alt={marker.alt}
          />
        ))}

        {questionIndex !== 2 && (
          <>
            {/* OPTIONS */}
            {currentVisuals.optionsContainerClassName ? (
              <div className={currentVisuals.optionsContainerClassName}>
                {availableOptions.map((option) => (
                  <DraggableOption
                    key={option.id}
                    id={option.id}
                    icon={option.icon}
                    className={option.className}
                    pillClassName={option.pillClassName}
                    iconClassName={option.iconClassName}
                  />
                ))}
              </div>
            ) : (
              <>
                {availableOptions.map((option) => (
                  <DraggableOption
                    key={option.id}
                    id={option.id}
                    icon={option.icon}
                    className={option.className}
                    pillClassName={option.pillClassName}
                    iconClassName={option.iconClassName}
                  />
                ))}
              </>
            )}

            {/* DROP ZONES */}
            {currentVisuals.drops.map((drop) => (
              <DropZone
                key={drop.id}
                id={drop.id}
                filled={placed[drop.id]}
                className={drop.className}
                showCorrect={false}
                pillClassName={drop.pillClassName}
                iconClassName={drop.iconClassName}
                placeholderIcon={drop.placeholderIcon}
                placeholderIconClassName={drop.placeholderIconClassName}
              />
            ))}
          </>
        )}

        {renderQuestionThreeOptions()}
        {renderQuestionFourOptions()}

        {questionIndex === 5 && (
          <button className={styles.finalPlayAgainButton} onClick={onRestart}>
            <img
              src={playAgainSvg}
              className={styles.finalPlayAgain}
              draggable={false}
              alt="Play Again"
            />
          </button>
        )}

      </DndContext>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className={styles.overlay}>
          <div className={styles.successPage}>
            <img src={correctPageSvg} className={styles.successPageImage} draggable={false} alt="All correct" />
            {questionIndex === 4 ? (
              <button className={styles.finishButton} onClick={onNext}>Finish</button>
            ) : (
              <button className={styles.successNextButton} onClick={onNext}>
                <img
                  src={correctPageNextSvg}
                  className={styles.successNextImage}
                  draggable={false}
                  alt="Next Question"
                />
              </button>
            )}
          </div>
        </div>
      )}

    </section>
  );
}

export const Question = memo(QuestionComponent);