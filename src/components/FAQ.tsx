"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Are my PDF files uploaded to a server?",
    answer:
      "No. LabelForge processes every PDF entirely in your browser using Web APIs. Your shipping labels never leave your device and we store nothing on our servers.",
  },
  {
    question: "Which marketplaces and carriers are supported?",
    answer:
      "We support Amazon, eBay, Shopify, WooCommerce, Etsy, Flipkart, Meesho, DHL, FedEx, UPS, USPS and more. Each platform has tuned crop presets for common label layouts.",
  },
  {
    question: "What output size do I get?",
    answer:
      "By default, labels are exported as 4×6 inch PDF pages — the standard size for thermal printers like Zebra and Rollo. You can also choose A6 or source crop size.",
  },
  {
    question: "Can I add product name and quantity to labels?",
    answer:
      "Yes. For marketplace PDFs with invoice columns (like Amazon and Flipkart), LabelForge extracts product details and prints them below each cropped label.",
  },
  {
    question: "Is there a limit on the free plan?",
    answer:
      "The free plan includes up to 50 label crops per day — enough for most solo sellers. Pro removes all limits and adds batch processing and priority support.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No installation required. LabelForge runs in any modern browser on desktop or tablet. Just upload your PDF and download the cropped result.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base text-muted">Everything you need to know about LabelForge.</p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-soft)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-text sm:text-base">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border px-5 pb-4 pt-1">
                    <p className="text-sm leading-relaxed text-muted">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
