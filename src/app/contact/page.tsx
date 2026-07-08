import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Mail, MessageSquare } from "lucide-react";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: `Get in touch with the ${SITE.name} team for support, feature requests, or enterprise inquiries.`,
};

export default function ContactPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-text">Contact us</h1>
        <p className="mt-4 text-muted">
          Have a question, feature request, or need help with a specific label format? We&apos;d love to hear from you.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="panel-card p-6">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-semibold text-text">Email</h2>
            <a href={`mailto:${SITE.email}`} className="mt-1 block text-sm text-primary hover:underline">
              {SITE.email}
            </a>
          </div>
          <div className="panel-card p-6">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-semibold text-text">Feature requests</h2>
            <p className="mt-1 text-sm text-muted">
              Tell us which marketplace or carrier preset you need next.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
