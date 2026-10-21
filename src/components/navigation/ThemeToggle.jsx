import { useState } from 'react';
import { getTheme, saveTheme } from '../../services/themeService.js';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme);
  const [error, setError] = useState(false);
  function change(next) {
    setTheme(next);
    setError(!saveTheme(next));
  }
  return <div className="theme-control">
    <div className="theme-options" role="group" aria-label="Aspecto de la app">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => change('light')}>☀ Claro</button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => change('dark')}>☾ Oscuro</button>
    </div>
    {error && <small role="status">El aspecto se ha cambiado, pero no se ha podido guardar para la próxima vez.</small>}
  </div>;
}
