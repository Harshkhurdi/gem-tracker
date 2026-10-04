import type { Readable } from "node:stream";
import { EnvHttpProxyAgent, request as httpRequest } from "undici";
import { pgimerDispatcher } from "./pgimer-tls";
const proxy =
  process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    ? new EnvHttpProxyAgent()
    : undefined;
const permitted = [
  ".gov.in",
  ".nic.in",
  "aiimsbathinda.edu.in",
  "aiimsbilaspur.edu.in",
  "bfuhsonline.ac.in",
  "gmcpatiala.edu.in",
  "gmc.edu.in",
  "slbsgmchmandi.com",
  "pgimer.edu.in",
  "rpgmc.ac.in",
  "igmcshimla.edu.in",
];
export function officialUrl(value: string, base?: string) {
  try {
    const u = new URL(value, base);
    return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443") &&
      permitted.some((h) =>
        h.startsWith(".")
          ? u.hostname.endsWith(h)
          : u.hostname === h || u.hostname.endsWith("." + h),
      )
      ? u.href
      : undefined;
  } catch {
    return;
  }
}
/** GMC Amritsar's official Wix PDF links redirect to this observed tenant. */
export function officialDocumentRedirect(value: string, from: string) {
  const generic = officialUrl(value, from);
  if (generic) return generic;
  try {
    const source = new URL(from),
      target = new URL(value, from);
    if (
      source.hostname === "www.gmc.edu.in" &&
      /^\/_files\/ugd\/[^/]+\.pdf$/i.test(source.pathname) &&
      target.protocol === "https:" &&
      !target.username && !target.password && (!target.port || target.port === "443") &&
      target.hostname === "bf8acbf3-d9c2-4d05-85d6-d9849a6e99ab.filesusr.com" &&
      target.pathname === source.pathname.replace("/_files/", "/")
    )
      return target.href;
  } catch {
    /* malformed redirect */
  }
}
const documentBytesCache = new Map<
  string,
  { bytes: Uint8Array; fetchedAt: number }
