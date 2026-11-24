(function (MB) {
  const AMP = "&" + "amp;";
  const LT = "&" + "lt;";
  const GT = "&" + "gt;";
  const QUOT = "&" + "quot;";

  MB.uid = function (prefix) {
    const time = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return prefix + "-" + time + "-" + rand;
  };

  MB.safeStem = function (value, max) {
    const cleaned = String(value || "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (cleaned || "memorandum").slice(0, max || 72);
  };

  MB.uniqueFilename = function (stem, ext, taken) {
    const base = MB.safeStem(stem);
    let name = base + "." + ext;
    let n = 2;
    while (taken.has(name.toLowerCase())) {
      name = base + "-" + n + "." + ext;
      n += 1;
    }
    taken.add(name.toLowerCase());
    return name;
  };

  MB.formatLongDate = function (iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    if (!match) return iso || "";
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  };

  MB.todayIso = function () {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  };

  MB.isIsoDate = function (value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };

  MB.mmToPoints = function (mm) {
    return (mm / 25.4) * 72;
  };

  MB.escapeXml = function (value) {
    return String(value)
      .replace(/&/g, AMP)
      .replace(/</g, LT)
      .replace(/>/g, GT)
      .replace(/"/g, QUOT);
  };

  MB.decodeXml = function (value) {
    return String(value)
      .replaceAll(QUOT, '"')
      .replaceAll("&" + "apos;", "'")
      .replaceAll(LT, "<")
      .replaceAll(GT, ">")
      .replaceAll(AMP, "&");
  };

  MB.downloadBlob = function (filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  MB.dataUrlToBytes = function (dataUrl) {
    const comma = String(dataUrl || "").indexOf(",");
    if (comma < 0) return null;
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  };

  MB.bytesToBase64 = function (bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  };

  MB.base64ToBytes = function (text) {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  };
})(window.MB = window.MB || {});
