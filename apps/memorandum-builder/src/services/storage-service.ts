import type { PersistedState } from "@/domain/types";

const DB_NAME = "memorandum-builder";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(): Promise<PersistedState | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const tx = db.transaction("kv", "readonly");
  const value = await requestToPromise(tx.objectStore("kv").get("state"));
  db.close();
  return (value as PersistedState | undefined) ?? null;
}

export async function saveState(state: PersistedState): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").put(state, "state");
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function putFile(id: string, data: Uint8Array): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("files", "readwrite");
  tx.objectStore("files").put(data, id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getFile(id: string): Promise<Uint8Array | null> {
  const db = await openDb();
  const tx = db.transaction("files", "readonly");
  const value = await requestToPromise(tx.objectStore("files").get(id));
  db.close();
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value as ArrayBuffer);
}

export async function copyFile(fromId: string, toId: string): Promise<boolean> {
  const data = await getFile(fromId);
  if (!data) return false;
  await putFile(toId, data);
  return true;
}

export async function allFiles(): Promise<Array<{ id: string; data: Uint8Array }>> {
  const db = await openDb();
  const tx = db.transaction("files", "readonly");
  const store = tx.objectStore("files");
  const keys = await requestToPromise(store.getAllKeys());
  const values = await requestToPromise(store.getAll());
  db.close();
  return keys.map((key, index) => ({
    id: String(key),
    data: values[index] instanceof Uint8Array ? (values[index] as Uint8Array) : new Uint8Array(values[index] as ArrayBuffer),
  }));
}

export async function replaceFiles(files: Array<{ id: string; data: Uint8Array }>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("files", "readwrite");
  const store = tx.objectStore("files");
  store.clear();
  for (const file of files) store.put(file.data, file.id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearStorage(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["kv", "files"], "readwrite");
  tx.objectStore("kv").clear();
  tx.objectStore("files").clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function rasterizeSvg(svg: string, width: number, height: number): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Logo image could not be read."));
    });
    image.src = url;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToPngDataUrl(file: File, maxWidth: number): Promise<{ dataUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("That image could not be read. Use PNG, JPEG, or SVG."));
    });
    image.src = url;
    await loaded;
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.drawImage(image, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
