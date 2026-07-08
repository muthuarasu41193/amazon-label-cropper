"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SITE } from "@/lib/site";

const faqs = [
  {
    question: "Are my PDF files uploaded to a server?",
    answer: `No. ${SITE.name} processes every PDF entirely in your browser using Web APIs. Your shipping labels never leave your device and we store nothing on our servers.`,
  },
  {
    question: "Which marketplaces and carriers are supported?",
    answer:
      "We support Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, FedEx, UPS, DHL, USPS and custom PDFs. Each platform has tuned crop presets for common label layouts.",
  },
  {
    question: "What output size do I get?",
    answer:
      "By default, labels are exported as 4×6 inch PDF pages — the standard size for thermal printers like Zebra and Rollo. You can also choose A6, Letter, or custom millimeter dimensions.",
  },
  {
    question: "Can I add product name and quantity to labels?",
    answer: `Yes. For marketplace PDFs with invoice columns (like Amazon and Flipkart), ${SITE.name} extracts product details and prints them below each cropped label.`,
  },
  {
    question: "Can I process multiple PDFs at once?",
    answer:
      "Yes. The batch queue lets you add multiple PDFs, process them individually or all at once, and track per-file progress with download-ready outputs.",
  },
  {
    question: "Is there a limit on the free plan?",
    answer:
      "The free plan includes up to 50 label crops per day — enough for most solo sellers. Pro removes all limits and adds batch processing and priority support.",
  },
  {
    question: "Do I need to install anything?",
    answer: `No installation required. ${SITE.name} runs in any modern browser on desktop or tablet. Just upload your PDF and download the cropped result.`,
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions"
          description={`Everything you need to know about ${SITE.name}.`}
        />

        <div className="mt-12 space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-text sm:text-[15px]">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-border px-5 pb-4 pt-3 text-sm leading-relaxed text-muted">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
