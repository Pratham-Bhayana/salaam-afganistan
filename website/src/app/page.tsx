import { AboutPreviewSection } from "@/components/home/AboutPreviewSection";
import { DestinationsSection } from "@/components/home/DestinationsSection";
import { FaqSection } from "@/components/home/FaqSection";
import { HeroSection } from "@/components/home/HeroSection";
import { LeadershipSection } from "@/components/home/LeadershipSection";
import { OpportunitiesSection } from "@/components/home/OpportunitiesSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { VisaStatusBanner } from "@/components/VisaStatusBanner";

export default function HomePage() {
  return (
    <>
      <VisaStatusBanner variant="home" />
      <HeroSection />
      <DestinationsSection />
      <LeadershipSection />
      <OpportunitiesSection />
      <AboutPreviewSection />
      <ProcessSection />
      <FaqSection />
    </>
  );
}
