import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy — LabelForge",
};

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-text">Privacy Policy</h1>
        <p className="mt-4 text-muted">Last updated: July 2026</p>

        <div className="prose prose-gray mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <p>
            LabelForge is designed with privacy as a core principle. All PDF processing happens locally in your web
            browser. We do not upload, store, or transmit your shipping label files to any server.
          </p>
          <h2 className="text-lg font-semibold text-text">Information we collect</h2>
          <p>
            We may collect anonymous usage analytics (page views, feature usage) to improve the product. We never collect
            the contents of your PDF files or shipping data.
          </p>
          <h2 className="text-lg font-semibold text-text">Cookies</h2>
          <p>
            We use minimal cookies for essential site functionality. No third-party advertising cookies are used.
          </p>
          <h2 className="text-lg font-semibold text-text">Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
            <Link href="/contact" className="text-primary hover:underline">
              our contact page
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
