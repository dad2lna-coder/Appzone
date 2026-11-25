(function (MB) {
  const KEY = "memorandum-builder-v1";
  const listeners = new Set();
  const state = {
    ready: false,
    offices: [],
    activeOfficeId: "",
    documents: [],
    activity: [],
    notice: null,
    batchDraft: null,
    files: {},
  };

  function emit() {
    listeners.forEach(function (listener) { listener(); });
  }

  function office() {
    return state.offices.find(function (item) { return item.id === state.activeOfficeId; }) || state.offices[0] || null;
  }

  function persist() {
    const payload = {
      offices: state.offices,
      activeOfficeId: state.activeOfficeId,
      documents: state.documents,
      activity: state.activity,
      batchDraft: state.batchDraft,
      files: state.files,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  }

  function activity(message, tone) {
    return { id: MB.uid("ACT"), at: new Date().toISOString(), message: message, tone: tone || "info" };
  }

  function patchOffice(mutator) {
    state.offices = state.offices.map(function (item) {
      return item.id === state.activeOfficeId ? mutator(item) : item;
    });
  }

  function logoAsset(current) {
    if (!current || !current.branding.logoDataUrl) return null;
    const bytes = MB.dataUrlToBytes(current.branding.logoDataUrl);
    if (!bytes) return null;
    return {
      bytes: bytes,
      png: bytes,
      widthPx: current.branding.widthPx,
      heightPx: current.branding.heightPx,
      placement: current.branding.placement,
      marginTopMm: current.branding.marginTopMm,
      marginSideMm: current.branding.marginSideMm,
    };
  }

  async function rasterizeSvg(svg, width, height) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      await new Promise(function (resolve, reject) {
        image.onload = function () { resolve(); };
        image.onerror = function () { reject(new Error("Logo image could not be read.")); };
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function findPerson(config, raw) {
    if (!raw || !config) return null;
    return (config.personnel || []).find(function (entry) {
      return entry.id === raw || entry.name === raw;
    }) || null;
  }

  function issuingPerson(values, template, config) {
    return findPerson(config, values && values.issuingOfficial)
      || findPerson(config, template && template.defaultOfficial)
      || findPerson(config, ((config && config.issuingOfficialIds) || [])[0]);
  }

  function mergeEmail(values, template, config) {
    if (String((values && values.toEmail) || "").trim()) return "";
    const person = issuingPerson(values, template, config);
    return person && person.email ? String(person.email).trim() : "";
  }

  function templateForRecord(record) {
    let live = null;
    const home = state.offices.find(function (item) { return item.id === record.officeId; });
    const active = office();
    const pools = [];
    if (home) pools.push(home);
    if (active && active !== home) pools.push(active);
    state.offices.forEach(function (item) {
      if (pools.indexOf(item) === -1) pools.push(item);
    });
    for (let index = 0; index < pools.length && !live; index += 1) {
      live = (pools[index].templates || []).find(function (item) { return item.id === record.templateId; }) || null;
    }
    if (!live) return null;
    if (record.templateVersion && record.templateVersion !== live.version) {
      const archived = (live.versions || []).find(function (entry) {
        return entry.version === record.templateVersion && entry.snapshot;
      });
      if (!archived) return live;
      return Object.assign({}, live, archived.snapshot, { id: live.id, version: archived.version });
    }
    return live;
  }

  function csvColumns(rows) {
    const present = new Set();
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (key) { present.add(key); });
    });
    const preferred = ["documentId", "email", "subject", "recipients", "cc", "issuingOfficial", "issuingTitle", "memoDate", "officeName", "region", "airportName"];
    const columns = preferred.filter(function (key) { return present.has(key); });
    const middle = [];
    present.forEach(function (key) {
      if (key !== "body" && preferred.indexOf(key) === -1) middle.push(key);
    });
    middle.sort();
    if (present.has("body")) middle.push("body");
    return columns.concat(middle);
  }

  MB.store = {
    state: state,
    office: office,
    subscribe: function (listener) {
      listeners.add(listener);
      return function () { listeners.delete(listener); };
    },
    dismiss: function () {
      state.notice = null;
      emit();
    },
    note: function (text, tone) {
      state.notice = { tone: tone || "info", text: text };
      emit();
    },
    hydrate: async function () {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (error) { saved = null; }
      if (!saved || !Array.isArray(saved.offices) || !saved.offices.length) {
        const starter = MB.starterOffice();
        starter.branding.logoDataUrl = await rasterizeSvg(MB.MARK_SVG, starter.branding.widthPx, starter.branding.heightPx);
        state.offices = [starter];
        state.activeOfficeId = starter.id;
        state.documents = [];
        state.activity = [activity("Starter office loaded.", "info")];
        state.files = {};
        persist();
      } else {
        state.offices = saved.offices;
        state.activeOfficeId = saved.activeOfficeId || saved.offices[0].id;
        state.documents = saved.documents || [];
        state.activity = saved.activity || [];
        state.batchDraft = saved.batchDraft || null;
        state.files = saved.files || {};
        const current = office();
        if (current && !current.branding.logoDataUrl) {
          current.branding.logoDataUrl = await rasterizeSvg(MB.MARK_SVG, current.branding.widthPx, current.branding.heightPx);
          persist();
        }
      }
      state.ready = true;
      emit();
    },
    setOffice: function (id) {
      state.activeOfficeId = id;
      state.notice = { tone: "info", text: "Office changed. Templates and routing now come from that office." };
      persist();
      emit();
    },
    putFile: function (id, bytes) {
      state.files[id] = MB.bytesToBase64(bytes);
    },
    getFile: function (id) {
      return state.files[id] ? MB.base64ToBytes(state.files[id]) : null;
    },
    saveTemplate: function (template, mode, note) {
      const issues = MB.validateTemplateConfig(template);
      if (issues.length) {
        state.notice = { tone: "danger", text: issues[0] };
        emit();
        return issues;
      }
      const current = office();
      const previous = current.templates.find(function (item) { return item.id === template.id; });
      const version = (previous ? previous.version : 0) + 1;
      const snapshot = MB.snapshotOf(Object.assign({}, template, { status: mode }));
      const next = Object.assign({}, template, snapshot, {
        version: version,
        status: mode,
        publishedVersion: mode === "published" ? version : (previous ? previous.publishedVersion : null),
        updatedAt: new Date().toISOString(),
        versions: [{ version: version, status: mode, savedAt: new Date().toISOString(), note: note || mode, snapshot: snapshot }].concat(previous ? previous.versions : []),
      });
      patchOffice(function (item) {
        const templates = item.templates.some(function (entry) { return entry.id === next.id; })
          ? item.templates.map(function (entry) { return entry.id === next.id ? next : entry; })
          : [next].concat(item.templates);
        return Object.assign({}, item, { templates: templates });
      });
      state.activity = [activity((mode === "published" ? "Published " : "Saved ") + next.name + " v" + version + ".", "success")].concat(state.activity).slice(0, 40);
      state.notice = { tone: "success", text: next.name + " saved as v" + version + ". Earlier versions were kept." };
      persist();
      emit();
      return [];
    },
    createBlank: function () {
      const id = MB.uid("TPL").toLowerCase();
      const blank = {
        id: id,
        name: "Untitled memorandum",
        category: "General",
        description: "",
        subjectFormat: "{{subjectLine}}",
        defaultRecipients: "",
        defaultCc: "",
        defaultOfficial: office().config.issuingOfficialIds[0] || "",
        body: "{{bodyText}}",
        fields: [
          { id: "subjectLine", label: "Subject", type: "text", required: true, guided: true, defaultValue: "" },
          { id: "bodyText", label: "Body", type: "textarea", required: true, guided: true, defaultValue: "" },
        ],
        formatting: MB.defaultFormatting(),
        status: "draft",
        sourceDocxId: null,
        useOriginalPackage: false,
        importWarnings: [],
        version: 0,
        publishedVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [],
      };
      MB.store.saveTemplate(blank, "draft", "Created blank template");
      return id;
    },
    importDocx: async function (file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const read = await MB.readDocxPackage(bytes);
      const sourceDocxId = MB.uid("SRC");
      MB.store.putFile(sourceDocxId, bytes);
      const id = MB.uid("TPL").toLowerCase();
      const template = {
        id: id,
        name: file.name.replace(/\.docx$/i, ""),
        category: "Imported",
        description: "Imported from a Word memorandum. Select text and turn it into placeholders.",
        subjectFormat: "{{subjectLine}}",
        defaultRecipients: "",
        defaultCc: "",
        defaultOfficial: "",
        body: read.inspection.paragraphs.join("\n\n") || "Imported document had no readable paragraphs.",
        fields: [{ id: "subjectLine", label: "Subject", type: "text", required: true, guided: true, defaultValue: "" }],
        formatting: MB.defaultFormatting(),
        status: "draft",
        sourceDocxId: sourceDocxId,
        useOriginalPackage: true,
        importWarnings: read.inspection.warnings,
        version: 0,
        publishedVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [],
      };
      MB.store.saveTemplate(template, "draft", "Imported " + file.name);
      state.notice = { tone: read.inspection.warnings.length ? "warning" : "success", text: "Word file imported. Select text to turn into fields." };
      persist();
      emit();
      return id;
    },
    markPlaceholder: async function (template, literal, fieldId) {
      const token = "{{" + fieldId + "}}";
      let nextBody = template.body.includes(literal) ? template.body.replace(literal, token) : template.body;
      let warnings = template.importWarnings.slice();
      let sourceDocxId = template.sourceDocxId;
      let useOriginal = template.useOriginalPackage;
      if (template.sourceDocxId) {
        const original = MB.store.getFile(template.sourceDocxId);
        if (!original) {
          warnings.push("The original Word package is no longer stored, so only the working text was updated.");
          useOriginal = false;
        } else {
          const replaced = await MB.replaceLiteralInDocx(original, literal, token);
          if (!replaced.found) {
            warnings.push("“" + literal + "” was not found as a continuous phrase in the Word package. Generation will build a new document.");
            useOriginal = false;
          } else {
            sourceDocxId = MB.uid("SRC");
            MB.store.putFile(sourceDocxId, replaced.bytes);
            useOriginal = true;
          }
        }
      }
      if (!template.fields.some(function (field) { return field.id === fieldId; })) {
        template = Object.assign({}, template, {
          fields: template.fields.concat([{ id: fieldId, label: fieldId, type: "text", required: false, guided: true, defaultValue: "" }]),
        });
      }
      return Object.assign({}, template, { body: nextBody, sourceDocxId: sourceDocxId, useOriginalPackage: useOriginal, importWarnings: warnings });
    },
    generate: async function (input) {
      const current = office();
      const template = current.templates.find(function (item) { return item.id === input.templateId; });
      if (!template) return { documentId: "", warnings: [], errors: ["Choose a template that exists in this office."] };
      const issues = MB.validateFieldValues(template, input.values, input.mode);
      if (input.mode === "guided" && issues.length) return { documentId: "", warnings: [], errors: issues.map(function (issue) { return issue.message; }) };
      if (input.mode === "full") {
        const blocking = issues.filter(function (issue) { return issue.fieldId === "memoDate"; });
        if (blocking.length) return { documentId: "", warnings: [], errors: blocking.map(function (issue) { return issue.message; }) };
      }
      const documentId = input.existingDocumentId || MB.uid("MEMO");
      const values = Object.assign(MB.initialValues(template, current.config), input.values);
      const memo = MB.resolveMemorandum({
        template: template,
        config: current.config,
        values: values,
        mode: input.mode,
        documentId: documentId,
        brandingVersion: current.branding.version,
        overrides: input.overrides,
      });
      const warnings = template.importWarnings.slice();
      const errors = [];
      const logo = logoAsset(current);
      if (!logo) warnings.push("No branding image is embedded. Add a logo before treating this as a finished memorandum.");
      let docxBytes = null;
      let pdfBytes = null;
      if (input.formats.includes("docx")) {
        try {
          const usePackage = template.useOriginalPackage && template.sourceDocxId && input.mode === "guided" && !(input.overrides && input.overrides.body);
          if (usePackage) {
            const source = MB.store.getFile(template.sourceDocxId);
            if (!source) {
              warnings.push("The original Word package could not be found. A new DOCX was built from the template wording.");
              docxBytes = await MB.buildMemorandumDocx(memo, logo);
            } else {
              const filled = await MB.fillDocxTokens(source, MB.tokenMapForPackage(memo, template, values, current.config));
              docxBytes = filled.bytes;
              if (filled.unresolved.length) warnings.push("Placeholders still in the Word package: " + filled.unresolved.join(", ") + ".");
              const audit = await MB.auditDocxAssets(docxBytes);
              if (audit.external.length) {
                warnings.push("The Word package pointed at an external file, so a self-contained DOCX was built instead.");
                docxBytes = await MB.buildMemorandumDocx(memo, logo);
              }
            }
          } else {
            docxBytes = await MB.buildMemorandumDocx(memo, logo);
          }
          const audit = await MB.auditDocxAssets(docxBytes);
          if (audit.external.length) {
            errors.push("DOCX generation was rejected because it still links an external image.");
            docxBytes = null;
          }
        } catch (error) {
          errors.push("Word file failed: " + (error.message || "unknown error"));
        }
      }
      let signatureField = false;
      if (input.formats.includes("pdf")) {
        try {
          pdfBytes = await MB.buildMemorandumPdf(memo, logo);
          signatureField = MB.pdfHasSignatureField(pdfBytes);
          if (!signatureField) errors.push("PDF was created but the digital signature field could not be verified.");
        } catch (error) {
          errors.push("PDF failed: " + (error.message || "unknown error"));
          pdfBytes = null;
        }
      }
      if (!docxBytes && !pdfBytes && input.formats.length) {
        state.notice = { tone: "danger", text: errors[0] || "Generation failed." };
        emit();
        return { documentId: "", warnings: warnings, errors: errors };
      }
      if (docxBytes) MB.store.putFile(documentId + ":docx", docxBytes);
      if (pdfBytes) MB.store.putFile(documentId + ":pdf", pdfBytes);
      const taken = new Set(state.documents.filter(function (doc) { return doc.documentId !== documentId; }).flatMap(function (doc) {
        return [doc.filenameDocx, doc.filenamePdf].filter(Boolean).map(function (name) { return name.toLowerCase(); });
      }));
      const stem = documentId + "_" + (values.airport || "office") + "_" + template.name;
      const record = {
        documentId: documentId,
        officeId: current.id,
        batchId: input.batchId || null,
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        brandingVersion: current.branding.version,
        configVersion: current.config.version,
        generatedAt: new Date().toISOString(),
        filenameDocx: docxBytes ? MB.uniqueFilename(stem, "docx", taken) : "",
        filenamePdf: pdfBytes ? MB.uniqueFilename(stem, "pdf", taken) : "",
        hasDocx: Boolean(docxBytes),
        hasPdf: Boolean(pdfBytes),
        subject: memo.subject,
        status: docxBytes || pdfBytes ? "generated" : "draft",
        mode: input.mode,
        fieldValues: values,
        warnings: warnings,
        signatureField: signatureField,
      };
      state.documents = [record].concat(state.documents.filter(function (doc) { return doc.documentId !== documentId; }));
      state.activity = [activity((docxBytes || pdfBytes ? "Generated " : "Saved draft ") + documentId + ".", errors.length ? "warning" : "success")].concat(state.activity).slice(0, 40);
      state.notice = { tone: errors.length ? "warning" : "success", text: errors.length ? documentId + " finished with errors. " + errors[0] : documentId + " is ready to download." };
      persist();
      emit();
      return { documentId: documentId, warnings: warnings, errors: errors };
    },
    download: function (documentId, kind) {
      const doc = state.documents.find(function (item) { return item.documentId === documentId; });
      const bytes = MB.store.getFile(documentId + ":" + kind);
      if (!doc || !bytes) {
        state.notice = { tone: "danger", text: "That file is not in local storage." };
        emit();
        return;
      }
      const name = kind === "docx" ? doc.filenameDocx : doc.filenamePdf;
      const type = kind === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
      MB.downloadBlob(name || documentId + "." + kind, new Blob([bytes], { type: type }));
    },
    exportCsv: function (documentIds) {
      const ids = Array.isArray(documentIds) ? documentIds : [];
      const current = office();
      if (!current) {
        state.notice = { tone: "danger", text: "No office is loaded." };
        emit();
        return "";
      }
      const rows = [];
      let skipped = 0;
      ids.forEach(function (documentId) {
        const record = state.documents.find(function (doc) { return doc.documentId === documentId; });
        if (!record) {
          skipped += 1;
          return;
        }
        const template = templateForRecord(record);
        if (!template) {
          skipped += 1;
          return;
        }
        const values = record.fieldValues || {};
        const memo = MB.resolveMemorandum({
          template: template,
          config: current.config,
          values: values,
          documentId: record.documentId,
          brandingVersion: record.brandingVersion,
        });
        const map = MB.tokenMapForPackage(memo, template, values, current.config);
        const row = {};
        Object.keys(map).forEach(function (key) {
          row[String(key).replaceAll(".", "_")] = map[key] == null ? "" : String(map[key]);
        });
        row.documentId = record.documentId;
        row.templateName = memo.templateName || record.templateName || "";
        row.generatedAt = record.generatedAt || "";
        row.email = mergeEmail(values, template, current.config);
        rows.push(row);
      });
      if (!rows.length) {
        state.notice = { tone: "warning", text: skipped ? "No memorandums could be exported." : "Nothing to export." };
        emit();
        return "";
      }
      const csv = MB.toCsv(rows, csvColumns(rows));
      const filename = "memorandum-merge-" + MB.todayIso() + ".csv";
      MB.downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const noun = rows.length === 1 ? "memorandum" : "memorandums";
      state.notice = {
        tone: skipped ? "warning" : "success",
        text: skipped
          ? "Exported " + rows.length + " " + noun + ". " + skipped + " could not be rebuilt."
          : "Exported " + rows.length + " " + noun + " to " + filename + ".",
      };
      emit();
      return csv;
    },
    setDocumentStatus: function (documentId, status) {
      state.documents = state.documents.map(function (doc) {
        return doc.documentId === documentId ? Object.assign({}, doc, { status: status }) : doc;
      });
      persist();
      emit();
    },
    setBatch: function (draft) {
      state.batchDraft = draft;
      persist();
      emit();
    },
    generateBatch: async function () {
      const draft = state.batchDraft;
      const current = office();
      const template = current.templates.find(function (item) { return item.id === (draft && draft.templateId); });
      if (!draft || !template) {
        state.notice = { tone: "danger", text: "Import a batch before generating." };
        emit();
        return;
      }
      const included = draft.records.filter(function (record) { return record.included; });
      const invalid = included.filter(function (record) { return MB.validateFieldValues(template, record.values, "guided").length; });
      if (draft.allOrNothing && invalid.length) {
        state.notice = { tone: "danger", text: "All-or-nothing is on, and at least one included record is invalid. Nothing was generated." };
        emit();
        return;
      }
      let made = 0;
      for (const record of draft.records) {
        if (!record.included) continue;
        if (MB.validateFieldValues(template, record.values, "guided").length) continue;
        const result = await MB.store.generate({
          templateId: template.id,
          values: Object.assign(MB.initialValues(template, current.config), record.values),
          mode: "guided",
          formats: ["docx", "pdf"],
          batchId: draft.batchId,
        });
        if (result.documentId) made += 1;
      }
      state.notice = { tone: made ? "success" : "warning", text: "Batch " + draft.batchId + " produced " + made + " memorandum" + (made === 1 ? "" : "s") + "." };
      persist();
      emit();
    },
    updateBranding: async function (file, placement) {
      const current = office();
      const url = URL.createObjectURL(file);
      const image = new Image();
      await new Promise(function (resolve, reject) {
        image.onload = function () { resolve(); };
        image.onerror = function () { reject(new Error("That image could not be read. Use PNG, JPEG, or SVG.")); };
        image.src = url;
      });
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 320 / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      const snapshot = {
        logoDataUrl: canvas.toDataURL("image/png"),
        logoName: file.name,
        widthPx: width,
        heightPx: height,
        placement: placement || current.branding.placement,
        marginTopMm: current.branding.marginTopMm,
        marginSideMm: current.branding.marginSideMm,
      };
      const version = current.branding.version + 1;
      patchOffice(function (item) {
        return Object.assign({}, item, {
          branding: Object.assign({}, snapshot, {
            version: version,
            versions: [{ version: version, savedAt: new Date().toISOString(), note: "Logo updated", snapshot: snapshot }].concat(item.branding.versions),
          }),
        });
      });
      state.notice = { tone: "success", text: "Logo saved as branding v" + version + ". The previous logo was kept." };
      persist();
      emit();
    },
    saveConfig: function (config) {
      const current = office();
      const snapshot = {
        officeName: config.officeName,
        region: config.region,
        airports: config.airports,
        personnel: config.personnel,
        routing: config.routing,
        defaultRecipients: config.defaultRecipients,
        defaultCc: config.defaultCc,
        issuingOfficialIds: config.issuingOfficialIds,
        terminology: config.terminology,
      };
      const version = current.config.version + 1;
      const personnelIds = new Set((snapshot.personnel || []).map(function (person) { return person.id; }));
      const fallbackOfficial = (snapshot.issuingOfficialIds && snapshot.issuingOfficialIds[0]) || "";
      patchOffice(function (item) {
        return Object.assign({}, item, {
          templates: item.templates.map(function (template) {
            if (personnelIds.has(template.defaultOfficial)) return template;
            if ((template.defaultOfficial || "") === fallbackOfficial) return template;
            return Object.assign({}, template, { defaultOfficial: fallbackOfficial });
          }),
          config: Object.assign({}, snapshot, {
            version: version,
            versions: [{ version: version, savedAt: new Date().toISOString(), note: "Configuration saved", snapshot: snapshot }].concat(item.config.versions),
          }),
        });
      });
      state.notice = { tone: "success", text: "Configuration saved as v" + version + "." };
      persist();
      emit();
    },
    exportPackage: async function () {
      const zip = new JSZip();
      zip.file("office.json", JSON.stringify({
        offices: state.offices,
        activeOfficeId: state.activeOfficeId,
        documents: state.documents,
        activity: state.activity,
        batchDraft: state.batchDraft,
      }, null, 2));
      const files = zip.folder("files");
      Object.keys(state.files).forEach(function (id) {
        files.file(encodeURIComponent(id), MB.base64ToBytes(state.files[id]));
      });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      MB.downloadBlob("memorandum-office.zip", blob);
    },
    importPackage: async function (file) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const jsonFile = zip.file("office.json");
      if (!jsonFile) throw new Error("That package has no office.json.");
      const parsed = JSON.parse(await jsonFile.async("string"));
      const files = {};
      const folder = zip.folder("files");
      if (folder) {
        const names = Object.keys(zip.files).filter(function (name) { return name.startsWith("files/") && !zip.files[name].dir; });
        for (const name of names) {
          const bytes = await zip.file(name).async("uint8array");
          files[decodeURIComponent(name.slice("files/".length))] = MB.bytesToBase64(bytes);
        }
      }
      state.offices = parsed.offices;
      state.activeOfficeId = parsed.activeOfficeId;
      state.documents = parsed.documents || [];
      state.activity = parsed.activity || [];
      state.batchDraft = parsed.batchDraft || null;
      state.files = files;
      state.notice = { tone: "success", text: "Office package imported." };
      persist();
      emit();
    },
    reset: async function () {
      localStorage.removeItem(KEY);
      state.ready = false;
      await MB.store.hydrate();
    },
  };
})(window.MB = window.MB || {});
