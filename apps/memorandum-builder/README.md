# Memorandum Builder

Open `index.html`. There is no install and no build step.

The page loads local scripts in `js/` and local copies of pdf-lib and JSZip in `vendor/`. It does not call a CDN. Office data, templates, logos, and generated files stay in this browser’s local storage.

## What you can do

- Create a memorandum from a template in guided or full-edit mode
- Import a Word `.docx`, mark phrases as `{{fieldId}}` placeholders, and keep version history
- Generate a DOCX and a PDF. The PDF includes an empty Acrobat signature field
- Load the built-in sample batch or import batch JSON
- Change the logo, office name, and region, then export or import a zip package

Sample files are in `samples/`. The Load sample batch button does not need those files, so the page still works when opened directly from the folder.

## Limits

- Clearing site data deletes the office unless you export a package first.
- The signature field is unsigned. Signing it with a PIV card was not verified here.
- An imported Word file keeps its own formatting only when generation can replace placeholders inside that package. Otherwise a new document is built from the wording.
- Very large batches can fill the browser storage quota. Export a package before then.
