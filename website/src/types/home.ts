export interface HeroSlide {
  id: string;
  title: string;
  description: string;
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

export interface LeadershipMetric {
  value: string;
  label: string;
  icon: "calendar" | "award" | "chart" | "trophy";
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
}

export interface CountryOption {
  value: string;
  label: string;
}
