import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useMemoStore } from "@/modules/memo-store";

export function Settings() {
  const exportPackage = useMemoStore((state) => state.exportPackage);
  const importPackage = useMemoStore((state) => state.importPackage);
  const resetSamples = useMemoStore((state) => state.resetSamples);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="grid max-w-3xl gap-4">
      <Card className="grid gap-3 text-sm text-mb-ink">
        <h2 className="text-lg font-semibold">Storage</h2>
        <p>Templates, office configuration, branding, and generated files stay in this browser’s IndexedDB. Clearing site data, using a private window, or switching browsers removes them. Export a package when you need a copy another office or browser can import.</p>
        <p>Nothing in a memorandum is uploaded. Document generation runs here. The only network use is loading the application itself.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void exportPackage()}>Export package</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-mb border border-mb-line bg-mb-surface px-4 text-sm font-semibold">
            Import package
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  await importPackage(file);
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Import failed.");
                }
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {error ? <p className="text-mb-danger">{error}</p> : null}
      </Card>
      <Card className="grid gap-2 text-sm">
        <h2 className="text-lg font-semibold">What this build does not claim</h2>
        <ul className="list-disc pl-5 text-mb-muted">
          <li>Word import keeps the original package and replaces phrases in text runs. Tables, text boxes, and floating objects are preserved only inside that package. If a phrase is split across runs, formatting inside the phrase can collapse.</li>
          <li>The PDF is laid out to match the memorandum, not converted from Word. It is the signature copy, not a pixel-perfect print of the DOCX.</li>
          <li>The PDF contains an empty AcroForm signature field named IssuerSignature. It is not a typed line and it does not contain a signature image or a private key. Signing with a PIV card has to be confirmed in Adobe Acrobat; that check cannot be run in this browser.</li>
          <li>Publishing a template or branding version adds a new version. It does not overwrite the history stored on generated documents.</li>
        </ul>
      </Card>
      <Card className="grid gap-3 text-sm">
        <h2 className="text-lg font-semibold">Reset starter data</h2>
        <p>Type CLEAR to replace this browser’s office data with the sample office. Export first if you need the current records.</p>
        <input className="min-h-11 rounded-mb border border-mb-line px-3" value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-label="Type CLEAR to reset" />
        <Button type="button" variant="danger" disabled={confirm !== "CLEAR"} onClick={() => void resetSamples()}>Reset</Button>
      </Card>
    </div>
  );
}
