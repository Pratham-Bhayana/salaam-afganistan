import Link from "next/link";
import { CONTACT } from "@/lib/site";
import styles from "./Footer.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="divider" />
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div className={styles.logoBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Salaam Afghanistan logo" className={styles.logo} />
              <span className={styles.logoDivider} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/raizing-logo.png" alt="Raizing Global" className={styles.raizingLogo} />
            </div>
            <p className={styles.tagline}>
              Your trusted partner for Afghanistan visa services and travel solutions.
            </p>
          </div>

          <div>
            <h5 className={styles.cardTitle}>Corporate Office</h5>
            <div className={styles.contactBlock}>
              <h6>Address</h6>
              <p>{CONTACT.addressDelhiFull}</p>
            </div>
            <div className={styles.contactBlock}>
              <h6>Phone</h6>
              <p>{CONTACT.phoneDelhi}</p>
            </div>
            <div className={styles.contactBlock}>
              <h6>Email</h6>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </div>
          </div>

          <div>
            <h5 className={styles.cardTitle}>Global Office</h5>
            <div className={styles.contactBlock}>
              <h6>Address</h6>
              <p>{CONTACT.addressDubai}</p>
            </div>
            <div className={styles.contactBlock}>
              <h6>Phone</h6>
              <p>{CONTACT.phoneDubai}</p>
            </div>
            <div className={styles.contactBlock}>
              <h6>Email</h6>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.copyrightBar}>
        <div className={`container ${styles.copyrightInner}`}>
          <p>
            Copyright © {year} <Link href="/">Raizing Global</Link>. All rights reserved.
          </p>
          <div className={styles.legalLinks}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/legal">Legal Agreement</Link>
          </div>
        </div>
      </div>
      <div className="divider-sm" />
    </footer>
  );
}