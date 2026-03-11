import { memo } from "react";
import styles from "./Result.module.css";

type ResultProps = {
  onRestart: () => void;
};

function ResultComponent({ onRestart }: ResultProps) {
  return (
    <section className={styles.screen}>

      <h2>Quiz Completed</h2>

      <button onClick={onRestart}>
        Restart
      </button>

    </section>
  );
}

export const Result = memo(ResultComponent);