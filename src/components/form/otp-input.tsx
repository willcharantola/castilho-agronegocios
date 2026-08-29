"use client";

import * as React from "react";
import styles from "./otp-input.module.css";

export function OtpInput({
  value,
  onChange,
  length = 4,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = React.useMemo(() => {
    const arr = value.split("");
    return Array.from({ length }, (_, i) => arr[i] ?? "");
  }, [value, length]);

  function setDigit(index: number, digit: string) {
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(length, "").slice(0, length).trimEnd());
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={styles.box}
          />
        ))}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
