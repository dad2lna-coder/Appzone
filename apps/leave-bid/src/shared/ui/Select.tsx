import styles from "./fields.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  bare = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  bare?: boolean;
}) {
  const control = (
    <select className={styles.control} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  if (bare) return control;
  return (
    <label className={styles.group}>
      {label}
      {control}
    </label>
  );
}
