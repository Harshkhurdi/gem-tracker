import { reviewedScanPages } from "./reviewed-scans";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { Inflate } from "fflate";
import type {
  DocumentPage,
  ParsedDocument,
  SpecificationDocument,
} from "../../types/specification";
import { productEvidence } from "../tender/product-evidence";
import {
  officialUrl,
  SourceHttp,
  recentDocumentBytes,
  rememberDocumentBytes,
} from "../sources/http";

export function documentType(
  label: string,
  url: string,
): SpecificationDocument["type"] {
  const text = label + " " + url;
  return /corrig|amend|addendum|extension/i.test(text)
    ? "corrigendum"
    : /\.xlsx?(?:$|\?)|\bboq\b|price schedule|bill of quantit/i.test(text)
      ? "boq"
      : /technical|specification|annexure/i.test(text)
        ? "technical-specification"
        : "tender-document";
}
export function linkedDocuments(
  html: string,
  base: string,
): { label: string; url: string }[] {
  const $ = load(html);
  const found: { label: string; url: string }[] = [];
  $("a[href]").each((_, a) => {
    const link = $(a),
      url = officialUrl(link.attr("href") || "", base);
    const label =
      link.closest("tr").text().replace(/\s+/g, " ").trim().slice(0, 240) ||
      link.text().trim();
    if (
      url &&
      (/\.(?:pdf|xlsx?)(?:$|\?)/i.test(url) ||
        (/\.(?:pdf|xlsx?)\b/i.test(label) &&
          /docDownoad|DirectLink_(?:1|9)\b/i.test(url)) ||
        (/download/i.test(link.text()) &&
          /document|specification|\bboq\b|\.pdf|\.xls/i.test(label)))
    )
      found.push({ label, url });
  });
  return [...new Map(found.map((d) => [d.url, d])).values()];
}
// Inspect ZIP directory and actual expansion before any XML is parsed.
export function validateXlsx(bytes: Uint8Array): void {
  const invalid = () => { throw Error("Invalid ZIP workbook directory"); };
  if (bytes.length < 22 || bytes.length > 8_000_000) invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x04034b50)
    throw Error("Unsupported BOQ format");
  // Follow the same end-of-central-directory record that the ZIP reader uses.
  // Searching for directory signatures in file payloads does not validate a ZIP.
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65558) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65558)) invalid();
  if (end + 22 + view.getUint16(end + 20, true) !== bytes.length ||
      view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) invalid();
  const count = view.getUint16(end + 10, true),
    directorySize = view.getUint32(end + 12, true),
    directoryStart = view.getUint32(end + 16, true);
  if (!count || count > 300 || count !== view.getUint16(end + 8, true) ||
      directoryStart + directorySize !== end || directoryStart >= end ||
      (end >= 20 && view.getUint32(end - 20, true) === 0x07064b50)) invalid();
  let cursor = directoryStart, size = 0;
  const names = new Set<string>();
  for (let entry = 0; entry < count; entry++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) invalid();
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true),
      compressed = view.getUint32(cursor + 20, true),
      expanded = view.getUint32(cursor + 24, true),
      nameLength = view.getUint16(cursor + 28, true),
      extra = view.getUint16(cursor + 30, true),
      comment = view.getUint16(cursor + 32, true),
      local = view.getUint32(cursor + 42, true);
    if (cursor + 46 + nameLength + extra + comment > end || !nameLength ||
        view.getUint16(cursor + 34, true) || (flags & 1) || ![0, 8].includes(method)) invalid();
    const nameBytes = bytes.slice(cursor + 46, cursor + 46 + nameLength);
    const name = new TextDecoder().decode(nameBytes);
    if (names.has(name) || /(?:^|[\\/])\.\.(?:[\\/]|$)|^[/\\]|\0/.test(name)) invalid();
    names.add(name);
    if (/vbaProject|\.bin$|externalLinks[\\/]/i.test(name))
      throw Error("Macro or external-link workbook is unsupported");
    size += expanded;
    if (size > 24_000_000 || expanded > 12_000_000)
      throw Error("BOQ expanded size limit exceeded");
    if (local + 30 > directoryStart || view.getUint32(local, true) !== 0x04034b50) invalid();
    const localNameLength = view.getUint16(local + 26, true),
      localExtra = view.getUint16(local + 28, true),
      dataStart = local + 30 + localNameLength + localExtra;
    if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method ||
        localNameLength !== nameLength || dataStart + compressed > directoryStart ||
        !nameBytes.every((byte, i) => bytes[local + 30 + i] === byte) ||
        (!(flags & 8) && (view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== expanded)) ||
        (method === 0 && compressed !== expanded)) invalid();
    // ZIP sizes are attacker-controlled. Measure DEFLATE output in small input
    // chunks so a forged declaration cannot reach ExcelJS's unbounded inflater.
    if (method === 8) {
      let actual = 0;
      const inflater = new Inflate((chunk) => {
        actual += chunk.length;
        if (actual > expanded) throw Error("BOQ expanded size limit exceeded");
      });
      for (let offset = 0; offset < compressed; offset += 1024) {
        const next = Math.min(offset + 1024, compressed);
        inflater.push(bytes.subarray(dataStart + offset, dataStart + next), next === compressed);
      }
      if (!compressed) inflater.push(new Uint8Array(), true);
      if (actual !== expanded) invalid();
    }
    cursor += 46 + nameLength + extra + comment;
  }
  if (cursor !== end) invalid();
}
export async function parseXlsx(bytes: Uint8Array): Promise<DocumentPage[]> {
  validateXlsx(bytes);
  const Excel = await import("exceljs");
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as never);
  const pages: DocumentPage[] = [];
  for (const sheet of workbook.worksheets.slice(0, 12)) {
    if (sheet.rowCount > 5000 || sheet.columnCount > 100)
      throw Error("BOQ row or column limit exceeded");
    let columnLabels: Record<number, string> = {};
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const headings: Record<number, string> = {};
      row.eachCell({ includeEmpty: false }, (cell, column) => {
        if (
          /^(?:item description|description of item|description|specification|quantity|qty|unit|consignee)$/i.test(
            cell.text.trim(),
          )
        )
          headings[column] = cell.text.trim();
      });
      if (Object.keys(headings).length >= 2) columnLabels = headings;
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell, column) => {
        // Formula objects are deliberately skipped, including cached formula results.
        if (cell.type === Excel.ValueType.Formula) return;
        cells.push(
          `${!Object.keys(headings).length && columnLabels[column] ? columnLabels[column] + ": " : ""}${cell.text.slice(0, 1500)}`,
        );
      });
      if (cells.length)
        pages.push({
          sheet: sheet.name,
          row: row.number,
          text: cells.join(" | "),
        });
    });
  }
  return pages;
}
export async function parseDocument(
  bytes: Uint8Array,
  document: SpecificationDocument,
): Promise<ParsedDocument> {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const prefix = new TextDecoder().decode(bytes.slice(0, 5));
  let pages: DocumentPage[];
  let links: { label: string; url: string }[] = [];
  if (prefix === "%PDF-") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes.slice() });
    try {
      const result = await parser.getText({ first: 120 });
      if (result.total > 120)
        throw Error("Document exceeds the 120-page inspection limit");
      pages = result.pages.map((p) => ({
        page: p.num,
        text: p.text.slice(0, 60000),
      }));
      const info = await parser.getInfo({ parsePageInfo: true, first: 120 });
      links = officialDocumentLinks(
        (info.pages || []).flatMap((p) =>
          p.links.map((l) => ({
            label: l.text || "Linked official document",
            url: l.url,
          })),
        ),
      );
    } finally {
      await parser.destroy();
    }
  } else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    pages = await parseXlsx(bytes);
  } else
    throw Error(
      "Official link did not return a supported PDF or XLSX (download may require CAPTCHA; legacy XLS requires manual review)",
    );
  const automaticallyReadable =
    pages
      .map((p) => p.text)
      .join("\n")
      .replace(/[^a-z]/gi, "").length > 40;
  const reviewed =
    !automaticallyReadable && reviewedScanPages(document.url, sha256);
  const physicalPageCount = pages.filter((p) => p.page).length;
  if (reviewed) pages = reviewed;
  const text = pages.map((p) => p.text).join("\n");
  const parsed = text.replace(/[^a-z]/gi, "").length > 40;
  return {
    ...document,
    sha256,
    status: parsed ? "parsed" : "scanned",
    pageCount: physicalPageCount || undefined,
    textMethod: reviewed
      ? "reviewed-scan"
      : prefix === "%PDF-"
        ? "pdf-text"
        : "spreadsheet",
    note: reviewed
      ? "Selected scan excerpts visually reviewed 2026-10-02; fresh official URL and SHA-256 match. Automated extraction and full attachment coverage remain incomplete."
      : document.note,
    pages,
    links,
    productText: productEvidence(text),
  };
}
export async function fetchDocument(
  http: SourceHttp,
  document: SpecificationDocument,
): Promise<ParsedDocument> {
  try {
    // Normal metadata inspection may already have retrieved these exact bytes.
    const recent = recentDocumentBytes(document.url);
    if (recent) return await parseDocument(recent, document);
    const response = await http.fetch(document.url);
    const type = response.headers.get("content-type") || "";
    if (!/(?:pdf|octet-stream|spreadsheet|excel|zip)/i.test(type)) {
      await response.body?.cancel();
      throw Error(
        "Official document download is unavailable or access protected",
      );
    }
    // Read via a bounded stream; no arbitrary buffer allocation from Content-Length.
    if (Number(response.headers.get("content-length")) > 8_000_000) {
      await response.body?.cancel();
      throw Error("Document file size exceeds limit");
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("Empty document");
    const chunks: Uint8Array[] = [];
    let length = 0;
    const end = Date.now() + 10000;
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      length += r.value.length;
      if (length > 8_000_000 || Date.now() > end) {
        await reader.cancel();
        throw Error("Document exceeded size or time budget");
      }
      chunks.push(r.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    rememberDocumentBytes(document.url, bytes);
    return await parseDocument(bytes, document);
  } catch (e) {
    return {
      ...document,
      status: "unavailable",
      pages: [],
      productText: "",
      note: e instanceof Error ? e.message : "Document unavailable",
    };
  }
}

export function officialDocumentLinks(
  links: { label: string; url: string }[],
): { label: string; url: string }[] {
  return [
    ...new Map(
      links.flatMap((link) => {
        const url = officialUrl(link.url);
        return url && /\.(?:pdf|xlsx?)(?:$|\?)|\/showbidDocument\//i.test(url)
          ? [[url, { label: link.label, url }] as const]
          : [];
      }),
    ).values(),
  ].slice(0, 12);
}
