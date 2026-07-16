"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Facebook,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Globe,
  X,
  LogIn,
  LogOut,
} from "lucide-react";
import { CONTACT, NAV_LINKS, SOCIAL_LINKS } from "@/lib/site";
import { useAuth } from "@/context/AuthContext";
import styles from "./Header.module.css";

function SocialIcon({ icon }: { icon: (typeof SOCIAL_LINKS)[number]["icon"] }) {
  if (icon === "facebook") return <Facebook size={14} aria-hidden />;
  if (icon === "twitter") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return <Linkedin size={14} aria-hidden />;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const userLabel = user?.displayName?.trim() || user?.email || "Account";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
    return () => {
      document.documentElement.classList.remove("menu-open");
    };
  }, [menuOpen]);

  return (
    <header className={styles.header} suppressHydrationWarning>
      <div className={styles.topBar}>
        <div className={styles.topInner}>
          <div className={styles.socialNav}>
            {SOCIAL_LINKS.map((item) => (
              <a key={item.label} href={item.href} className={styles.socialLink}>
                <SocialIcon icon={item.icon} />
                <span className={styles.socialLabel}>{item.label}</span>
              </a>
            ))}
          </div>

          <Link href="/" className={styles.mobileTopLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/raizing-logo.png"
              alt="Raizing Global"
              className={styles.mobileTopRaizing}
            />
          </Link>

          <div className={styles.topMeta}>
            <div className={styles.metaItem}>
              <Mail size={14} aria-hidden />
              <span className={styles.metaText}>{CONTACT.email}</span>
            </div>
            <div className={styles.metaItem}>
              <MapPin size={14} aria-hidden />
              <span className={styles.metaText}>{CONTACT.addressDelhi}</span>
            </div>
            <div className={styles.metaItem}>
              <Globe size={14} aria-hidden />
              <span className={styles.metaText}>English</span>
            </div>
            {!loading && user ? (
              <div className={styles.authBlock}>
                <span className={styles.userLabel} title={user.email ?? undefined}>
                  {userLabel}
                </span>
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={14} aria-hidden />
                  <span>{loggingOut ? "…" : "Logout"}</span>
                </button>
              </div>
            ) : !loading ? (
              <Link href="/login" className={styles.loginBtn}>
                <LogIn size={14} aria-hidden />
                <span>Login</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <nav className={styles.navbar} aria-label="Primary">
        {/* Raizing logo — left side, NO divider */}
        <Link href="/" className={styles.brandLogos} aria-label="Salaam Afghanistan home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/raizing-logo.png"
            alt="Raizing Global"
            className={styles.raizingLogo}
          />
        </Link>

        <ul className={styles.navList}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.navRight}>
          {/* Partner logo — right side */}
          <Link href="/" className={styles.partnerLogoLink}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Salaam Afghanistan"
              className={styles.partnerLogo}
            />
          </Link>

          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mounted && menuOpen ? (
        <div className={styles.offcanvas} role="dialog" aria-modal="true">
          <div className={styles.offcanvasHeader}>
            <span className={styles.offcanvasTitle}>Menu</span>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={22} />
            </button>
          </div>
          <div className={styles.offcanvasLogos}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raizing-logo.png" alt="Raizing Global" className={styles.offcanvasRaizing} />
            <span className={styles.logoDivider} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Salaam Afghanistan" className={styles.offcanvasPartner} />
          </div>
          <ul className={styles.offcanvasNav}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.offcanvasLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}