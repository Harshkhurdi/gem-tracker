import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { validateXlsx } from "@/lib/specification/documents";
const archive = () => zipSync({ "xl/worksheets/sheet1.xml": new TextEncoder().encode("<worksheet/>") });
const directoryOffset = (bytes: Uint8Array) => new DataView(bytes.buffer).getUint32(bytes.length - 6, true);
describe("XLSX ZIP preflight", () => {
  it("accepts a valid bounded archive", () => expect(() => validateXlsx(archive())).not.toThrow());
  it("rejects a fake central header without an end directory", () => {
    const bytes = new Uint8Array(70), view = new DataView(bytes.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint32(10, 0x02014b50, true);
    expect(() => validateXlsx(bytes)).toThrow("directory");
  });
  it("rejects oversized directory declarations before decompression", () => {
    const bytes = archive();
    new DataView(bytes.buffer).setUint32(directoryOffset(bytes) + 24, 100_000_000, true);
    expect(() => validateXlsx(bytes)).toThrow("size limit");
  });
  it("rejects forged small expansion declarations before ExcelJS can inflate them", () => {
    const bytes = zipSync({ "xl/sharedStrings.xml": new Uint8Array(13_000_000) });
    const view = new DataView(bytes.buffer), directory = directoryOffset(bytes);
    view.setUint32(directory + 24, 32, true);
    view.setUint32(22, 32, true);
    expect(() => validateXlsx(bytes)).toThrow("size limit");
  });
  it("rejects declared expansion larger than the actual data", () => {
    const bytes = archive(), view = new DataView(bytes.buffer);
    view.setUint32(directoryOffset(bytes) + 24, 1024, true);
    view.setUint32(22, 1024, true);
    expect(() => validateXlsx(bytes)).toThrow("directory");
  });
  it("rejects trailing payloads and inconsistent local headers", () => {
    const bytes = archive(), appended = new Uint8Array(bytes.length + 1);
    appended.set(bytes);
    expect(() => validateXlsx(appended)).toThrow("directory");
    new DataView(bytes.buffer).setUint32(22, 999, true);
    expect(() => validateXlsx(bytes)).toThrow("directory");
  });
  it("rejects macros, external links and duplicate entries", () => {
    for (const name of ["xl/vbaProject.bin", "xl/externalLinks/externalLink1.xml", "../sheet.xml"])
      expect(() => validateXlsx(zipSync({ [name]: new Uint8Array([1]) }))).toThrow();
    const bytes = zipSync({ "a.xml": new Uint8Array([1]), "b.xml": new Uint8Array([2]) });
    // Name collisions must be rejected instead of silently overwriting a file.
    const view = new DataView(bytes.buffer), first = directoryOffset(bytes);
    const second = first + 46 + view.getUint16(first + 28, true) + view.getUint16(first + 30, true) + view.getUint16(first + 32, true);
    bytes[second + 46] = 97;
    const local = view.getUint32(second + 42, true);
    bytes[local + 30] = 97;
    expect(() => validateXlsx(bytes)).toThrow("directory");
  });
});
