import styles from "./fields.module.css";

export function TextInput({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  width?: number;
}) {
  return (
    <input
      className={`${styles.control} ${styles.edit}`}
      style={width ? { width } : undefined}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
