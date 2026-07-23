export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
}

export interface Destination {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface InfoCardItem {
  id: string;
  title: string;
  icon: "industry" | "economy" | "culture";
  items: string[];
}

export interface LeaderInfo {
  name: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  bio: string[];
  infoRows: { label: string; value: string }[];
  /** Minister's message shown below the portrait */
  messageTitle?: string;
  messageBody?: string;
}

export interface OurStoryContent {
  heading: string;
  subHeading: string;
  paragraphs: string[];
}

export interface ProcessStep {
  id: string;
  title: string;
  icon: "details" | "passport" | "submit" | "documents" | "payment";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  linkHref?: string;
  linkLabel?: string;
}

export interface DocumentRequirement {
  title: string;
  items: string[];
}

export interface GeneralInfoContent {
  entryTypes: string;
  visaTypes: string[];
  documents: DocumentRequirement[];
  externalLinks: { label: string; href: string }[];
}

export interface CountryOption {
  value: string;
  label: string;
}
