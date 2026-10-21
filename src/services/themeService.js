import { getStorageItem, setStorageItem } from './storageService.js';

export const THEME_KEY = 'tes_nomina_theme';

export function getTheme() {
  return getStorageItem(THEME_KEY, 'light') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme) {
  applyTheme(theme);
  return setStorageItem(THEME_KEY, theme);
}
