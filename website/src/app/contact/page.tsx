import type { Metadata } from "next";
import { ContactView } from "@/components/contact/ContactView";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Raizing Global for Afghanistan visa support. Email, phone, office addresses, and an enquiry form.",
};

export default function ContactPage() {
  return <ContactView />;
}
