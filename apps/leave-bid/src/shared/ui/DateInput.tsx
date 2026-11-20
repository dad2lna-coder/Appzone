import styles from "./fields.module.css";

export function DateInput({
  label,
  value,
  onChange,
  edit = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  edit?: boolean;
}) {
  const control = (
    <input
      className={edit ? `${styles.control} ${styles.edit}` : styles.control}
      type="date"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
  if (!label) return control;
  return (
    <label className={styles.group}>
      {label}
      {control}
    </label>
  );
}
