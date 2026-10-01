import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { SourceHttp } from "@/lib/sources/http";

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    constructor({ data }: { data: Uint8Array }) {
      // Reproduce PDF.js transferring ownership of its buffer into a worker.
      structuredClone(data, { transfer: [data.buffer as ArrayBuffer] });
    }
    async getText() {
      return { text: "Official submission deadline" };
    }
    async destroy() {}
  },
}));

describe("PDF bytes used as verification evidence", () => {
  it("preserves original downloaded bytes and SHA-256 after worker extraction", async () => {
    const bytes = new TextEncoder().encode("%PDF-test fixture");
    const hash = () => createHash("sha256").update(bytes).digest("hex");
    const before = hash();
    expect(await new SourceHttp().documentBytesText(bytes)).toBe(
      "Official submission deadline",
    );
    expect(bytes.length).toBeGreaterThan(5);
    expect(hash()).toBe(before);
  });
});
