import type {
  CountryOption,
  Destination,
  FaqItem,
  HeroSlide,
  InfoCardItem,
  LeadershipMetric,
  ProcessStep,
  StatItem,
} from "@/types/home";

/** Unsplash placeholders — replace with brand photography when available */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "kabul",
    title: "Discover Kabul",
    description:
      "Experience the capital with its mountain backdrop, bazaars, and layers of history.",
    imageSrc:
      "https://images.unsplash.com/photo-1589801258579-18e091f4ca26?w=1600&q=80",
    imageAlt: "Mountain landscape near Kabul, Afghanistan",
  },
  {
    id: "culture",
    title: "Explore Afghan Culture",
    description:
      "Immerse yourself in traditions, hospitality, and centuries of craftsmanship.",
    imageSrc:
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=1600&q=80",
    imageAlt: "Historical architecture and cultural heritage placeholder",
  },
  {
    id: "adventure",
    title: "Your Journey Awaits",
    description:
      "From highland valleys to historic cities, Afghanistan offers unforgettable experiences.",
    imageSrc:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
    imageAlt: "Dramatic mountain peaks at sunrise",
  },
];

export const APPLYING_FROM_OPTIONS: CountryOption[] = [
  { value: "united-states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "india", label: "India" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "australia", label: "Australia" },
  { value: "japan", label: "Japan" },
  { value: "china", label: "China" },
];

export const DESTINATIONS: Destination[] = [
  {
    id: "kabul",
    title: "Kabul",
    description:
      "Kabul is an ancient, 3,500-year-old city famous for being a historic Silk Road trading hub, its stunning mountain backdrops, and a turbulent but resilient history. Kabul was deeply loved by the founder of the Mughal Empire, Emperor Babur, who laid out the terraced Bagh-e Babur (Gardens of Babur) in the 16th century. It remains his final resting place today. The city is flanked by ancient defensive walls winding across the Sher Darwaza and Asmai mountains, and features magnificent landmarks such as the ruined Darul Aman Palace and the Shah-e Doh Shamshira Mosque.",
    imageSrc:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    imageAlt: "Mountain landscape representing Kabul, Afghanistan",
  },
  {
    id: "herat",
    title: "Herat",
    description:
      "Herat is the historic capital of Herat Province in western Afghanistan, located near the Iranian border. Known as the \"Pearl of Khorasan,\" it serves as a major agricultural, economic, and trading hub for the region. Historically a center of knowledge and arts under the Timurid dynasty, the city boasts a rich architectural legacy. Major landmarks include the Herat Citadel (Qala-e-Ikhtiyaruddin), the Great Mosque of Herat (Masjid-e-Jami), the Musalla Minarets, and Malan Bridge.",
    imageSrc:
      "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=80",
    imageAlt: "Historic architecture representing Herat, Afghanistan",
  },
];

export const COUNTRY_INFO_CARDS: InfoCardItem[] = [
  {
    id: "industries",
    title: "Key Sectors",
    icon: "industry",
    items: [
      "Agriculture & horticulture",
      "Mining & natural resources",
      "Trade & logistics corridors",
      "Handicrafts & textiles",
      "Reconstruction & infrastructure",
    ],
  },
  {
    id: "economy",
    title: "Economic Highlights",
    icon: "economy",
    items: [
      "Strategic Central Asian corridor",
      "Growing regional trade links",
      "Resource-rich highland economy",
      "Expanding digital services",
      "Visa pathways for visitors & business",
    ],
  },
  {
    id: "culture",
    title: "Culture & Lifestyle",
    icon: "culture",
    items: [
      "Rich cultural heritage",
      "Warm hospitality traditions",
      "Diverse landscapes & regions",
      "Historic cities & routes",
      "Crafts, cuisine & celebration",
    ],
  },
];

export const COUNTRY_STATS: StatItem[] = [
  { value: "40M+", label: "Population" },
  { value: "34", label: "Provinces" },
  { value: "Central Asia", label: "Strategic Region" },
  { value: "Kabul", label: "Capital City" },
];

export const LEADERSHIP_METRICS: LeadershipMetric[] = [
  { value: "eVisa", label: "Digital Applications", icon: "calendar" },
  { value: "Tourist", label: "Visa Categories", icon: "award" },
  { value: "Secure", label: "Document Handling", icon: "chart" },
  { value: "Guided", label: "End-to-End Support", icon: "trophy" },
];

export const PROCESS_STEPS: ProcessStep[] = [
  { id: "1", title: "Details", icon: "details" },
  { id: "2", title: "Upload Passport Copy", icon: "passport" },
  { id: "3", title: "Submit Form", icon: "submit" },
  { id: "4", title: "Upload All Documents", icon: "documents" },
  { id: "5", title: "Payment", icon: "payment" },
];

export const FAQS: FaqItem[] = [
  {
    id: "visa-needed",
    question: "Do I need a visa to travel to Afghanistan?",
    answer:
      "Most foreign nationals require a visa to enter Afghanistan. Eligibility, visa type, and entry points (e.g. airport vs land border) depend on your nationality and purpose of travel. Always confirm current requirements before applying.",
  },
  {
    id: "fee",
    question: "How do I pay the visa fee?",
    answer:
      "You can pay online through credit/debit card via our secure payment gateway during the application process.",
  },
  {
    id: "passport",
    question: "What should be a passport validity?",
    answer:
      "Your passport should typically be valid for at least six months from your planned travel date. Exact rules may vary by visa category.",
  },
  {
    id: "extend",
    question: "Can the visa validity be extended?",
    answer:
      "Visa validity generally cannot be changed, modified, or extended after issuance unless official authorities allow a specific process.",
  },
  {
    id: "separate",
    question: "Can a couple submit one shared application?",
    answer:
      "No. Each applicant must submit a separate application with their own documents and fees.",
  },
  {
    id: "name-match",
    question: "Do all documents need to match my passport name?",
    answer:
      "Yes. Names and key details across documents must match your passport exactly.",
  },
];
