import type { DocumentPage } from "../../types/specification";
interface ReviewedScan {
  url: string;
  sha256: string;
  reviewedAt: string;
  pages: DocumentPage[];
}
// Visually checked official scan excerpts. Fresh URL and byte hash must both match.
// These selected excerpts never establish full document or amendment coverage.
export const reviewedScans: readonly ReviewedScan[] = [
  {
    url: "https://pgimer.edu.in/PGIMER_PORTAL/AbstractFilePath?FileType=E&FileName=101Oct2026155814.pdf&PathKey=TENDER_PATH",
    sha256: "5775c2a483f752b3bfb4f1c7ea7f7a370cd7da1c61b8b6e6f28c7429c2d9f2b5",
    reviewedAt: "2026-10-03",
    pages: [
      { page: 1, text: "PI(EP)14053-54\nDate: 01/10/2026\nPost Graduate Institute of Medical Education & Research, Chandigarh" },
      { page: 2, text: `E-Tender Notice No. PI(EP)/26-27/01
Postgraduate Institute of Medical Education and Research, Chandigarh
Sr. No | Equipment/Item Name | Quantity | EMD | Bid submission Date | Bid Opening Date | Deptt Name
1 | QLF System | 02Nos. | Rs.1,00,000/- | 21-10-2026 | 22-10-2026 | OHSC
2 | Dental Air Rotor Lubricating Machine | 07Nos. | Rs.70,000/- | -do- | -do- | OHSC
3 | Transport Ventilators | 04Nos. | Rs.80,000/- | -do- | -do- | Pediatrics Medicine
4 | Complete Shockwave Therapy System | 01No. | Rs.96,000/- | 22-10-2026 | 23-10-2026 | Physiotherapy
5 | Indirect Colorimeter (Buy Back) | 01No. | Rs.80,000/- | -do- | -do- | Pediatrics Medicine
6 | Lower Tract Endoscopy Set | 01No. | Rs.80,000/- | -do- | -do- | Urology
7 | Laser Capture Micro Dissection | 01No. | Rs.4,00,000/- | 26-10-2026 | 27-10-2026 | Histopathology
8 | Fully Automated Immunoassay : Enzyme Linked Fluorescent Assay (ELFA)/Chemiluminescence enzyme Immunoassay(CL EIA)/Electrochemiluminescence Immunoassay (ECLIA) | 01No. | Rs.3,00,000/- | -do- | -do- | Pediatrics Medicine
9 | Lower Tract Endoscopy Set for Emg. OT | 01No. | Rs.1,58,000/- | -do- | -do- | Urology
10 | Lower Tract Endoscopy Set for TURP, TURBT, OIU, Cystoscopy | 01 Set | Rs.1,98,000/- | -do- | -do- | Urology
The tenders will be opened on the dates given above at 12:00 PM.
PRE-BID CONFERENCE for ITEM Sr. No. 07 to 10 on 07.10.2026 from 02:30 P.M. onwards.` },
    ],
  },
  {
    url: "https://www.aiimsbathinda.edu.in/images/procurements/20260924093801.pdf",
    sha256: "3578baf49c659394f24b62ccebfe3b47cda1ee107f491a47771d554f176d0bd6",
    reviewedAt: "2026-10-02",
    pages: [
      {
        page: 1,
        text: `AIIMS Bathinda/Proc.Cell/2026/324
Start Date: 24/09/2026
Last date of receiving Quotations, i.e., on 07/10/2026, Time 17:00
Ueretero-Renoscope | Qty. 1 | As per Annexure - A
GST Registration Number (attach copy)
PAN No. (Attach copy)
Payment will be made after the supply and inspection of the delivered items.`,
      },
      {
        page: 4,
        text: `Manufacturer/supplier warranty certificates and manufacturer/Government approved lab test certificate shall be furnished along with the supply, wherever applicable.
Delivery period required for supplying the material shall be invariably specified in the quotation.
Our normal payment terms are 100% within 30 (thirty) days on receipt and acceptance of material at our site in good condition.`,
      },
      {
        page: 5,
        text: `Uretero-Renoscope-Paediatric
Technical Specifications
Integrated fibre optic semi-rigid ureteroscope for use in pediatric upper urinary tract endoscopic surgery.
Ureteroscope, 7 Fr or less with long arm (working length 350mm or less), with distal tip 6.5 Fr. Autoclavable with angled eyepiece, Distal sheath tip 4.5-6.5 Fr, Atraumatic viewing angle 5-10 degrees with laterally/angled eyepiece, with one or two laterally placed irrigation ports with 1 no. Channel size 3 Fr or more.
Appropriate Formalin chamber
URS alligator forceps- 2 no
URS Triprong forceps- 2 no. (Can be from other manufacturer)
Path finder -2 no. (Can be from other manufacturer)
Insertion Aid, Instrument Port with Sealing System and Quick Release Lock Seal, Package of 10 Cleaning Adaptor
All consumables required for installation and standardisation of the system will be provided free of cost.
Should be a European CE or USFDA-approved product.
Manufacturer/Supplier should have Iso certification for quality standards
Ureteroscope set as specified | Qty 1 | UOM Set`,
      },
    ],
  },
  {
    url: "https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf",
    sha256: "e4328ef5ce73f618d88348dde2fdad06dc3935aef780323e7d0e205331553372",
    reviewedAt: "2026-10-02",
    pages: [
      {
        page: 1,
        text: `Bid Number: GEM/2026/B/8047970
Bid End Date/Time: 08-10-2026 14:00:00
Bid Offer Validity (From End Date): 30 (Days)
Total Quantity: 1
Item Category: Laparocator with Camera
Minimum Average Annual Turnover of the bidder (For 3 Years): 35 Lakh (s)
OEM Average Turnover (Last 3 Years): 280 Lakh (s)
Years of Past Experience Required for same/similar service: 3 Year (s)`,
      },
      {
        page: 5,
        text: `Laparocator With Camera ( 1 Unit )
Minimum 50% and 20% Local Content required for qualifying as Class 1 and Class 2 Local Supplier respectively
Technical Specifications
Buyer Specification Document: Download`,
      },
      {
        page: 6,
        text: `Comprehensive Maintenance (Minimum Percentage): 3 %
Comprehensive Maintenance (Maximum Percentage): 25 %
Warranty of required product: 2 Year
Comprehensive Maintenance Duration (Post Warranty): 8 Year
Warranty displayed under the AMC/CMC Details section will supersede the warranty displayed under the catalog specification
Quantity: 1 | Delivery Days: 45
Authorised Service Centre within the state of Odisha, along with a dedicated contact person with telephone number for technical solution in a fast track basis at this institution and when required basis.
Experience Certificate for the supply of the same to any Govt/ PSU/ any renowned private organisation along with Supply/ Purchase Order.
If the agency is registered under MSME or NSIC, then EMD exemption certificate needs to be enclosed.
Make in india specific authorisation certificate needs to be enclosed.
Please submit the duly signed and stamped Non-Debarment/Non-Blacklisting Certificate.
CMC Include spare parts, Labour, Preventive Maintenance visits and Software update`,
      },
      {
        page: 8,
        text: `CMC shall include preventive maintenance including calibration as per technical/ service /operational manual of the manufacturer, service charges and spares, after satisfactory completion of Warranty.
Service personnel shall visit each consignee site as recommended in the manufacturer's technical/ service /operational manual, at least once in six months or as per user requirement.
Cost of consumables shall not be included in CMC.
Further there will be 98% uptime warranty during CMC period on 24 (hrs) X 7 (days) X 365 (days) basis, with penalty, to extend CMC period by double the downtime period.`,
      },
    ],
  },
];
export function reviewedScanPages(
  url: string,
  sha256: string,
): DocumentPage[] | undefined {
  return reviewedScans
    .find((d) => d.url === url && d.sha256 === sha256)
    ?.pages.map((p) => ({ ...p }));
}
