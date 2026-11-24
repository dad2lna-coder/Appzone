import { useState } from "react";
import type { AirportEntry, PersonnelEntry } from "@/domain/types";
import { activeOffice, useMemoStore } from "@/modules/memo-store";
import { uid } from "@/domain/ids";
import { fileToPngDataUrl } from "@/services/storage-service";
import { Button, Card, Field, TextArea, TextInput } from "@/components/ui";

export function BrandingConfig() {
  const office = useMemoStore(activeOffice);
  const updateBranding = useMemoStore((state) => state.updateBranding);
  const setLogo = useMemoStore((state) => state.setLogo);
  const commitBranding = useMemoStore((state) => state.commitBranding);
  const restoreBranding = useMemoStore((state) => state.restoreBranding);
  const updateConfig = useMemoStore((state) => state.updateConfig);
  const commitConfig = useMemoStore((state) => state.commitConfig);
  const restoreConfig = useMemoStore((state) => state.restoreConfig);
  const [tab, setTab] = useState<"branding" | "office">("branding");
  const [error, setError] = useState("");

  if (!office) return null;
  const branding = office.branding;
  const config = office.config;

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Button type="button" variant={tab === "branding" ? "primary" : "secondary"} onClick={() => setTab("branding")}>Branding</Button>
        <Button type="button" variant={tab === "office" ? "primary" : "secondary"} onClick={() => setTab("office")}>Office configuration</Button>
      </div>
      {tab === "branding" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="grid gap-4">
            <Field label="Logo or header image" hint="PNG, JPEG, and SVG are converted to an embedded PNG. Generated files do not point at this image’s original location.">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,.svg"
                className="block w-full text-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const image = await fileToPngDataUrl(file, 640);
                    const height = Math.max(24, Math.round(branding.widthPx * (image.height / image.width)));
                    setLogo(image.dataUrl, file.name, branding.widthPx, height);
                    setError("");
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Image import failed.");
                  }
                }}
              />
            </Field>
            {error ? <p className="text-sm text-mb-danger">{error}</p> : null}
            <Field label={`Width ${branding.widthPx}px`}>
              <input
                type="range"
                min={80}
                max={420}
                value={branding.widthPx}
                onChange={(event) => {
                  const width = Number(event.target.value);
                  const height = branding.widthPx ? Math.round(branding.heightPx * (width / branding.widthPx)) : 48;
                  updateBranding({ widthPx: width, heightPx: height });
                }}
              />
            </Field>
            <fieldset className="grid gap-2 text-sm">
              <legend className="font-semibold">Placement</legend>
              {(["left", "center", "right"] as const).map((placement) => (
                <label key={placement} className="flex items-center gap-2">
                  <input type="radio" name="placement" checked={branding.placement === placement} onChange={() => updateBranding({ placement })} />
                  {placement}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Top margin (mm)"><TextInput type="number" min={8} max={40} value={branding.marginTopMm} onChange={(event) => updateBranding({ marginTopMm: Number(event.target.value) })} /></Field>
              <Field label="Side margin (mm)"><TextInput type="number" min={10} max={40} value={branding.marginSideMm} onChange={(event) => updateBranding({ marginSideMm: Number(event.target.value) })} /></Field>
            </div>
            <Button type="button" onClick={() => commitBranding("Branding update")}>Save branding version</Button>
          </Card>
          <Card>
            <h2 className="font-semibold">Header preview</h2>
            <div className={`mt-3 flex ${branding.placement === "center" ? "justify-center" : branding.placement === "right" ? "justify-end" : "justify-start"}`}>
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="Branding header" style={{ width: branding.widthPx }} className="h-auto max-w-full" />
              ) : (
                <p className="text-sm text-mb-warning">No logo is saved.</p>
              )}
            </div>
            <h3 className="mt-4 font-semibold">History</h3>
            <ul className="mt-2 grid gap-2 text-sm">
              {branding.versions.map((version) => (
                <li key={version.version} className="flex items-center justify-between gap-2">
                  <span>v{version.version} · {version.note}</span>
                  <button type="button" className="min-h-11 font-semibold text-mb-blue" onClick={() => restoreBranding(version.version)}>Restore</button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        renderOffice()
      )}
    </div>
  );

  function renderOffice() {
    return (
      <div className="grid gap-4">
        <Card className="grid gap-3 md:grid-cols-2">
          <Field label="Office name"><TextInput value={config.officeName} onChange={(event) => updateConfig({ officeName: event.target.value })} /></Field>
          <Field label="Region"><TextInput value={config.region} onChange={(event) => updateConfig({ region: event.target.value })} /></Field>
          <Field label="Default recipients"><TextArea value={config.defaultRecipients} onChange={(event) => updateConfig({ defaultRecipients: event.target.value })} /></Field>
          <Field label="Default CC"><TextArea value={config.defaultCc} onChange={(event) => updateConfig({ defaultCc: event.target.value })} /></Field>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Airports</h2>
            <Button type="button" variant="secondary" onClick={() => updateConfig({ airports: [...config.airports, { code: "", name: "", locations: [] }] })}>Add airport</Button>
          </div>
          <div className="mt-3 grid gap-3">
            {config.airports.map((airport, index) => (
              <AirportRow key={`${airport.code}-${index}`} airport={airport} onChange={(next) => {
                const airports = config.airports.map((item, itemIndex) => itemIndex === index ? next : item);
                updateConfig({ airports });
              }} onRemove={() => updateConfig({ airports: config.airports.filter((_, itemIndex) => itemIndex !== index) })} />
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Personnel</h2>
            <Button type="button" variant="secondary" onClick={() => updateConfig({ personnel: [...config.personnel, { id: uid("PER").toLowerCase(), name: "", title: "", email: "" }] })}>Add person</Button>
          </div>
          <div className="mt-3 grid gap-3">
            {config.personnel.map((person, index) => (
              <PersonRow key={person.id} person={person} issuing={config.issuingOfficialIds.includes(person.id)} onIssuing={(checked) => {
                const issuingOfficialIds = checked
                  ? [...config.issuingOfficialIds, person.id]
                  : config.issuingOfficialIds.filter((id) => id !== person.id);
                updateConfig({ issuingOfficialIds });
              }} onChange={(next) => updateConfig({ personnel: config.personnel.map((item, itemIndex) => itemIndex === index ? next : item) })} onRemove={() => updateConfig({ personnel: config.personnel.filter((item) => item.id !== person.id), issuingOfficialIds: config.issuingOfficialIds.filter((id) => id !== person.id) })} />
            ))}
          </div>
        </Card>
        <Card className="grid gap-3">
          <h2 className="font-semibold">Routing and terminology</h2>
          {config.routing.map((entry, index) => (
            <div key={`${entry.label}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <TextInput aria-label="Routing label" value={entry.label} onChange={(event) => updateConfig({ routing: config.routing.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} />
              <TextInput aria-label="Routing value" value={entry.value} onChange={(event) => updateConfig({ routing: config.routing.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} />
              <Button type="button" variant="ghost" onClick={() => updateConfig({ routing: config.routing.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => updateConfig({ routing: [...config.routing, { label: "", value: "" }] })}>Add routing line</Button>
          <Field label="Terminology" hint="One per line: key=value. Templates can use {{term.key}}.">
            <TextArea
              value={Object.entries(config.terminology).map(([key, value]) => `${key}=${value}`).join("\n")}
              onChange={(event) => {
                const terminology: Record<string, string> = {};
                for (const line of event.target.value.split("\n")) {
                  const [key, ...rest] = line.split("=");
                  if (key?.trim()) terminology[key.trim()] = rest.join("=").trim();
                }
                updateConfig({ terminology });
              }}
            />
          </Field>
          <Button type="button" onClick={() => commitConfig("Configuration update")}>Save configuration version</Button>
          <ul className="grid gap-2 text-sm">
            {config.versions.map((version) => (
              <li key={version.version} className="flex items-center justify-between">
                <span>v{version.version} · {version.note}</span>
                <button type="button" className="min-h-11 font-semibold text-mb-blue" onClick={() => restoreConfig(version.version)}>Restore</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }
}

function AirportRow({ airport, onChange, onRemove }: { airport: AirportEntry; onChange: (airport: AirportEntry) => void; onRemove: () => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr_auto]">
      <TextInput aria-label="Airport code" value={airport.code} onChange={(event) => onChange({ ...airport, code: event.target.value.toUpperCase() })} />
      <TextInput aria-label="Airport name" value={airport.name} onChange={(event) => onChange({ ...airport, name: event.target.value })} />
      <TextInput aria-label="Locations" value={airport.locations.join(", ")} onChange={(event) => onChange({ ...airport, locations: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
      <Button type="button" variant="ghost" onClick={onRemove}>Remove</Button>
    </div>
  );
}

function PersonRow({
  person,
  issuing,
  onChange,
  onIssuing,
  onRemove,
}: {
  person: PersonnelEntry;
  issuing: boolean;
  onChange: (person: PersonnelEntry) => void;
  onIssuing: (checked: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
      <TextInput aria-label="Name" value={person.name} onChange={(event) => onChange({ ...person, name: event.target.value })} />
      <TextInput aria-label="Title" value={person.title} onChange={(event) => onChange({ ...person, title: event.target.value })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={issuing} onChange={(event) => onIssuing(event.target.checked)} /> Issuer</label>
      <Button type="button" variant="ghost" onClick={onRemove}>Remove</Button>
    </div>
  );
}
