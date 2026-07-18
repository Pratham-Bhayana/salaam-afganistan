import { AboutPreviewSection } from "@/components/home/AboutPreviewSection";
import { DestinationsSection } from "@/components/home/DestinationsSection";
import { FaqSection } from "@/components/home/FaqSection";
import { HeroSection } from "@/components/home/HeroSection";
import { LeadershipSection } from "@/components/home/LeadershipSection";
import { OpportunitiesSection } from "@/components/home/OpportunitiesSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { VisaStatusBanner } from "@/components/VisaStatusBanner";
import { Reveal } from "@/components/ui/Reveal";

export default function HomePage() {
  return (
    <>
      <VisaStatusBanner variant="home" />

      <Reveal preset="fade" duration={0.9}>
        <HeroSection />
      </Reveal>

      <DestinationsSection />

      <Reveal preset="left" duration={0.85}>
        <LeadershipSection />
      </Reveal>

      <OpportunitiesSection />

      <Reveal preset="right" duration={0.85}>
        <AboutPreviewSection />
      </Reveal>

      <Reveal preset="up" duration={0.85}>
        <ProcessSection />
      </Reveal>

      <Reveal preset="blur" duration={0.9}>
        <FaqSection />
      </Reveal>
    </>
  );
}
