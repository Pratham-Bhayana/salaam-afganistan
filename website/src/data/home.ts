import type {
  CountryOption,
  Destination,
  FaqItem,
  GeneralInfoContent,
  HeroSlide,
  InfoCardItem,
  LeaderInfo,
  OurStoryContent,
  ProcessStep,
  StatItem,
} from "@/types/home";

/** Homepage banner slides — Salaam Afghanistan Content PDF */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "kabul",
    title: "Discover Kabul",
    description:
      "Experience Afghanistan's historic capital, where ancient heritage, stunning mountain scenery, and timeless cultural landmarks come together.",
    ctaLabel: "Explore Kabul",
    ctaHref: "#destination-kabul",
    imageSrc: "/images/kabul-banner.png",
    imageAlt: "Kabul city banner",
  },
  {
    id: "herat",
    title: "Discover Herat",
    description:
      "Explore the Pearl of Khorasan, renowned for its magnificent Islamic architecture, ancient citadel, and rich cultural legacy.",
    ctaLabel: "Explore Herat",
    ctaHref: "#destination-herat",
    imageSrc: "/images/herat-banner.png",
    imageAlt: "Herat mosque banner",
  },
];

export const APPLYING_FROM_OPTIONS: CountryOption[] = [
  { value: "united-states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "spain", label: "Spain" },
  { value: "italy", label: "Italy" },
  { value: "brazil", label: "Brazil" },
  { value: "argentina", label: "Argentina" },
  { value: "colombia", label: "Colombia" },
  { value: "china", label: "China" },
  { value: "india", label: "India" },
  { value: "japan", label: "Japan" },
  { value: "south-korea", label: "South Korea" },
  { value: "australia", label: "Australia" },
  { value: "thailand", label: "Thailand" },
  { value: "singapore", label: "Singapore" },
  { value: "philippines", label: "Philippines" },
];

export const DESTINATIONS: Destination[] = [
  {
    id: "kabul",
    title: "Kabul",
    description:
      "Kabul, the capital and largest city of Afghanistan, is one of the oldest continuously inhabited cities in the world, with a history spanning more than 3,500 years. Situated amidst majestic mountains, the city has long served as an important crossroads along the historic Silk Road, connecting Central Asia, South Asia, and the Middle East.",
    imageSrc: "/images/kabul-destination.png",
    imageAlt: "Kabul destination",
  },
  {
    id: "herat",
    title: "Herat",
    description:
      "Located in western Afghanistan near the Iranian border, Herat is widely known as the \"Pearl of Khorasan.\" As one of the country's most historically significant cities, Herat has long been a center of trade, agriculture, learning, and artistic achievement.",
    imageSrc: "/images/herat-destination.png",
    imageAlt: "Herat destination",
  },
];

export const LEADER: LeaderInfo = {
  name: "His Excellency Hibatullah Akhundzada",
  title: "Supreme Lead of Islamic Emirate of Afghanistan",
  imageSrc: "/images/leader.png",
  imageAlt: "His Excellency Hibatullah Akhundzada",
  bio: [
    "Hibatullah Akhundzada serves as the Supreme Leader of Afghanistan and is the highest authority within the country's current governing structure. He has led the Taliban movement since 2016 and became the de facto head of state following the establishment of the Islamic Emirate of Afghanistan in August 2021.",
    "A religious scholar and Islamic jurist by background, Akhundzada previously served in judicial and religious leadership roles. Unlike many Taliban leaders, he is primarily known for his religious and legal authority rather than military leadership.",
  ],
  infoRows: [
    { label: "Position", value: "Supreme Leader of Afghanistan" },
    { label: "Full Name", value: "Hibatullah Akhundzada" },
    { label: "Assumed Leadership of Taliban", value: "2016" },
    { label: "Head of State Since", value: "August 2021" },
    { label: "Background", value: "Islamic Scholar & Jurist" },
  ],
};

export const COUNTRY_INFO_CARDS: InfoCardItem[] = [
  {
    id: "industries",
    title: "Key Industries",
    icon: "industry",
    items: [
      "Agriculture & Agribusiness",
      "Mining & Natural Resources",
      "Carpets & Handicrafts",
      "Trade & Logistics",
      "Construction & Infrastructure",
      "Tourism & Cultural Heritage",
    ],
  },
  {
    id: "economy",
    title: "Economic Highlights",
    icon: "economy",
    items: [
      "Strategic location connecting Central & South Asia",
      "Rich reserves of minerals and natural resources",
      "Emerging trade and transit corridors",
      "Growing opportunities in agriculture and mining",
      "Expanding regional connectivity projects",
      "Young and entrepreneurial workforce",
    ],
  },
  {
    id: "culture",
    title: "Culture & Lifestyle",
    icon: "culture",
    items: [
      "Rich Islamic and cultural heritage",
      "Diverse ethnic traditions and languages",
      "World-renowned hospitality",
      "Historic Silk Road legacy",
      "Stunning mountain landscapes and valleys",
      "Vibrant arts, crafts, and local traditions",
    ],
  },
];

export const COUNTRY_STATS: StatItem[] = [
  { value: "41M+", label: "Population" },
  { value: "34", label: "Provinces" },
  { value: "$14B+", label: "GDP (Approx.)" },
  { value: "#1", label: "Landlocked Country in South-Central Asia" },
];

export const OUR_STORY: OurStoryContent = {
  heading: "Our Story",
  subHeading: "Raizing Global – Our Vision",
  paragraphs: [
    "At Raizing Global, our expertise lies in visa facilitation and global mobility solutions. With years of experience in simplifying immigration and visa processes, we ensure that every traveller is guided by clarity, compliance, and confidence.",
    "Salaam Afghanistan is our dedicated platform for Afghanistan, created as a one-stop solution for visa applicants who want efficiency in their application process and a glimpse of Afghanistan's beauty before they even arrive.",
    "We believe that travel should be about discovering new experiences, not navigating complex bureaucracy. That's why we've streamlined every aspect of the Afghanistan visa application process, making it simple, transparent, and reliable for travelers from around the world.",
  ],
};

export const PROCESS_STEPS: ProcessStep[] = [
  { id: "1", title: "Details", icon: "details" },
  { id: "2", title: "Upload Passport Copy", icon: "passport" },
  { id: "3", title: "Submit Form", icon: "submit" },
  { id: "4", title: "Upload All Documents", icon: "documents" },
  { id: "5", title: "Payment", icon: "payment" },
];

export const FAQS: FaqItem[] = [
  {
    id: "eligibility",
    question: "How do I know if I am eligible to apply for an e-visa to Afghanistan?",
    answer:
      "Before proceeding with your application, ensure that you meet the eligibility requirements. Find more information on the Visa Requirements page.",
    linkHref: "/apply",
    linkLabel: "Check eligibility",
  },
  {
    id: "processing",
    question: "What is the processing time for my visa?",
    answer:
      "Applicants can choose between two processing types: Standard Processing (1-4 weeks) and VIP Processing (up to 1 business day). Please note that the timeframe stated above applies only to applications that are submitted with complete, clear, and correct documentation and do not require further review.",
  },
  {
    id: "fees",
    question: "How much are the Visa fees?",
    answer:
      "Visa fees depend on the processing type — Standard or Express processing. Fees vary by visa type and nationality.",
  },
  {
    id: "download",
    question: "Where can I download my e-visa?",
    answer:
      "You can download the e-visa from the Applicant Portal. The e-visa document will also be issued to you by email. Ensure that you have a working email to receive timely updates about your e-visa application.",
  },
];

export const GENERAL_INFO: GeneralInfoContent = {
  entryTypes: "Single Entry and Multiple Entry",
  visaTypes: [
    "Tourist – 3 Months",
    "Visit Visa – 3 Months",
    "Visit Visa – 6 Months",
    "Invitation Visa – 1 Month",
    "Invitation Visa – 3 Months",
    "Business Visa – 3 Months",
    "Business Visa – 6 Months",
    "Business Visa – 12 Months",
    "Diplomatic Visa – 1 Month",
    "Diplomatic Visa – 3 Months",
    "Diplomatic Visa – 6 Months",
    "Service Visa – 1 Month",
    "Service Visa – 3 Months",
    "Service Visa – 6 Months",
    "Service Visa – 1 Year",
  ],
  documents: [
    {
      title: "Electronic Passport",
      items: [
        "Upload a clear scan of your passport biodata page.",
        "It must be valid for at least 6 months from the expiration date.",
        "For applicants less than 18 years old, a clear copy of parent's passport is required.",
      ],
    },
    {
      title: "Colored Photograph",
      items: [
        "Printed in color with WHITE BACKGROUND.",
        "With a size of 45 mm x 35 mm.",
      ],
    },
    {
      title: "Other Identification Documents",
      items: [
        "Clear copy of National Identity Card or residence permit (if applicable).",
      ],
    },
    {
      title: "Supporting Documents (Optional)",
      items: [
        "Itinerary",
        "Accommodation proof",
        "Invitation letter – if it is a business meeting.",
      ],
    },
  ],
  externalLinks: [
    { label: "Raizing SIM", href: "https://raizingglobal.com" },
    { label: "Travel Insurance", href: "https://www.bsrone.com" },
  ],
};
