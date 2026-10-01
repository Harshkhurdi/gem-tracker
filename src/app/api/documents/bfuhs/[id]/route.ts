import { load } from "cheerio";
import { SourceHttp, officialUrl } from "@/lib/sources/http";
import { bfuhsDocumentUrl } from "@/lib/sources/adapters/institution";
import { parseIndianDate } from "@/lib/tender/dates";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,7}$/.test(id))
    return Response.json({ error: "Invalid notice ID" }, { status: 400 });
  const url =
    "https://examination.bfuhsonline.ac.in/onlinetender/tenderview.aspx";
  try {
    const http = new SourceHttp();
    const $ = load(await http.text(url));
    const row = $("tr")
      .filter((_, r) => $(r).children("td").first().text().trim() === id)
      .first();
    const direct = bfuhsDocumentUrl(
      id,
      parseIndianDate(row.children("td").eq(1).text()),
    );
    if (direct) {
      try {
        const bytes = await http.bytes(direct, 8_000_000);
        if (new TextDecoder().decode(bytes.slice(0, 5)).startsWith("%PDF"))
          return new Response(bytes as BodyInit, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="Tender_${id}.pdf"`,
            },
          });
      } catch {
        /* Old/renamed documents still use the official View postback below. */
      }
    }
    const event = (row.find("a").attr("href") || "").match(
      /__doPostBack\('([^']+)'/,
    )?.[1];
    if (!event) throw Error();
    const form = new URLSearchParams();
    $("input[type=hidden]").each((_, input) => {
      const name = $(input).attr("name");
      if (name) form.set(name, $(input).attr("value") || "");
    });
    form.set("__EVENTTARGET", event);
    form.set("__EVENTARGUMENT", "");
    const response = await http.text(url, {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const opened = response.match(/window\.open\(['"]([^'"]+)['"]/i)?.[1];
    const pdf = opened && officialUrl(opened, url);
    if (
      !pdf ||
      new URL(pdf).hostname !== "examination.bfuhsonline.ac.in" ||
      !new URL(pdf).pathname.toLowerCase().endsWith(".pdf")
    )
      throw Error();
    return Response.redirect(pdf, 302);
  } catch {
    return Response.json(
      {
        error:
          "Official PDF could not be resolved. Open the BFUHS page and select View for this notice.",
        sourceUrl: url,
      },
      { status: 502 },
    );
  }
}
