import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">An Leabharlann Ghaelach</h3>
          <p className="footer-description">
            A digital library and database for Irish and Celtic source texts, 
            editions, translations, and scholarly resources.
          </p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Resources</h4>
          <ul className="footer-links">
            <li><a href="/how-to">User Guide</a></li>
            <li><a href="/">Browse Library</a></li>
            <li><a href="/label?label=Text">Texts</a></li>
            <li><a href="/label?label=Author">Authors</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">An Leabharlann Ghaelach</h3>
          <p className="footer-description">
            Leabharlann dhigiteach agus bunachar sonraí ar théacsanna foinse Gaeilge 
            agus Ceilteacha, eagráin, aistriúcháin, agus acmhainní scolártha.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          Copyright © 2024 - {currentYear} <a href="https://x.com/ogmios" target="_blank">Ogmios</a>.
        </p>
        <p className="footer-note" style={{ display: 'flex', flexDirection: 'column' }}>
          <span>Caraim-se foss, ferr cach clú</span>
          <span>oc mo lebrán léir ingnu</span>
        </p>
      </div>
    </footer>
  );
}