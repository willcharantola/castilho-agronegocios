import styles from "./progress-steps.module.css";

export function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }).map((_, index) => (
        <div key={index} className={styles.step}>
          <div className={styles.fill} style={{ width: index < current ? "100%" : "0%" }} />
        </div>
      ))}
    </div>
  );
}
