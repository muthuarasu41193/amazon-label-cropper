import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms of Service — LabelForge",
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-text">Terms of Service</h1>
        <p className="mt-4 text-muted">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <p>
            By using LabelForge, you agree to these terms. LabelForge is provided &quot;as is&quot; for cropping and
            converting shipping label PDFs for personal and commercial use.
          </p>
          <h2 className="text-lg font-semibold text-text">Acceptable use</h2>
          <p>
            You may use LabelForge to process shipping labels you are authorized to handle. You are responsible for
            ensuring compliance with marketplace and carrier terms of service.
          </p>
          <h2 className="text-lg font-semibold text-text">Limitation of liability</h2>
          <p>
            LabelForge is not liable for misprinted labels, shipping errors, or data loss. Always verify cropped output
            before printing.
          </p>
          <h2 className="text-lg font-semibold text-text">Contact</h2>
          <p>
            For questions about these terms, visit our{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
