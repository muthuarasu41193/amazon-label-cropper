import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { PerformanceStats } from "@/components/PerformanceStats";
import { BeforeAfter } from "@/components/BeforeAfter";
import { Features } from "@/components/Features";
import { SupportedPlatforms } from "@/components/SupportedPlatforms";
import { Testimonials } from "@/components/Testimonials";
import { PrivacyTrust } from "@/components/PrivacyTrust";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <TrustBar />
        <PerformanceStats />
        <BeforeAfter />
        <SupportedPlatforms />
        <Features />
        <Testimonials />
        <PrivacyTrust />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
