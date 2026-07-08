import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dashboard",
  description: `Crop and convert shipping labels for Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, FedEx, UPS, DHL, USPS and custom PDFs with ${SITE.name}.`,
};

export default function CropLayout({ children }: { children: React.ReactNode }) {
  return children;
}
