import type { ReactNode } from "react";
import styles from "./Table.module.css";

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

export function Num({ children }: { children: ReactNode }) {
  return <td className={styles.num}>{children}</td>;
}
