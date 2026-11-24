import type { MemoTemplate, OfficeConfig } from "@/domain/types";
import { Field, Select, TextArea, TextInput } from "@/components/ui";

export function DynamicFieldForm({
  template,
  config,
  values,
  mode,
  onChange,
}: {
  template: MemoTemplate;
  config: OfficeConfig;
  values: Record<string, string>;
  mode: "guided" | "full";
  onChange: (id: string, value: string) => void;
}) {
  const airport = config.airports.find((item) => item.code === values.airport);
  const officials = config.personnel.filter(
    (person) => config.issuingOfficialIds.length === 0 || config.issuingOfficialIds.includes(person.id),
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Recipients">
          <TextArea value={values.recipients ?? ""} onChange={(event) => onChange("recipients", event.target.value)} />
        </Field>
        <Field label="CC">
          <TextArea value={values.cc ?? ""} onChange={(event) => onChange("cc", event.target.value)} />
        </Field>
        <Field label="Issuing official">
          <Select value={values.issuingOfficial ?? ""} onChange={(event) => onChange("issuingOfficial", event.target.value)}>
            <option value="">Select an official</option>
            {officials.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}, {person.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Memorandum date">
          <TextInput type="date" value={values.memoDate ?? ""} onChange={(event) => onChange("memoDate", event.target.value)} />
        </Field>
      </div>
      {template.fields.map((field) => {
        const locked = mode === "guided" && !field.guided;
        const common = {
          value: values[field.id] ?? "",
          disabled: locked,
          onChange: (event: { target: { value: string } }) => onChange(field.id, event.target.value),
        };
        return (
          <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`} hint={locked ? "Locked in guided mode" : field.help}>
            {field.type === "textarea" ? <TextArea {...common} /> : null}
            {field.type === "text" ? <TextInput {...common} /> : null}
            {field.type === "date" ? <TextInput type="date" {...common} /> : null}
            {field.type === "dateRange" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <TextInput
                  type="date"
                  aria-label={`${field.label} start`}
                  value={(values[field.id] ?? "").split("|")[0] ?? ""}
                  disabled={locked}
                  onChange={(event) => {
                    const end = (values[field.id] ?? "").split("|")[1] ?? "";
                    onChange(field.id, `${event.target.value}|${end}`);
                  }}
                />
                <TextInput
                  type="date"
                  aria-label={`${field.label} end`}
                  value={(values[field.id] ?? "").split("|")[1] ?? ""}
                  disabled={locked}
                  onChange={(event) => {
                    const start = (values[field.id] ?? "").split("|")[0] ?? "";
                    onChange(field.id, `${start}|${event.target.value}`);
                  }}
                />
              </div>
            ) : null}
            {field.type === "airport" ? (
              <Select {...common}>
                <option value="">Select an airport</option>
                {config.airports.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {field.type === "location" ? (
              <Select {...common}>
                <option value="">Select a location</option>
                {(airport?.locations ?? []).map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </Select>
            ) : null}
            {field.type === "personnel" ? (
              <Select {...common}>
                <option value="">Select a person</option>
                {config.personnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {field.type === "select" ? (
              <Select {...common}>
                <option value="">Select</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : null}
          </Field>
        );
      })}
    </div>
  );
}
