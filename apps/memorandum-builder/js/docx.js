(function (MB) {
  const WORD_XML = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;
  const COMPLEX = [
    { pattern: /<w:tbl[\s>]/, message: "Tables are kept in the original package. Cell text can become a placeholder, but table layout is not rebuilt by the fallback generator." },
    { pattern: /<w:drawing[\s>]/, message: "Drawings or images were found. They stay in the original DOCX package and are not reconstructed if generation falls back to a new document." },
    { pattern: /<w:pict[\s>]/, message: "Legacy VML pictures were found. They are preserved only while the original package can be updated." },
    { pattern: /<w:txbxContent[\s>]/, message: "Text boxes were found. Their text is included when it is stored as normal runs; floating position is not edited visually." },
    { pattern: /<mc:AlternateContent[\s>]/, message: "Alternate content blocks were found. Replacement touches the text runs inside them and may not update every fallback branch." },
  ];

  function paragraphsFromXml(xml) {
    return xml.split(/<\/w:p>/).map(function (paragraph) {
      return [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(function (match) {
        return MB.decodeXml(match[1] || "");
      }).join("");
    }).filter(function (line) { return line.trim(); });
  }

  MB.inspectWordXml = function (xmlFiles) {
    const joined = xmlFiles.join("\n");
    const paragraphs = xmlFiles.flatMap(paragraphsFromXml);
    const warnings = COMPLEX.filter(function (item) { return item.pattern.test(joined); }).map(function (item) { return item.message; });
    if (!paragraphs.length) warnings.push("No paragraph text could be read. The file may be empty or use a structure this importer does not extract.");
    return { paragraphs: paragraphs, warnings: warnings };
  };

  MB.replaceLiteralInWordXml = function (xml, literal, replacement) {
    if (!literal) return { xml: xml, found: false };
    const escapedLiteral = MB.escapeXml(literal);
    if (xml.includes(escapedLiteral)) {
      return { xml: xml.split(escapedLiteral).join(MB.escapeXml(replacement)), found: true };
    }
    let found = false;
    const next = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, function (paragraph) {
      const texts = [...paragraph.matchAll(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g)];
      const combined = texts.map(function (match) { return MB.decodeXml(match[2] || ""); }).join("");
      if (!combined.includes(literal)) return paragraph;
      found = true;
      const updated = combined.replace(literal, replacement);
      let used = false;
      return paragraph.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, function (_full, attrs) {
        if (!used) {
          used = true;
          const attr = attrs && attrs.includes("xml:space") ? attrs : (attrs || "") + ' xml:space="preserve"';
          return "<w:t" + attr + ">" + MB.escapeXml(updated) + "</w:t>";
        }
        return "<w:t" + (attrs || "") + "></w:t>";
      });
    });
    return { xml: next, found: found };
  };

  MB.replaceTokensInWordXml = function (xml, tokens) {
    let next = xml;
    Object.entries(tokens).sort(function (a, b) { return b[0].length - a[0].length; }).forEach(function (entry) {
      const token = "{{" + entry[0] + "}}";
      if (next.includes(token)) next = next.split(token).join(MB.escapeXml(entry[1] == null ? "" : String(entry[1])));
    });
    return next;
  };

  async function transformDocxPackage(bytes, mutate) {
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter(function (name) { return WORD_XML.test(name); });
    for (const name of names) {
      const file = zip.file(name);
      if (!file) continue;
      zip.file(name, mutate(name, await file.async("string")));
    }
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }

  MB.readDocxPackage = async function (bytes) {
    const zip = await JSZip.loadAsync(bytes);
    const fileNames = Object.keys(zip.files);
    const xmlFiles = [];
    for (const name of fileNames.filter(function (item) { return WORD_XML.test(item); })) {
      const file = zip.file(name);
      if (file) xmlFiles.push(await file.async("string"));
    }
    return { inspection: MB.inspectWordXml(xmlFiles), fileNames: fileNames };
  };

  MB.replaceLiteralInDocx = async function (bytes, literal, replacement) {
    let found = false;
    const next = await transformDocxPackage(bytes, function (_name, xml) {
      const result = MB.replaceLiteralInWordXml(xml, literal, replacement);
      if (result.found) found = true;
      return result.xml;
    });
    return { bytes: next, found: found };
  };

  MB.fillDocxTokens = async function (bytes, tokens) {
    const unresolved = new Set();
    const next = await transformDocxPackage(bytes, function (_name, xml) {
      const replaced = MB.replaceTokensInWordXml(xml, tokens);
      for (const match of replaced.matchAll(/\{\{([A-Za-z][\w.]*)\}\}/g)) unresolved.add(match[1]);
      return replaced;
    });
    return { bytes: next, unresolved: [...unresolved] };
  };

  MB.auditDocxAssets = async function (bytes) {
    const zip = await JSZip.loadAsync(bytes);
    const embedded = Object.keys(zip.files).filter(function (name) { return name.startsWith("word/media/"); });
    const external = [];
    for (const name of Object.keys(zip.files).filter(function (item) { return item.endsWith(".rels"); })) {
      const file = zip.file(name);
      if (!file) continue;
      const xml = await file.async("string");
      for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
        if (!match[0].includes('TargetMode="External"')) continue;
        external.push(/Target="([^"]*)"/.exec(match[0])?.[1] || match[0]);
      }
    }
    return { embedded: embedded, external: external };
  };

  function paragraph(text, opts) {
    const bold = opts && opts.bold ? "<w:b/>" : "";
    const size = (opts && opts.size) || 22;
    const color = opts && opts.color ? '<w:color w:val="' + opts.color + '"/>' : "";
    const after = opts && opts.after != null ? opts.after : 120;
    return '<w:p><w:pPr><w:spacing w:after="' + after + '"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>' + bold + '<w:sz w:val="' + size + '"/>' + color + '</w:rPr><w:t xml:space="preserve">' + MB.escapeXml(text) + "</w:t></w:r></w:p>";
  }

  function logoParagraph(widthPx, heightPx) {
    const cx = Math.round(widthPx * 9525);
    const cy = Math.round(heightPx * 9525);
    return '<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }

  MB.buildMemorandumDocx = async function (memo, logo) {
    const zip = new JSZip();
    const hasLogo = Boolean(memo.formatting.includeHeader && logo && logo.bytes && logo.bytes.length);
    const labels = memo.formatting.labels;
    const body = [logoParagraph && hasLogo ? logoParagraph(logo.widthPx, logo.heightPx) : "", paragraph(memo.formatting.title || "MEMORANDUM", { bold: true, size: 32, after: 240 }), paragraph(labels.to + ": " + memo.recipients), paragraph(labels.from + ": " + memo.issuingOfficial), paragraph(labels.cc + ": " + (memo.cc || "—")), paragraph(labels.date + ": " + memo.memoDate), paragraph(labels.subject + ": " + memo.subject, { bold: true, after: 280 })].concat(String(memo.body || "").split("\n").map(function (line) {
      return paragraph(line.length ? line : " ", { after: line.trim() ? 160 : 80 });
    })).concat([paragraph(memo.documentId + "  ·  " + memo.templateName + " v" + memo.templateVersion + "  ·  branding v" + memo.brandingVersion, { size: 16, color: "62758E", after: 0 })]).join("");
    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + body + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
    zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' + (hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : "") + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/document.xml", documentXml);
    zip.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + (hasLogo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : "") + "</Relationships>");
    if (hasLogo) zip.file("word/media/logo.png", logo.bytes);
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  };
})(window.MB = window.MB || {});
