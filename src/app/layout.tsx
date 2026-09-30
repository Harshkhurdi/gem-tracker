import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Medical Tender Tracker",
  description:
    "Government medical equipment tender tracker for Punjab, Chandigarh and Himachal Pradesh.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
