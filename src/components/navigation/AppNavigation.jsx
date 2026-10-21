import React, { useEffect, useRef, useState } from 'react';
import HomeView from './HomeView.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { APP_SCREENS } from '../../models/navigationScreens.js';
import './AppNavigation.css';

export default function AppNavigation({ children }) {
  const [screen, setScreen] = useState('inicio');
  const [visited, setVisited] = useState([]);
  const heading = useRef(null);
  const scrollPositions = useRef({});
  function navigate(next) {
    if (next !== 'inicio' && !APP_SCREENS.some(item => item.id === next)) return;
    scrollPositions.current[screen] = window.scrollY;
    setVisited(current => current.includes(next) ? current : [...current, next]);
    setScreen(next);
  }
  useEffect(() => {
    window.scrollTo(0, scrollPositions.current[screen] ?? 0);
    heading.current?.focus({ preventScroll: true });
  }, [screen]);
  const current = APP_SCREENS.find(item => item.id === screen);
  return <div className="app-navigation">
    <div className="appearance-bar"><span>TES Control & Nómina</span><ThemeToggle /></div>
    {screen !== 'inicio' && <header className="screen-header"><button type="button" onClick={() => navigate('inicio')}>← Volver al inicio</button><h1 ref={heading} tabIndex={-1}>{current?.title}</h1></header>}
    {screen === 'inicio' && <HomeView onNavigate={navigate} screens={APP_SCREENS} />}
    {children({ screen, navigate, visited })}
  </div>;
}
