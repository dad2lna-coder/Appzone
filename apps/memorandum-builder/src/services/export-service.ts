import JSZip from "jszip";
import type { PersistedState } from "@/domain/types";
import { allFiles, replaceFiles } from "@/services/storage-service";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function buildExportZip(state: PersistedState): Promise<Blob> {
  const zip = new JSZip();
  zip.file("state.json", JSON.stringify(state, null, 2));
  const files = await allFiles();
  const manifest: Array<{ id: string; file: string }> = [];
  files.forEach((file, index) => {
    const path = `files/${index}.bin`;
    zip.file(path, file.data);
    manifest.push({ id: file.id, file: path });
  });
  zip.file("files.json", JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function readExportZip(buffer: ArrayBuffer): Promise<PersistedState> {
  const zip = await JSZip.loadAsync(buffer);
  const stateFile = zip.file("state.json");
  if (!stateFile) throw new Error("Package is missing state.json.");
  const state = JSON.parse(await stateFile.async("string")) as PersistedState;
  if (!state || !Array.isArray(state.offices) || !Array.isArray(state.documents)) {
    throw new Error("state.json is not a Memorandum Builder package.");
  }
  const manifestFile = zip.file("files.json");
  const files: Array<{ id: string; data: Uint8Array }> = [];
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async("string")) as Array<{ id: string; file: string }>;
    for (const entry of manifest) {
      const bin = zip.file(entry.file);
      if (!bin) continue;
      files.push({ id: entry.id, data: await bin.async("uint8array") });
    }
  }
  await replaceFiles(files);
  return state;
}

export function encodePackagePreview(state: PersistedState): string {
  return JSON.stringify({
    offices: state.offices.length,
    documents: state.documents.length,
    note: "Full binaries are in the zip export, not this preview string.",
    sample: bytesToBase64(new TextEncoder().encode("memorandum-builder")).slice(0, 12),
  });
}

export { base64ToBytes, bytesToBase64 };
