(function (MB) {
  function clean(text) {
    return String(text || "").replace(/\u2013|\u2014/g, "-").replace(/[^\n\r\t\x20-\x7e]/g, "");
  }

  function wrap(text, font, size, maxWidth) {
    const lines = [];
    String(clean(text)).split(/\n/).forEach(function (paragraph) {
      if (!paragraph.trim()) {
        lines.push("");
        return;
      }
      let line = "";
      paragraph.split(/\s+/).forEach(function (word) {
        const next = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
    });
    return lines;
  }

  MB.addEmptySignatureField = function (pdf, page, rect, fieldName) {
    const PDFName = PDFLib.PDFName;
    const PDFString = PDFLib.PDFString;
    const ctx = pdf.context;
    const widget = ctx.obj({
      Type: "Annot",
      Subtype: "Widget",
      FT: "Sig",
      Rect: rect,
      T: PDFString.of(fieldName),
      F: 4,
      P: page.ref,
    });
    const ref = ctx.register(widget);
    const existing = page.node.get(PDFName.of("Annots"));
    if (existing) {
      const array = pdf.context.lookup(existing);
      if (array && typeof array.push === "function") array.push(ref);
    } else {
      page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
    }
    const acroExisting = pdf.catalog.get(PDFName.of("AcroForm"));
    if (acroExisting) {
      const acro = pdf.context.lookup(acroExisting, PDFLib.PDFDict);
      const fields = acro.get(PDFName.of("Fields"));
      if (fields) {
        const list = pdf.context.lookup(fields);
        if (list && typeof list.push === "function") list.push(ref);
      } else {
        acro.set(PDFName.of("Fields"), ctx.obj([ref]));
      }
    } else {
      pdf.catalog.set(PDFName.of("AcroForm"), ctx.obj({ Fields: [ref], SigFlags: 3 }));
    }
  };

  MB.pdfHasSignatureField = function (bytes) {
    const raw = new TextDecoder("latin1").decode(bytes);
    return raw.includes("/FT /Sig") && raw.includes("/AcroForm") && raw.includes("/Subtype /Widget");
  };

  MB.buildMemorandumPdf = async function (memo, logo) {
    const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.TimesRoman);
    const fontBold = await pdf.embedFont(PDFLib.StandardFonts.TimesRomanBold);
    const sans = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const pageWidth = 612;
    const pageHeight = 792;
    const marginX = MB.mmToPoints(logo ? logo.marginSideMm : 19);
    const marginTop = MB.mmToPoints(logo ? logo.marginTopMm : 16);
    const marginBottom = MB.mmToPoints(18);
    const ink = PDFLib.rgb(0.078, 0.169, 0.302);
    const muted = PDFLib.rgb(0.384, 0.459, 0.557);
    const line = PDFLib.rgb(0.843, 0.886, 0.937);
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - marginTop;
    function ensure(needed) {
      if (y - needed < marginBottom) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop;
      }
    }
    if (memo.formatting.includeHeader && logo && logo.png && logo.png.length) {
      const image = await pdf.embedPng(logo.png);
      const width = Math.min(logo.widthPx, pageWidth - marginX * 2);
      const height = width * (logo.heightPx / logo.widthPx);
      let x = marginX;
      if (logo.placement === "center") x = (pageWidth - width) / 2;
      if (logo.placement === "right") x = pageWidth - marginX - width;
      ensure(height + 16);
      page.drawImage(image, { x: x, y: y - height, width: width, height: height });
      y -= height + 16;
    }
    ensure(28);
    page.drawText(clean(memo.formatting.title || "MEMORANDUM"), { x: marginX, y: y - 16, size: 16, font: fontBold, color: ink });
    y -= 28;
    page.drawLine({ start: { x: marginX, y: y }, end: { x: pageWidth - marginX, y: y }, thickness: 1, color: line });
    y -= 16;
    const labels = memo.formatting.labels;
    const rows = [[labels.to, clean(memo.recipients)], [labels.from, clean(memo.issuingOfficial)], [labels.cc, clean(memo.cc || "-")], [labels.date, clean(memo.memoDate)], [labels.subject, clean(memo.subject)]];
    const contentWidth = pageWidth - marginX * 2;
    rows.forEach(function (row) {
      const labelText = row[0] + ": ";
      const labelWidth = sans.widthOfTextAtSize(labelText, 11);
      wrap(row[1] || " ", font, 11, contentWidth - labelWidth).forEach(function (valueLine, index) {
        ensure(16);
        if (index === 0) page.drawText(labelText, { x: marginX, y: y - 11, size: 11, font: sans, color: muted });
        page.drawText(valueLine || "", { x: marginX + labelWidth, y: y - 11, size: 11, font: row[0] === labels.subject ? fontBold : font, color: ink });
        y -= 16;
      });
    });
    y -= 8;
    page.drawLine({ start: { x: marginX, y: y }, end: { x: pageWidth - marginX, y: y }, thickness: 0.6, color: line });
    y -= 18;
    wrap(clean(memo.body || " "), font, 12, contentWidth).forEach(function (bodyLine) {
      ensure(16);
      if (bodyLine) page.drawText(bodyLine, { x: marginX, y: y - 12, size: 12, font: font, color: ink });
      y -= bodyLine ? 16 : 10;
    });
    const boxW = 260;
    const boxH = 62;
    ensure(boxH + 36);
    y -= 18;
    const boxX = marginX;
    const boxY = y - boxH;
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderWidth: 1, borderColor: PDFLib.rgb(0.043, 0.192, 0.373) });
    page.drawText("Digital signature", { x: boxX + 8, y: boxY + boxH - 16, size: 9, font: sans, color: muted });
    page.drawText("Sign in Adobe Acrobat with your PIV card.", { x: boxX + 8, y: boxY + 12, size: 8, font: sans, color: muted });
    MB.addEmptySignatureField(pdf, page, [boxX, boxY, boxX + boxW, boxY + boxH], "IssuerSignature");
    page.drawText(clean(memo.documentId + "  ·  " + memo.templateName + " v" + memo.templateVersion + "  ·  branding v" + memo.brandingVersion), { x: marginX, y: 28, size: 8, font: sans, color: muted });
    pdf.setTitle(memo.subject || memo.documentId);
    pdf.setSubject(memo.documentId);
    pdf.setCreator("Memorandum Builder");
    return pdf.save({ useObjectStreams: false });
  };
})(window.MB = window.MB || {});