>();
export function rememberDocumentBytes(
  url: string,
  bytes: Uint8Array,
  now = Date.now(),
): void {
  if (
    !officialUrl(url) ||
    bytes.length > 8_000_000 ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    return;
  for (const [key, value] of documentBytesCache)
    if (now - value.fetchedAt > 60000) documentBytesCache.delete(key);
  documentBytesCache.delete(url);
  documentBytesCache.set(url, {
    bytes: Uint8Array.from(bytes),
    fetchedAt: now,
  });
  while (
    [...documentBytesCache.values()].reduce((n, v) => n + v.bytes.length, 0) >
      32_000_000 ||
    documentBytesCache.size > 12
  )
    documentBytesCache.delete(documentBytesCache.keys().next().value!);
}
export function recentDocumentBytes(
  url: string,
  now = Date.now(),
): Uint8Array | undefined {
  const cached = documentBytesCache.get(url);
  if (!cached || now - cached.fetchedAt > 60000) return;
  return cached.bytes.slice();
}
export class SourceHttp {
  private cookies = new Map<string, Map<string, string>>();
  private deadline: number;
  private timeout: number;
  constructor(options: { budgetMs?: number; timeoutMs?: number } = {}) {
    this.deadline = Date.now() + (options.budgetMs ?? 60000);
    this.timeout = options.timeoutMs ?? 18000;
  }
  async fetch(value: string, init: RequestInit = {}): Promise<Response> {
    let url = officialUrl(value);
    if (!url) throw Error("Unsupported official source URL");
    for (let redirect = 0; redirect < 4; redirect++) {
      const remaining = this.deadline - Date.now();
      if (remaining <= 0) throw Error("Source time budget exceeded");
      const u = new URL(url);
      const headers = new Headers(init.headers);
      headers.set(
        "User-Agent",
        "GovernmentMedicalTenderTracker/1.0 (public procurement listing reader)",
      );
      headers.set("Accept", "text/html,application/pdf,application/json");
      const jar = this.cookies.get(u.origin);
      if (jar?.size) headers.set("Cookie", [...jar.values()].join("; "));
      // NIC's legacy servlet fails under the Fetch client in some environments.
      // A normal Node HTTP request avoids Fetch-only headers; no access controls change.
      headers.set("Accept-Encoding", "identity");
      const body =
        init.body instanceof URLSearchParams
          ? init.body.toString()
          : typeof init.body === "string"
            ? init.body
            : undefined;
      const dispatcher = pgimerDispatcher(url, !!proxy) || proxy;
      let incoming: Awaited<ReturnType<typeof httpRequest>> | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          init.signal?.throwIfAborted();
          const left = this.deadline - Date.now();
          if (left <= 0) throw Error("Source time budget exceeded");
          incoming = await httpRequest(url, {
            method: (init.method || "GET") as "GET" | "POST",
            headers: Object.fromEntries(headers.entries()),
            body,
            signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(Math.min(left, this.timeout))])
              : AbortSignal.timeout(Math.min(left, this.timeout)),
            ...(dispatcher ? { dispatcher } : {}),
          });
          if (
            attempt === 0 &&
            (!init.method || init.method === "GET") &&
            [500, 502, 503, 504].includes(incoming.statusCode) &&
            this.deadline - Date.now() > 2000
          ) {
            incoming.body.resume();
            continue;
          }
          break;
        } catch (error) {
          if (
            attempt ||
            init.signal?.aborted ||
            init.method === "POST" ||
            this.deadline - Date.now() < 2000
          )
            throw error;
        }
      }
      if (!incoming) throw Error("Official source unavailable");
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value))
          for (const item of value) responseHeaders.append(name, item);
        else if (value !== undefined) responseHeaders.set(name, String(value));
      }
      const response = new Response(sourceResponseStream(incoming.body), {
        status: incoming.statusCode,
        headers: responseHeaders,
      });
      const setCookies = response.headers.getSetCookie?.() || [
        response.headers.get("set-cookie") || "",
      ];
      const current = jar || new Map<string, string>();
      for (const cookie of setCookies) {
        const pair = cookie.split(";")[0],
          eq = pair.indexOf("=");
        if (eq > 0) current.set(pair.slice(0, eq), pair);
      }
      this.cookies.set(u.origin, current);
      if (response.status >= 300 && response.status < 400) {
        const next = officialDocumentRedirect(
          response.headers.get("location") || "",
          url,
        );
        await response.body?.cancel();
        if (!next) throw Error("Unrecognised source redirect");
        const changesOrigin = new URL(next).origin !== u.origin;
        const changesToGet = response.status === 303 ||
          ([301, 302].includes(response.status) && init.method?.toUpperCase() === "POST");
        // Do not forward a form token or caller credentials to another host.
        if (changesOrigin && init.body && !changesToGet)
          throw Error("Cross-origin source form redirect is unsupported");
        const redirectHeaders = new Headers(init.headers);
        if (changesOrigin) {
          for (const name of ["authorization", "proxy-authorization", "cookie", "referer", "origin", "x-requested-with"])
            redirectHeaders.delete(name);
        }
        if (changesToGet) {
          redirectHeaders.delete("content-type");
          redirectHeaders.delete("content-length");
        }
        init = { ...init, headers: redirectHeaders, ...(changesToGet ? { method: "GET", body: undefined } : {}) };
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw Error(`Official source HTTP ${response.status}`);
      }
      return response;
    }
    throw Error("Too many source redirects");
  }
  async bytes(url: string, limit = 8_000_000, init: RequestInit = {}) {
    const response = await this.fetch(url, init);
    if (Number(response.headers.get("content-length")) > limit) {
      await response.body?.cancel();
      throw Error("Source response exceeds size limit");
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("Empty source response");
    const parts: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit || Date.now() > this.deadline) {
        await reader.cancel();
        throw Error("Source body exceeded size or time limit");
      }
      parts.push(value);
    }
    const result = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    rememberDocumentBytes(url, result);
    return result;
  }
  async text(url: string, init: RequestInit = {}) {
    return new TextDecoder().decode(await this.bytes(url, 6_000_000, init));
  }
  async documentText(url: string): Promise<string | undefined> {
    try {
      return await this.documentBytesText(await this.bytes(url, 8_000_000));
    } catch {
      return;
    }
  }
  async documentBytesText(bytes: Uint8Array): Promise<string | undefined> {
    try {
      if (!new TextDecoder().decode(bytes.slice(0, 5)).startsWith("%PDF"))
        return;
      const { PDFParse } = await import("pdf-parse");
      // PDF.js transfers its input buffer to a worker. Preserve the freshly
      // downloaded bytes for content-hash verification after extraction.
      const parser = new PDFParse({ data: bytes.slice() });
      try {
        const result = await parser.getText({ first: 120 });
        if (result.total > 120) return;
        return result.text.trim() || undefined;
      } finally {
        await parser.destroy();
      }
    } catch {
      return;
    }
  }
}
export function sanitizeError(error: unknown) {
  const text =
    error instanceof Error ? error.message : "Source could not be queried";
  if (
    [
      "Official procurement table missing from response.",
      "Official procurement table structure changed; populated rows could not be read.",
      "Tender detail ID mismatch",
      "Tender detail not present (session expired or access challenge)",
    ].includes(text)
  )
    return text;
  const status = text.match(/HTTP (\d{3})\b/);
  return /abort|timeout|timed|budget/i.test(text)
    ? "Official source timed out"
    : status
      ? `Official source HTTP ${status[1]}`
      : "Official listing could not be retrieved or its format changed";
}

/** Cancellation must close the bridge before destroying a live HTTP body. */
export function sourceResponseStream(
  body: Readable,
): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      body.on("data", (chunk: Uint8Array) => {
        if (closed) return;
        controller.enqueue(chunk);
        if ((controller.desiredSize ?? 0) <= 0) body.pause();
      });
      body.on("end", () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      });
      body.on("error", (error: Error) => {
        if (!closed) {
          closed = true;
          controller.error(error);
        }
      });
      body.pause();
    },
    pull() {
      if (!closed) body.resume();
    },
    cancel() {
      closed = true;
      body.destroy();
    },
  });
}
