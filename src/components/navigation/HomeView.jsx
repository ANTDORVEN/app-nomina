import React from 'react';

export default function HomeView({ onNavigate, screens }) {
  return <section className="home-view" aria-labelledby="home-title">
    <p className="home-kicker">TES Control & Nómina</p>
    <h1 id="home-title">¿Qué quieres consultar?</h1>
    <p className="home-intro">Tu trabajo y la organización de casa, a mano.</p>
    <div className="home-main-grid">{screens.map(screen => <button type="button" className={`home-tile home-${screen.id}`} key={screen.id} onClick={() => onNavigate(screen.id)}><span className="home-icon" aria-hidden="true">{screen.icon}</span><span><strong>{screen.title}</strong><small>{screen.detail}</small></span><span aria-hidden="true">→</span></button>)}</div>
    <p className="home-storage-note">Los datos se guardan en este navegador. Puedes hacer una copia desde Ajustes.</p>
  </section>;
}
