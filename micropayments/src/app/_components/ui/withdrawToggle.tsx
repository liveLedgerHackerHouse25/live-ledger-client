"use client"
import React, { useState } from "react";
import styles from "@/app/_components/styling/withdrawToggle.module.css";

export default function WithdrawToggle(): React.ReactElement {
  const [on, setOn] = useState(false);
  const toggle = () => setOn((v) => !v);

  return (
    <div className={styles.toggleContainer}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`${styles.switch} ${on ? styles.on : ""}`}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}
