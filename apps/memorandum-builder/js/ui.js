(function (MB) {
  const routes = [
    ["/", "Dashboard"],
    ["/new", "New Memorandum"],
    ["/templates", "Template Manager"],
    ["/batch", "Batch Generation"],
    ["/branding", "Branding & Config"],
    ["/archive", "Archive"],
    ["/settings", "Settings"],
  ];
  const view = { step: 0, templateId: "", mode: "guided", values: {}, linked: true, subject: "", body: "", result: null, phrase: "", fieldId: "" };

  function path() {
    const raw = location.hash.replace(/^#/, "") || "/";
    return raw.startsWith("/") ? raw : "/" + raw;
  }

  function el(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    return wrap;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;")
      .replace(/'/g, "&#" + "39;");
  }

  function fieldControl(field, config, values) {
    const value = values[field.id] || "";
    if (field.type === "textarea") return '<textarea data-field="' + field.id + '">' + esc(value) + "</textarea>";
    if (field.type === "date") return '<input data-field="' + field.id + '" type="date" value="' + esc(value) + '">';
    if (field.type === "dateRange") {
      const parts = value.split("|");
      return '<input data-range="' + field.id + '" data-part="start" type="date" value="' + esc(parts[0] || "") + '"> <input data-range="' + field.id + '" data-part="end" type="date" value="' + esc(parts[1] || "") + '">';
    }
    if (field.type === "airport") {
      return '<select data-field="' + field.id + '"><option value="">Select</option>' + config.airports.map(function (airport) {
        return '<option' + (airport.code === value ? " selected" : "") + ">" + esc(airport.code) + "</option>";
      }).join("") + "</select>";
    }
    if (field.type === "location") {
      const airport = config.airports.find(function (item) { return item.code === values.airport; });
      const locations = airport ? airport.locations : [];
      return '<select data-field="' + field.id + '"><option value="">Select</option>' + locations.map(function (location) {
        return '<option' + (location === value ? " selected" : "") + ">" + esc(location) + "</option>";
      }).join("") + "</select>";
    }
    if (field.type === "personnel") {
      return '<select data-field="' + field.id + '"><option value="">Select</option>' + config.personnel.map(function (person) {
        return '<option value="' + esc(person.id) + '"' + (person.id === value ? " selected" : "") + ">" + esc(person.name) + "</option>";
      }).join("") + "</select>";
    }
    return '<input data-field="' + field.id + '" value="' + esc(value) + '">';
  }

  function previewHtml(office) {
    const template = office.templates.find(function (item) { return item.id === view.templateId; });
    if (!template) return "<p class='muted'>Choose a template to preview it.</p>";
    const memo = MB.resolveMemorandum({
      template: template,
      config: office.config,
      values: Object.assign(MB.initialValues(template, office.config), view.values),
      mode: view.mode,
      documentId: "PREVIEW",
      brandingVersion: office.branding.version,
      overrides: view.mode === "full" && !view.linked ? { subject: view.subject, body: view.body } : undefined,
    });
    const logo = office.branding.logoDataUrl ? '<img alt="" src="' + office.branding.logoDataUrl + '">' : "";
    return logo + "<h3>" + esc(memo.formatting.title) + "</h3><p><b>TO:</b> " + esc(memo.recipients) + "</p><p><b>FROM:</b> " + esc(memo.issuingOfficial) + "</p><p><b>SUBJECT:</b> " + esc(memo.subject) + "</p><p><b>DATE:</b> " + esc(memo.memoDate) + "</p><p>" + esc(memo.body).replace(/\n/g, "<br>") + "</p>";
  }

  function ensureTemplate(office) {
    if (view.templateId && office.templates.some(function (item) { return item.id === view.templateId; })) return;
    const first = office.templates.find(function (item) { return item.status === "published"; }) || office.templates[0];
    if (!first) return;
    view.templateId = first.id;
    view.values = MB.initialValues(first, office.config);
  }

  function page(office) {
    const current = path().split("?")[0];
    if (current === "/new" || current === "/") return dashboard(office, current === "/");
    if (current === "/templates") return templates(office);
    if (current.startsWith("/templates/")) return designer(office, decodeURIComponent(current.slice("/templates/".length)));
    if (current === "/batch") return batch(office);
    if (current === "/branding") return branding(office);
    if (current === "/archive") return archive(office);
    if (current === "/settings") return settings();
    return dashboard(office, true);
  }

  function dashboard(office, withDesk) {
    ensureTemplate(office);
    const template = office.templates.find(function (item) { return item.id === view.templateId; });
    const person = office.config.personnel.find(function (entry) { return entry.id === office.config.issuingOfficialIds[0]; }) || office.config.personnel[0];
    const initials = person ? person.name.split(" ").map(function (part) { return part[0]; }).join("").slice(0, 2).toUpperCase() : "";
    const shortcuts = [
      ["/new", "New Memorandum", "Create a new memorandum using a template", "#e8f2ff", "#0969df"],
      ["/templates", "Manage Templates", "Create, edit and publish templates", "#efeaff", "#6b46d6"],
      ["/batch", "Batch Generation", "Import JSON and generate multiple documents", "#e7f6ee", "#16834a"],
      ["/branding", "Branding & Config", "Manage logos, airports and routing", "#fff4e5", "#e07a12"],
      ["/archive", "Archive", "View and restore historical documents", "#e7f6f5", "#0f8f8a"],
    ];
    const docs = MB.store.state.documents.filter(function (doc) { return doc.officeId === office.id; });
    let html = '<div class="head"><div><h1>Memorandum Builder</h1><p class="sub">Official Memorandum Generation and Management</p></div>' +
      (person ? '<div class="person"><span class="avatar">' + esc(initials) + '</span><span><b>' + esc(person.name) + '</b><br><span class="muted">' + esc(person.title) + "</span></span></div>" : "") + "</div>";
    if (withDesk) {
      html += '<div class="shortcuts">' + shortcuts.map(function (item) {
        return '<a class="card" href="#' + item[0] + '"><span class="well" style="background:' + item[3] + ";color:" + item[4] + '">+</span><span><b>' + item[1] + '</b><br><small>' + item[2] + "</small></span></a>";
      }).join("") + "</div>";
    }
    html += '<div class="split"><section class="panel"><div class="navybar"><h2>Create New Memorandum</h2></div><div class="body">' + wizard(office, template) + '</div></section><div>' + activityCard() + quickLinks() + "</div></div>";
    if (withDesk) {
      html += '<div class="bottom"><section class="card"><h2>Templates</h2><div class="list">' + office.templates.slice(0, 4).map(function (item) {
        return '<a class="line" href="#/templates/' + encodeURIComponent(item.id) + '"><span>' + esc(item.name) + '</span><span class="badge">v' + item.version + " " + esc(item.status) + "</span></a>";
      }).join("") + '</div></section><section class="card"><h2>Documents</h2><div class="list">' + (docs.slice(0, 4).map(function (doc) {
        return "<article><span><b>" + esc(doc.filenamePdf || doc.filenameDocx || doc.documentId) + '</b><br><span class="muted">' + esc(doc.subject) + '</span></span><span class="badge">' + (doc.hasPdf ? "PDF" : "DOCX") + "</span></article>";
      }).join("") || '<p class="muted">No documents yet.</p>') + '</div></section><section class="card"><h2>System Status</h2><p class="muted">Storage is in this browser. ' + docs.length + ' document' + (docs.length === 1 ? "" : "s") + ' saved.</p><p class="' + (office.branding.logoDataUrl ? "notice success" : "notice warning") + '">' + (office.branding.logoDataUrl ? "Logo is embedded locally." : "Add a logo before finished copies.") + "</p></section></div>";
    }
    return html;
  }

  function wizard(office, template) {
    const steps = ["Select Template", "Populate Fields", "Preview", "Generate"];
    let html = '<div class="steps">' + steps.map(function (label, index) {
      return '<button type="button" class="step' + (index === view.step ? " on" : "") + '" data-step="' + index + '"><span class="num">' + (index + 1) + "</span>" + label + "</button>";
    }).join("") + "</div>";
    if (view.step === 0) {
      html += '<div class="wizard"><div><label class="field">Memorandum Type<select data-template>' + office.templates.filter(function (item) { return item.status !== "archived"; }).map(function (item) {
        return '<option value="' + esc(item.id) + '"' + (item.id === view.templateId ? " selected" : "") + ">" + esc(item.name) + "</option>";
      }).join("") + '</select></label><p class="field">Mode</p><div class="modes"><button type="button" class="mode' + (view.mode === "guided" ? " on" : "") + '" data-mode="guided"><b>Guided Mode</b><br><span class="muted">Edit only designated fields</span></button><button type="button" class="mode' + (view.mode === "full" ? " on" : "") + '" data-mode="full"><b>Full Edit Mode</b><br><span class="muted">Edit the entire document</span></button></div><p><button class="btn" type="button" data-next>Next: Populate Fields →</button></p></div><div class="preview">' + previewHtml(office) + "</div></div>";
    } else if (view.step === 1 && template) {
      const fields = template.fields.filter(function (field) { return view.mode === "full" || field.guided; });
      html += fields.map(function (field) {
        return '<label class="field">' + esc(field.label) + (field.required ? " *" : "") + fieldControl(field, office.config, view.values) + "</label>";
      }).join("");
      html += '<label class="field">Recipients<textarea data-value="recipients">' + esc(view.values.recipients || "") + "</textarea></label>";
      html += '<label class="field">CC<input data-value="cc" value="' + esc(view.values.cc || "") + '"></label>';
      html += '<label class="field">Issuing official<select data-value="issuingOfficial">' + office.config.personnel.map(function (person) {
        return '<option value="' + esc(person.id) + '"' + (person.id === view.values.issuingOfficial ? " selected" : "") + ">" + esc(person.name) + "</option>";
      }).join("") + "</select></label>";
      html += '<label class="field">Date<input data-value="memoDate" type="date" value="' + esc(view.values.memoDate || "") + '"></label>';
      if (view.mode === "full") {
        html += '<label class="field"><input type="checkbox" data-linked ' + (view.linked ? "checked" : "") + "> Keep subject and body linked to the fields</label>";
        html += '<label class="field">Subject<textarea data-override="subject"' + (view.linked ? " disabled" : "") + ">" + esc(view.subject) + "</textarea></label>";
        html += '<label class="field">Body<textarea data-override="body"' + (view.linked ? " disabled" : "") + ">" + esc(view.body) + "</textarea></label>";
      }
      html += '<div class="preview">' + previewHtml(office) + "</div>";
    } else if (view.step >= 2) {
      html += '<div class="preview">' + previewHtml(office) + "</div>";
      if (view.result) {
        html += "<p><b>" + esc(view.result.id || "Not generated") + "</b></p>";
        html += view.result.errors.map(function (error) { return '<p class="warn">' + esc(error) + "</p>"; }).join("");
        html += view.result.warnings.map(function (warning) { return '<p class="notice warning">' + esc(warning) + "</p>"; }).join("");
        if (view.result.id) html += '<div class="row"><button class="btn secondary" type="button" data-dl="docx">Download DOCX</button><button class="btn secondary" type="button" data-dl="pdf">Download PDF</button></div>';
      }
    }
    html += '<div class="row" style="margin-top:12px"><button class="btn secondary" type="button" data-back ' + (view.step === 0 ? "disabled" : "") + '>Back</button><button class="btn secondary" type="button" data-gen="docx">Generate DOCX</button><button class="btn secondary" type="button" data-gen="pdf">Generate PDF</button><button class="btn" type="button" data-gen="both">Generate both</button></div>';
    return html;
  }

  function activityCard() {
    const events = MB.store.state.activity.slice(0, 5);
    return '<section class="panel"><div class="navybar"><h2>Recent Activity</h2><a href="#/archive">View All</a></div><div class="body list">' + (events.map(function (event) {
      return "<article><span>" + esc(event.message) + '<br><span class="muted">' + esc(new Date(event.at).toLocaleString()) + "</span></span></article>";
    }).join("") || '<p class="muted">No activity yet.</p>') + "</div></section>";
  }

  function quickLinks() {
    return '<section class="card"><h2>Quick Links</h2><div class="list"><a href="#/templates">Import Word Document</a><a href="#/batch">Import Batch JSON</a><a href="#/settings">Export Configuration</a><a href="#/archive">View Archive</a></div></section>';
  }

  function templates(office) {
    return '<div class="row"><button class="btn" type="button" id="blank">New template</button><button class="btn secondary" type="button" id="pick">Import Word template</button><input id="docx" class="sr-only" type="file" accept=".docx" hidden></div><div class="list" style="margin-top:16px">' + office.templates.map(function (template) {
      return '<article class="card"><div><a href="#/templates/' + encodeURIComponent(template.id) + '"><b>' + esc(template.name) + "</b></a><br><span class='muted'>" + esc(template.category) + " · v" + template.version + " · " + template.fields.length + ' fields</span></div><span class="badge">' + esc(template.status) + "</span></article>";
    }).join("") + "</div>";
  }

  function designer(office, id) {
    const template = office.templates.find(function (item) { return item.id === id; });
    if (!template) return "<p>That template is not in the selected office.</p>";
    if (!view.editing || view.editing.id !== template.id) view.editing = structuredClone(template);
    const draft = view.editing;
    return '<p><a href="#/templates">Templates</a></p><h1>' + esc(draft.name) + '</h1><p class="muted">Version history is kept when you save. Publishing does not erase the previous version.</p>' +
      draft.importWarnings.map(function (warning) { return '<p class="notice warning">' + esc(warning) + "</p>"; }).join("") +
      '<label class="field">Name<input id="t-name" value="' + esc(draft.name) + '"></label>' +
      '<label class="field">Subject format<input id="t-subject" value="' + esc(draft.subjectFormat) + '"></label>' +
      '<label class="field">Body<textarea id="t-body" style="min-height:180px">' + esc(draft.body) + "</textarea></label>" +
      '<div class="card"><h2>Mark a placeholder</h2><p class="muted">Type a phrase that appears in the body or in the imported Word package.</p><label class="field">Phrase<input id="phrase" value="' + esc(view.phrase) + '"></label><label class="field">Field id<input id="field-id" value="' + esc(view.fieldId) + '" placeholder="effectiveDate"></label><button class="btn secondary" type="button" id="mark">Turn phrase into a field</button></div>' +
      '<h2>Fields</h2><div class="list">' + draft.fields.map(function (field, index) {
        return '<article class="card"><b>' + esc(field.label) + '</b> <span class="muted">{{' + esc(field.id) + "}}</span><br>" + esc(field.type) + (field.guided ? " · guided" : "") + (field.required ? " · required" : "") + ' <button class="btn ghost" type="button" data-drop="' + index + '">Remove</button></article>';
      }).join("") + '</div><div class="row"><button class="btn secondary" type="button" id="save-draft">Save draft</button><button class="btn" type="button" id="publish">Publish</button></div>';
  }

  function batch(office) {
    const draft = MB.store.state.batchDraft;
    let html = '<div class="row"><button class="btn" type="button" id="sample">Load sample batch</button><button class="btn secondary" type="button" id="pick-batch">Import JSON</button><input id="batch-file" type="file" accept="application/json,.json" hidden></div>';
    html += '<p class="muted">Sample records are included in the page, so this works when the folder is opened directly. The JSON file is also in samples/batch-schedule.json.</p>';
    if (!draft) return html + "<p>No batch loaded.</p>";
    const template = office.templates.find(function (item) { return item.id === draft.templateId; });
    html += "<h2>" + esc(draft.batchId) + "</h2><p>" + (template ? esc(template.name) : "Missing template") + "</p>";
    html += '<label><input type="checkbox" id="all" ' + (draft.allOrNothing ? "checked" : "") + "> All or nothing</label>";
    html += '<div class="list">' + draft.records.map(function (record, index) {
      const issues = template ? MB.validateFieldValues(template, record.values, "guided") : ["No template"];
      return '<article class="card"><label><input type="checkbox" data-include="' + index + '"' + (record.included ? " checked" : "") + "> <b>" + esc(record.key) + "</b></label>" + (issues.length ? '<p class="warn">' + esc(issues.map(function (issue) { return issue.message || issue; }).join(" ")) + "</p>" : '<p class="muted">Ready</p>') + "</article>";
    }).join("") + '</div><button class="btn" type="button" id="run-batch">Generate included records</button>';
    return html;
  }

  function branding(office) {
    const config = office.config;
    return '<h1>Branding and configuration</h1><section class="card"><h2>Logo</h2><p class="muted">' + esc(office.branding.logoName) + " · v" + office.branding.version + " · " + office.branding.widthPx + "×" + office.branding.heightPx + "</p>" + (office.branding.logoDataUrl ? '<img alt="Current logo" src="' + office.branding.logoDataUrl + '" style="max-width:220px">' : "") + '<p><input id="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,.svg"></p><label class="field">Placement<select id="placement"><option' + (office.branding.placement === "left" ? " selected" : "") + '>left</option><option' + (office.branding.placement === "center" ? " selected" : "") + '>center</option><option' + (office.branding.placement === "right" ? " selected" : "") + ">right</option></select></label><button class='btn' type='button' id='save-logo'>Save logo</button></section>" +
      '<section class="card"><h2>Office</h2><label class="field">Office name<input id="office-name" value="' + esc(config.officeName) + '"></label><label class="field">Region<input id="region" value="' + esc(config.region) + '"></label><p class="muted">Airports: ' + config.airports.map(function (airport) { return esc(airport.code); }).join(", ") + "</p><p class=\"muted\">Personnel: " + config.personnel.map(function (person) { return esc(person.name); }).join(", ") + '</p><button class="btn" type="button" id="save-config">Save configuration</button><p class="muted">Saving creates the next version and keeps the previous snapshot.</p></section>';
  }

  function archive(office) {
    const docs = MB.store.state.documents.filter(function (doc) { return doc.officeId === office.id; });
    if (!docs.length) return "<h1>Archive</h1><p>No documents yet.</p>";
    return "<h1>Archive</h1><div class='list'>" + docs.map(function (doc) {
      return '<article class="card"><div><b>' + esc(doc.documentId) + "</b> " + esc(doc.subject) + '<br><span class="muted">' + esc(doc.status) + (doc.signatureField ? " · signature field" : "") + "</span></div><div class='row'>" + (doc.hasDocx ? '<button class="btn secondary" data-file="' + esc(doc.documentId) + '" data-kind="docx">DOCX</button>' : "") + (doc.hasPdf ? '<button class="btn secondary" data-file="' + esc(doc.documentId) + '" data-kind="pdf">PDF</button>' : "") + '<button class="btn ghost" data-status="' + esc(doc.documentId) + '" data-next="' + (doc.status === "archived" ? "generated" : "archived") + '">' + (doc.status === "archived" ? "Restore" : "Archive") + "</button></div></article>";
    }).join("") + "</div>";
  }

  function settings() {
    return '<h1>Settings</h1><section class="card"><h2>Storage</h2><p>Templates, office configuration, branding, and generated files stay in this browser (local storage). Clearing site data removes them. Export a package before you switch browsers.</p><p>Nothing is uploaded. Word and PDF files are built on this page.</p><div class="row"><button class="btn" type="button" id="export">Export office package</button><button class="btn secondary" type="button" id="import-btn">Import package</button><input id="package" type="file" accept=".zip" hidden><button class="btn ghost" type="button" id="reset">Reset sample office</button></div><p class="notice info">This folder runs without Node, npm, or a compile step. Open index.html. Libraries in vendor/ are stored with the app.</p><p class="muted">The PDF signature box is an empty Acrobat field. Signing it with a PIV card was not verified from this app. Imported Word formatting is kept only when the original package contains the placeholders.</p></section>';
  }

  function shell(office, inner) {
    const current = path().split("?")[0];
    const person = office.config.personnel[0];
    return '<div class="app"><aside class="sidebar" id="sidebar"><div class="brand"><svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><path d="M6 30c10-2 16-8 22-16 2 6 2 10-1 16-8 1-14 1-21 0z" fill="#7ec8ff"/><path d="M8 34c12-1 20-6 28-14 1 5 0 9-4 13-10 2-16 2-24 1z" fill="#d7ecff"/></svg><div><strong>Memorandum Builder</strong><span>Create · Manage · Archive</span></div></div><nav class="nav">' + routes.map(function (item) {
      const active = item[0] === "/" ? current === "/" : current.startsWith(item[0]);
      return '<a class="' + (active ? "active" : "") + '" href="#' + item[0] + '">' + item[1] + "</a>";
    }).join("") + '</nav><div class="art"><img src="assets/sidebar-airport.jpg" alt=""><div class="fade"></div><div class="office-card"><label>Office<select id="office">' + MB.store.state.offices.map(function (item) {
      return '<option value="' + esc(item.id) + '"' + (item.id === office.id ? " selected" : "") + ">" + esc(item.config.officeName) + "</option>";
    }).join("") + '</select></label><p class="ready"><span class="dot"></span> Ready <span class="muted">' + esc(office.config.region) + "</span></p></div></div></aside><div class='main'><button class='btn secondary menu' type='button' id='menu'>Menu</button>" + (MB.store.state.notice ? '<div class="notice ' + MB.store.state.notice.tone + '">' + esc(MB.store.state.notice.text) + ' <button class="btn ghost" type="button" id="dismiss">Dismiss</button></div>' : "") + inner + "</div></div>";
  }

  function bind(office) {
    const root = document.getElementById("app");
    const menu = document.getElementById("menu");
    const sidebar = document.getElementById("sidebar");
    if (menu) menu.onclick = function () {
      sidebar.classList.add("open");
      const scrim = document.createElement("div");
      scrim.className = "scrim";
      scrim.onclick = function () { sidebar.classList.remove("open"); scrim.remove(); };
      document.body.appendChild(scrim);
    };
    sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { sidebar.classList.remove("open"); });
    });
    const officeSelect = document.getElementById("office");
    if (officeSelect) officeSelect.onchange = function () { MB.store.setOffice(officeSelect.value); };
    const dismiss = document.getElementById("dismiss");
    if (dismiss) dismiss.onclick = function () { MB.store.dismiss(); };
    root.querySelectorAll("[data-step]").forEach(function (button) {
      button.onclick = function () { view.step = Number(button.dataset.step); render(); };
    });
    const templateSelect = root.querySelector("[data-template]");
    if (templateSelect) templateSelect.onchange = function () {
      view.templateId = templateSelect.value;
      const template = office.templates.find(function (item) { return item.id === view.templateId; });
      view.values = template ? MB.initialValues(template, office.config) : {};
      view.result = null;
      render();
    };
    root.querySelectorAll("[data-mode]").forEach(function (button) {
      button.onclick = function () { view.mode = button.dataset.mode; render(); };
    });
    const next = root.querySelector("[data-next]");
    if (next) next.onclick = function () { view.step = 1; render(); };
    const back = root.querySelector("[data-back]");
    if (back) back.onclick = function () { view.step = Math.max(0, view.step - 1); render(); };
    root.querySelectorAll("[data-field]").forEach(function (input) {
      input.onchange = function () { view.values[input.dataset.field] = input.value; paint(); };
    });
    root.querySelectorAll("[data-value]").forEach(function (input) {
      input.onchange = function () { view.values[input.dataset.value] = input.value; paint(); };
    });
    root.querySelectorAll("[data-range]").forEach(function (input) {
      input.onchange = function () {
        const current = (view.values[input.dataset.range] || "|").split("|");
        if (input.dataset.part === "start") current[0] = input.value;
        else current[1] = input.value;
        view.values[input.dataset.range] = current.join("|");
        paint();
      };
    });
    const linked = root.querySelector("[data-linked]");
    if (linked) linked.onchange = function () { view.linked = linked.checked; render(); };
    root.querySelectorAll("[data-override]").forEach(function (input) {
      input.oninput = function () { view[input.dataset.override] = input.value; view.linked = false; paint(); };
    });
    root.querySelectorAll("[data-gen]").forEach(function (button) {
      button.onclick = async function () {
        const formats = button.dataset.gen === "both" ? ["docx", "pdf"] : [button.dataset.gen];
        view.result = await MB.store.generate({
          templateId: view.templateId,
          values: view.values,
          mode: view.mode,
          formats: formats,
          overrides: view.mode === "full" && !view.linked ? { subject: view.subject, body: view.body } : undefined,
        });
        view.result.id = view.result.documentId;
        view.step = 3;
        render();
      };
    });
    root.querySelectorAll("[data-dl]").forEach(function (button) {
      button.onclick = function () { MB.store.download(view.result.id, button.dataset.dl); };
    });
    const blank = document.getElementById("blank");
    if (blank) blank.onclick = function () { location.hash = "/templates/" + MB.store.createBlank(); };
    const pick = document.getElementById("pick");
    const docx = document.getElementById("docx");
    if (pick && docx) {
      pick.onclick = function () { docx.click(); };
      docx.onchange = async function () {
        const file = docx.files && docx.files[0];
        if (!file) return;
        const id = await MB.store.importDocx(file);
        location.hash = "/templates/" + id;
      };
    }
    const name = document.getElementById("t-name");
    const subject = document.getElementById("t-subject");
    const body = document.getElementById("t-body");
    function readDraft() {
      if (!view.editing) return null;
      view.editing.name = name.value;
      view.editing.subjectFormat = subject.value;
      view.editing.body = body.value;
      return view.editing;
    }
    const mark = document.getElementById("mark");
    if (mark) mark.onclick = async function () {
      const phrase = document.getElementById("phrase").value.trim();
      const fieldId = document.getElementById("field-id").value.trim();
      if (!phrase || !MB.FIELD_ID_PATTERN.test(fieldId)) {
        MB.store.state.notice = { tone: "danger", text: "Enter a phrase and a field id that starts with a letter." };
        render();
        return;
      }
      view.phrase = phrase;
      view.fieldId = fieldId;
      view.editing = await MB.store.markPlaceholder(readDraft(), phrase, fieldId);
      render();
    };
    root.querySelectorAll("[data-drop]").forEach(function (button) {
      button.onclick = function () {
        view.editing.fields.splice(Number(button.dataset.drop), 1);
        render();
      };
    });
    const saveDraft = document.getElementById("save-draft");
    if (saveDraft) saveDraft.onclick = function () { MB.store.saveTemplate(readDraft(), "draft", "Saved from designer"); };
    const publish = document.getElementById("publish");
    if (publish) publish.onclick = function () { MB.store.saveTemplate(readDraft(), "published", "Published"); };
    const sample = document.getElementById("sample");
    if (sample) sample.onclick = function () {
      const parsed = MB.parseBatchJson(JSON.stringify(MB.SAMPLE_BATCH), office.templates);
      if (parsed.draft) {
        parsed.draft.fileName = "sample";
        MB.store.setBatch(parsed.draft);
      }
    };
    const pickBatch = document.getElementById("pick-batch");
    const batchFile = document.getElementById("batch-file");
    if (pickBatch && batchFile) {
      pickBatch.onclick = function () { batchFile.click(); };
      batchFile.onchange = async function () {
        const file = batchFile.files && batchFile.files[0];
        if (!file) return;
        const parsed = MB.parseBatchJson(await file.text(), office.templates);
        if (!parsed.draft) {
          MB.store.state.notice = { tone: "danger", text: parsed.fileErrors.join(" ") };
          render();
          return;
        }
        parsed.draft.fileName = file.name;
        MB.store.setBatch(parsed.draft);
      };
    }
    const all = document.getElementById("all");
    if (all && MB.store.state.batchDraft) all.onchange = function () {
      MB.store.state.batchDraft.allOrNothing = all.checked;
      MB.store.setBatch(MB.store.state.batchDraft);
    };
    root.querySelectorAll("[data-include]").forEach(function (input) {
      input.onchange = function () {
        MB.store.state.batchDraft.records[Number(input.dataset.include)].included = input.checked;
        MB.store.setBatch(MB.store.state.batchDraft);
      };
    });
    const runBatch = document.getElementById("run-batch");
    if (runBatch) runBatch.onclick = function () { MB.store.generateBatch(); };
    const saveLogo = document.getElementById("save-logo");
    if (saveLogo) saveLogo.onclick = async function () {
      const file = document.getElementById("logo").files[0];
      if (!file) return;
      await MB.store.updateBranding(file, document.getElementById("placement").value);
    };
    const saveConfig = document.getElementById("save-config");
    if (saveConfig) saveConfig.onclick = function () {
      const config = structuredClone(office.config);
      config.officeName = document.getElementById("office-name").value;
      config.region = document.getElementById("region").value;
      MB.store.saveConfig(config);
    };
    root.querySelectorAll("[data-file]").forEach(function (button) {
      button.onclick = function () { MB.store.download(button.dataset.file, button.dataset.kind); };
    });
    root.querySelectorAll("[data-status]").forEach(function (button) {
      button.onclick = function () { MB.store.setDocumentStatus(button.dataset.status, button.dataset.next); };
    });
    const exportBtn = document.getElementById("export");
    if (exportBtn) exportBtn.onclick = function () { MB.store.exportPackage(); };
    const importBtn = document.getElementById("import-btn");
    const packageInput = document.getElementById("package");
    if (importBtn && packageInput) {
      importBtn.onclick = function () { packageInput.click(); };
      packageInput.onchange = async function () {
        const file = packageInput.files && packageInput.files[0];
        if (!file) return;
        try { await MB.store.importPackage(file); } catch (error) {
          MB.store.state.notice = { tone: "danger", text: error.message || "Import failed." };
          render();
        }
      };
    }
    const reset = document.getElementById("reset");
    if (reset) reset.onclick = function () {
      if (confirm("Replace the saved office with the sample office?")) MB.store.reset();
    };
  }

  function paint() {
    const node = document.querySelector(".preview");
    const office = MB.store.office();
    if (node && office) node.innerHTML = previewHtml(office);
  }

  function render() {
    const root = document.getElementById("app");
    const office = MB.store.office();
    if (!office) {
      root.textContent = "Loading office records…";
      return;
    }
    root.innerHTML = shell(office, page(office));
    bind(office);
  }

  window.addEventListener("hashchange", render);
  MB.store.subscribe(render);
  MB.store.hydrate();
})(window.MB = window.MB || {});
