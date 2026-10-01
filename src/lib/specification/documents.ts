import { reviewedScanPages } from "./reviewed-scans";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { unzipSync } from "fflate";
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
  return [...new Map(found.map((d) => [d.label, d])).values()];
}
// Inspect ZIP directory first, bounding expansion before any XML is parsed.
export function validateXlsx(bytes: Uint8Array): void {
  if (
    bytes.length > 8_000_000 ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      0,
      true,
    ) !== 0x04034b50
  )
    throw Error("Unsupported BOQ format");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size = 0,
    entries = 0;
  for (let i = 0; i + 46 <= bytes.length; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      const expanded = view.getUint32(i + 24, true),
        nameLength = view.getUint16(i + 28, true),
        extra = view.getUint16(i + 30, true),
        comment = view.getUint16(i + 32, true);
      const name = new TextDecoder().decode(
        bytes.slice(i + 46, i + 46 + nameLength),
      );
      if (/vbaProject|\.bin$|externalLinks\//i.test(name))
        throw Error("Macro or external-link workbook is unsupported");
      size += expanded;
      entries++;
      if (size > 24_000_000 || entries > 300 || expanded > 12_000_000)
        throw Error("BOQ expanded size limit exceeded");
      i += 45 + nameLength + extra + comment;
    }
  if (!entries) throw Error("Invalid ZIP workbook directory");
}
export async function parseXlsx(bytes: Uint8Array): Promise<DocumentPage[]> {
  validateXlsx(bytes);
  // Validate expansion against directory bounds before handing XML to ExcelJS.
  const entries = unzipSync(bytes);
  if (Object.values(entries).reduce((n, v) => n + v.length, 0) > 24_000_000)
    throw Error("BOQ size limit exceeded");
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
