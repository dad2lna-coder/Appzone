import styles from "./fields.module.css";

export function NumberInput({
  label,
  value,
  onChange,
  edit = false,
  width,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  edit?: boolean;
  width?: number;
}) {
  const control = (
    <input
      className={edit ? `${styles.control} ${styles.edit}` : styles.control}
      style={width ? { width } : undefined}
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
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
