import { createHash } from "node:crypto";
import type { SubmissionDeadline } from "@/lib/tender/deadline";
interface ReviewedDocument extends Omit<SubmissionDeadline, "label"> {
  url: string;
  sha256: string;
  reviewedAt: string;
  evidenceField: string;
  legibility: string;
  institutionId: string;
  referenceNumber?: string;
}
// Visually transcribed fields from official scanned PDFs; applied only to exact freshly fetched bytes.
// These are document metadata, not a substitute for current listing or amendment retrieval.
export const reviewedDocuments: readonly ReviewedDocument[] = [
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5400.pdf",
    sha256: "a4765f89f57a16381564b6c9cdb90bfe99c13e81a9d9a18e7d77b5bf1b399beb",
    date: "2026-10-07T17:00:00+05:30",
    referenceNumber: "Pur/2026/27830",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility:
      "Clear handwritten replacement date 7/10/26 above crossed-out older date, with printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5368.pdf",
    sha256: "4e306bda1bacb62b245a671c2caa1a593985cc0cfb53b71fcbbe24accf790944",
    date: "2026-10-01T17:00:00+05:30",
    referenceNumber: "MSO/Pur/2026/23771",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5367.pdf",
    sha256: "0f6bdd19db56b9134d1e91c81127298d59eaff1f5a1b6f2024e22de4a18cc61f",
    date: "2026-09-30T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5363.pdf",
    sha256: "1d049f491e7522b7a0299cce1542ae6190619b924ca5af985d8addb0e2c59bcb",
    date: "2026-09-30T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5326.pdf",
    sha256: "465e9202b597b33f05d2dc12e046096ec22053d971c9d96ce29c49f1d962705c",
    date: "2026-09-16T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5317.pdf",
    sha256: "c6e7a547d35f3e0160435c4d7166b0113fc33c40c4d915f217fdd42ec4608480",
    date: "2026-09-17T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5288.pdf",
    sha256: "e302570af0ceb5eb3b5ec10ba791ee46954c85851cf88de3ec26bf4eccdeb838",
    date: "2026-09-10T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5268.pdf",
    sha256: "8e85660741dbf6541c205036821a388b30aed8e96d17432f09afd988f61a016a",
    date: "2026-09-15T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5253.pdf",
    sha256: "f01cdaaa62176f80760cb51eaef90f7a1db171078a969e22dac959e0e490dc06",
    date: "2026-09-09T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5244.pdf",
    sha256: "440d13e6cf4177068c47177c9a30850c17968ff4bd8d2fcb08342e7960c8417a",
    date: "2026-09-03T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5215.pdf",
    sha256: "a2b1d9c4ec77ef77386cb36eccee87f85d0257b7390f06f330e33bd2cf1cd918",
    date: "2026-09-02T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5211.pdf",
    sha256: "fd47ded167fc2b2a24cea50615833855295e438bd68a0dc23215dd9144037c8f",
    date: "2026-08-17T17:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1: sealed quotations should reach this office on or before / Last date for receipt of quotation",
    legibility: "Clear handwritten date and printed 5:00 PM.",
    institutionId: "ggsmch-faridkot",
  },
  {
    url: "https://www.gmc.edu.in/_files/ugd/9090ab_e7ee8f4883ef45dc85e5acdd8256265b.pdf",
    sha256: "20b0df324efe80f27c237baaf88811f012b5482f053bedcc614463227dfb12b0",
    date: "2026-08-13T16:00:00+05:30",
    datePrecision: "minute",
    reviewedAt: "2026-10-01",
    evidenceField:
      "Page 1 bottom: Last Date for receipt of quotation/Tender ... 13-08-2026 by 4:00 pm",
    legibility:
      "Clear printed submission date; clause defers to next working day if government holiday announced. No such later amendment verified.",
    institutionId: "gmc-amritsar",
  },
];
export function reviewedDocumentDeadline(
  url: string,
  bytes: Uint8Array,
  evidence: readonly ReviewedDocument[] = reviewedDocuments,
) {
  const candidate = evidence.find((d) => d.url === url);
  if (
    !candidate ||
    createHash("sha256").update(bytes).digest("hex") !== candidate.sha256
  )
    return;
  return candidate;
}
