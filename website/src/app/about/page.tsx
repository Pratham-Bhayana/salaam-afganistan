import type { Metadata } from "next";
import { AboutCta } from "@/components/about/AboutCta";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutStory } from "@/components/about/AboutStory";
import { OpportunitiesSection } from "@/components/home/OpportunitiesSection";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn why travellers choose Salaam Afghanistan and Raizing Global for visa facilitation and global mobility.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutStory />
      <OpportunitiesSection />
      <AboutCta />
    </>
  );
}
