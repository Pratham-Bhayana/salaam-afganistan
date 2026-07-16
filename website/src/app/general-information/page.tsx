import type { Metadata } from "next";
import { GeneralInfoSection } from "@/components/home/GeneralInfoSection";

export const metadata: Metadata = {
  title: "General Information",
  description:
    "Afghanistan visa entry types, visa categories, required documents, and related travel resources.",
};

export default function GeneralInformationPage() {
  return <GeneralInfoSection />;
}
