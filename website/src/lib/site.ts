export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "General Information", href: "/general-information" },
  { label: "Contact Us", href: "/contact" },
];

export const CONTACT = {
  email: "info@raizingglobal.com",
  phoneDelhi: "+91-11-41737373",
  phoneDubai: "+971-45786091",
  addressDelhi: "Rai House, C-4 2nd Floor SDA, New Delhi-110016",
  addressDelhiFull:
    "Rai House, C-4 2nd Floor Safdarjung Development Area, New Delhi-110016",
  addressDubai:
    "Office No: 3601, Cluster F, HDS Tower, Jumeirah Lake Towers, Dubai, UAE",
} as const;

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "#", icon: "facebook" as const },
  { label: "Twitter", href: "#", icon: "twitter" as const },
  { label: "LinkedIn", href: "#", icon: "linkedin" as const },
] as const;
