"use client"
import React from "react";
import styles from "@/app/_components/styling/withdrawButton.module.css";

type Props = {
  onClick?: () => void;
  label?: string;
};

export default function WithdrawButton({ onClick, label = "Withdraw" }: Props) {
  return (
    <button type="button" className={styles.btn} onClick={onClick}>
      {label}
    </button>
  );
}
