import React from 'react';
import styles from '@/public/styles/footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.siteFooter}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>An Leabharlann Ghaelach</h3>
          <p className={styles.footerDescription}>
            A digital library and database for Irish and Celtic source texts, 
            editions, translations, and scholarly resources.
          </p>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerHeading}>Resources</h3>
          <ul className={styles.footerLinks}>
            <li><a className={styles.a} href="/how-to">User Guide</a></li>
            <li><a className={styles.a} href="/">Browse Library</a></li>
            <li><a className={styles.a} href="/label?label=Text">Texts</a></li>
            <li><a className={styles.a} href="/label?label=Author">Authors</a></li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>An Leabharlann Ghaelach</h3>
          <p className={styles.footerDescription}>
            Leabharlann dhigiteach agus bunachar sonraí ar théacsanna foinse Gaeilge 
            agus Ceilteacha, eagráin, aistriúcháin, agus acmhainní scolártha.
          </p>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p className={styles.footerCopyright}>
          Copyright © 2024 - {currentYear} <a className={styles.a} href="https://x.com/ogmios" target="_blank">Ogmios</a>.
        </p>
        <p className={styles.footerNote}>
          <span>Caraim-se foss, ferr cach clú</span>
          <span>oc mo lebrán léir ingnu</span>
        </p>
      </div>
    </footer>
  );
}