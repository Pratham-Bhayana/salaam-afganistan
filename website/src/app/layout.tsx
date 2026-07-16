import type { Metadata } from "next";
import { Great_Vibes, Manrope } from "next/font/google";
import { DomSafetyPatch } from "@/components/DomSafetyPatch";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BackToTop } from "@/components/ui/BackToTop";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-great-vibes",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Salaam Afghanistan — Visa Services",
    template: "%s | Salaam Afghanistan",
  },
  description:
    "Professional Afghanistan visa services and travel assistance. Apply online with Salaam Afghanistan — powered by Raizing Global.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${greatVibes.variable}`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <DomSafetyPatch />
          <SmoothScrollProvider />
          <Header />
          <main>{children}</main>
          <Footer />
          <BackToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
