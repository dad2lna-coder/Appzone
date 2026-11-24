(function (MB) {
  MB.FIELD_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

  MB.defaultFormatting = function () {
    return {
      title: "MEMORANDUM",
      labels: { to: "TO", from: "FROM", cc: "CC", date: "DATE", subject: "SUBJECT" },
      includeHeader: true,
    };
  };

  MB.snapshotOf = function (template) {
    return {
      name: template.name,
      category: template.category,
      description: template.description,
      subjectFormat: template.subjectFormat,
      defaultRecipients: template.defaultRecipients,
      defaultCc: template.defaultCc,
      defaultOfficial: template.defaultOfficial,
      body: template.body,
      fields: structuredClone(template.fields),
      formatting: structuredClone(template.formatting),
      status: template.status,
      sourceDocxId: template.sourceDocxId,
      useOriginalPackage: template.useOriginalPackage,
      importWarnings: template.importWarnings.slice(),
    };
  };

  function displayValue(field, raw, config) {
    if (!raw) return "";
    if (!field) return raw;
    if (field.type === "date") return MB.formatLongDate(raw);
    if (field.type === "dateRange") {
      const parts = raw.split("|");
      if (parts[0] && parts[1]) return MB.formatLongDate(parts[0]) + " – " + MB.formatLongDate(parts[1]);
    }
    if (field.type === "personnel") {
      const person = config.personnel.find(function (entry) { return entry.id === raw; });
      if (person) return person.title ? person.name + ", " + person.title : person.name;
    }
    return raw;
  }

  MB.derivedTokens = function (values, config) {
    const airport = config.airports.find(function (entry) { return entry.code === values.airport; });
    const official = config.personnel.find(function (entry) {
      return entry.id === values.issuingOfficial || entry.name === values.issuingOfficial;
    });
    const tokens = {
      officeName: config.officeName,
      region: config.region,
      airportName: airport ? airport.name : "",
      issuingTitle: official ? official.title : "",
    };
    Object.keys(config.terminology || {}).forEach(function (key) {
      tokens["term." + key] = config.terminology[key];
    });
    tokens.routingBlock = (config.routing || []).map(function (entry) {
      return entry.label + ": " + entry.value;
    }).join("\n");
    return tokens;
  };

  MB.applyTokens = function (text, tokens) {
    const entries = Object.entries(tokens).sort(function (a, b) { return b[0].length - a[0].length; });
    let next = text || "";
    entries.forEach(function (entry) {
      next = next.split("{{" + entry[0] + "}}").join(entry[1] == null ? "" : String(entry[1]));
    });
    return next;
  };

  MB.validateFieldValues = function (template, values, mode) {
    const issues = [];
    template.fields.forEach(function (field) {
      const raw = String(values[field.id] || "").trim();
      if (field.required && !raw) {
        issues.push({
          fieldId: field.id,
          message: mode === "guided" && !field.guided
            ? field.label + " is required, but guided mode does not allow editing it and it has no value."
            : field.label + " is required.",
        });
      }
      if (!raw) return;
      if (field.type === "date" && !MB.isIsoDate(raw)) {
        issues.push({ fieldId: field.id, message: field.label + " must be a real calendar date." });
      }
      if (field.type === "dateRange") {
        const parts = raw.split("|");
        if (!parts[0] || !parts[1] || !MB.isIsoDate(parts[0]) || !MB.isIsoDate(parts[1])) {
          issues.push({ fieldId: field.id, message: field.label + " needs a start and end date." });
        } else if (parts[0] > parts[1]) {
          issues.push({ fieldId: field.id, message: field.label + " ends before it starts." });
        }
      }
    });
    const memoDate = String(values.memoDate || "").trim();
    if (memoDate && !MB.isIsoDate(memoDate)) {
      issues.push({ fieldId: "memoDate", message: "Memorandum date must be a real calendar date." });
    }
    return issues;
  };

  MB.validateTemplateConfig = function (template) {
    const issues = [];
    if (!String(template.name || "").trim()) issues.push("Template name is required.");
    if (!String(template.subjectFormat || "").trim()) issues.push("Subject format is required.");
    if (!String(template.body || "").trim()) issues.push("Standard body wording is required.");
    const seen = new Set();
    template.fields.forEach(function (field) {
      if (!MB.FIELD_ID_PATTERN.test(field.id)) issues.push('Field id "' + field.id + '" must start with a letter and use only letters, numbers, and underscores.');
      if (seen.has(field.id)) issues.push('Field id "' + field.id + '" is duplicated.');
      seen.add(field.id);
      if (field.required && !field.guided && !String(field.defaultValue || "").trim()) {
        issues.push((field.label || field.id) + " is required but hidden in guided mode and has no default.");
      }
    });
    return issues;
  };

  MB.initialValues = function (template, config) {
    const values = {
      recipients: template.defaultRecipients || config.defaultRecipients,
      cc: template.defaultCc || config.defaultCc,
      issuingOfficial: template.defaultOfficial || config.issuingOfficialIds[0] || "",
      memoDate: MB.todayIso(),
    };
    template.fields.forEach(function (field) {
      values[field.id] = field.defaultValue || "";
    });
    return values;
  };

  MB.resolveMemorandum = function (input) {
    const template = input.template;
    const config = input.config;
    const values = input.values;
    const fieldTokens = {};
    template.fields.forEach(function (field) {
      fieldTokens[field.id] = displayValue(field, values[field.id] || "", config);
    });
    const officialRaw = values.issuingOfficial || template.defaultOfficial;
    const official = config.personnel.find(function (entry) { return entry.id === officialRaw; });
    const officialText = official ? (official.title ? official.name + ", " + official.title : official.name) : officialRaw;
    const baseTokens = Object.assign({}, MB.derivedTokens(values, config), fieldTokens, {
      recipients: values.recipients || template.defaultRecipients,
      cc: values.cc || template.defaultCc,
      issuingOfficial: officialText,
      memoDate: values.memoDate ? MB.formatLongDate(values.memoDate) : "",
    });
    const subject = MB.applyTokens(template.subjectFormat, Object.assign({}, baseTokens, { subject: "" })).trim();
    baseTokens.subject = subject;
    const memo = {
      documentId: input.documentId,
      subject: subject,
      officeName: config.officeName,
      region: config.region,
      recipients: baseTokens.recipients || "",
      cc: baseTokens.cc || "",
      issuingOfficial: officialText,
      memoDate: baseTokens.memoDate || "",
      body: MB.applyTokens(template.body, baseTokens).trim(),
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version,
      brandingVersion: input.brandingVersion,
      configVersion: config.version,
      formatting: template.formatting,
    };
    if (input.mode === "full" && input.overrides) {
      ["subject", "body", "recipients", "cc", "issuingOfficial"].forEach(function (key) {
        if (input.overrides[key] !== undefined) memo[key] = input.overrides[key];
      });
      if (input.overrides.memoDate !== undefined) {
        memo.memoDate = MB.isIsoDate(input.overrides.memoDate) ? MB.formatLongDate(input.overrides.memoDate) : input.overrides.memoDate;
      }
    }
    return memo;
  };

  MB.tokenMapForPackage = function (memo, template, values, config) {
    const map = {
      subject: memo.subject,
      recipients: memo.recipients,
      cc: memo.cc,
      issuingOfficial: memo.issuingOfficial,
      memoDate: memo.memoDate,
      officeName: memo.officeName,
      region: memo.region,
      body: memo.body,
    };
    Object.assign(map, MB.derivedTokens(values, config));
    template.fields.forEach(function (field) {
      map[field.id] = displayValue(field, values[field.id] || "", config);
    });
    return map;
  };

  MB.valuesFromRecord = function (record, template) {
    function text(value) {
      if (value === null || value === undefined) return "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
      return "";
    }
    const values = {
      recipients: text(record.recipients) || template.defaultRecipients,
      cc: text(record.cc) || template.defaultCc,
      issuingOfficial: text(record.issuingOfficial) || template.defaultOfficial,
      memoDate: text(record.memoDate),
    };
    template.fields.forEach(function (field) {
      values[field.id] = text(record[field.id]) || field.defaultValue || "";
    });
    return values;
  };

  MB.parseBatchJson = function (text, templates) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) {
      return { draft: null, fileErrors: ["The file is not valid JSON."] };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { draft: null, fileErrors: ["Batch file must be a JSON object."] };
    }
    const fileErrors = [];
    if (typeof parsed.templateId !== "string" || !parsed.templateId.trim()) fileErrors.push("templateId is required.");
    if (!Array.isArray(parsed.records)) fileErrors.push("records must be an array.");
    const template = templates.find(function (item) { return item.id === parsed.templateId; });
    if (parsed.templateId && !template) fileErrors.push('No template is loaded with id "' + parsed.templateId + '".');
    if (fileErrors.length || !template) return { draft: null, fileErrors: fileErrors };
    const records = parsed.records.map(function (entry, index) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return { key: "row-" + (index + 1), included: false, values: {}, source: entry };
      }
      return {
        key: entry.recordId ? String(entry.recordId) : "row-" + (index + 1),
        included: true,
        values: MB.valuesFromRecord(entry, template),
        source: entry,
      };
    });
    return {
      draft: {
        batchId: parsed.batchId ? String(parsed.batchId) : MB.uid("BATCH"),
        templateId: template.id,
        allOrNothing: Boolean(parsed.allOrNothing),
        records: records,
        fileName: "",
      },
      fileErrors: [],
    };
  };
})(window.MB = window.MB || {});
