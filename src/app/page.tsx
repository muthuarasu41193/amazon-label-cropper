import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { Features } from "@/components/Features";
import { SupportedPlatforms } from "@/components/SupportedPlatforms";
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
        <SupportedPlatforms />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
