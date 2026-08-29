import styles from "./background-decor.module.css";

/**
 * Fixed, blurred color blobs sitting behind every screen. Liquid Glass panels
 * need visual depth behind them to blur — a flat background makes the effect
 * invisible.
 */
export function BackgroundDecor() {
  return (
    <div aria-hidden className={styles.decor}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
      <div className={`${styles.blob} ${styles.blob4}`} />
    </div>
  );
}
