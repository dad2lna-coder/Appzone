# Memorandum Builder

Office memorandum generator for `html-apps`. Templates, branding, batch JSON, DOCX, and PDF stay in the browser. IndexedDB holds the office package. Nothing is uploaded.

## Run

```bash
cd apps/memorandum-builder
npm install
npm run dev
```

Open the URL Vite prints.

## Open the built files

```bash
npm run build
```

`dist/index.html` uses relative paths (`base: "./"`), same as leave-bid. Serve `dist/` or open it from a local static host. `file://` can block IndexedDB in some browsers; use `npm run preview` if the browser refuses storage.

## What is included

- Dashboard, guided and full-edit memorandum, template designer, Word `.docx` import
- Original-package token replacement when the Word file contains `{{fieldId}}` placeholders
- DOCX and PDF download, with an empty Acrobat signature field on the PDF
- Batch JSON review and selective generation
- Branding, airports, personnel, archive, office export and import

Sample batch: `public/samples/batch-schedule.json`.

## Limits

- The PDF signature widget is unsigned. A PIV signature in Acrobat was not verified.
- Imported Word formatting is preserved only for placeholder replacement inside the original package. A template with no placeholders is rebuilt from the extracted paragraphs.
- Clearing site data deletes the office unless you export a package first.
