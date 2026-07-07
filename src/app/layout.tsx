import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LabelForge — Crop & Convert Shipping Labels in Seconds",
  description:
    "Premium browser tool to crop Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, DHL, FedEx, UPS and USPS shipping labels for 4×6 thermal printers. Secure, private, no upload.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
