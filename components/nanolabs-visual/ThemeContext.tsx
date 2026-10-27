'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ColorPalette, PALETTES, DEFAULT_PALETTE_ID, getPalette, applyPaletteToDOM } from './palettes';

export type ERPTheme = '1' | '2';

interface ERPThemeContextType {
  theme: ERPTheme;
  setTheme: (theme: ERPTheme) => void;
  toggleERPTheme: () => void;
  palette: ColorPalette;
  setPalette: (paletteId: string) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ERPThemeContext = createContext<ERPThemeContextType>({
  theme: '2',
  setTheme: () => {},
  toggleERPTheme: () => {},
  palette: PALETTES[DEFAULT_PALETTE_ID],
  setPalette: () => {},
  isDark: false,
  toggleDarkMode: () => {},
});

export const useERPTheme = () => useContext(ERPThemeContext);

export function ERPThemeProvider({
  initialTheme = '2',
  initialPaletteId = DEFAULT_PALETTE_ID,
  children,
}: {
  initialTheme?: ERPTheme;
  initialPaletteId?: string;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ERPTheme>(initialTheme);
  const [palette, setPaletteState] = useState<ColorPalette>(getPalette(initialPaletteId));
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Theme 1 vs 2 resolution
    const searchParams = new URLSearchParams(window.location.search);
    const urlTheme = searchParams.get('theme');
    let resolvedTheme = initialTheme;

    if (urlTheme === '1' || urlTheme === '2') {
      resolvedTheme = urlTheme;
      document.cookie = `onlyfood_theme=${urlTheme}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyfood_theme', urlTheme);
    } else {
      const savedTheme = localStorage.getItem('onlyfood_theme');
      if (savedTheme === '1' || savedTheme === '2') {
        resolvedTheme = savedTheme;
      }
    }
    setThemeState(resolvedTheme);

    // 2. Palette resolution
    const urlPalette = searchParams.get('palette');
    let resolvedPaletteId = initialPaletteId;

    if (urlPalette && PALETTES[urlPalette]) {
      resolvedPaletteId = urlPalette;
      document.cookie = `onlyfood_palette=${urlPalette}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyfood_palette', urlPalette);
    } else {
      const savedPalette = localStorage.getItem('onlyfood_palette');
      if (savedPalette && PALETTES[savedPalette]) {
        resolvedPaletteId = savedPalette;
      }
    }
    const pal = getPalette(resolvedPaletteId);
    setPaletteState(pal);

    // 3. Dark mode resolution
    const savedDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('nl-theme') === 'dark';
    setIsDark(savedDark);

    if (savedDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }

    applyPaletteToDOM(pal, savedDark);
  }, [initialTheme, initialPaletteId]);

  const setTheme = (newTheme: ERPTheme) => {
    setThemeState(newTheme);
    if (typeof document !== 'undefined') {
      document.cookie = `onlyfood_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyfood_theme', newTheme);
    }
  };

  const toggleERPTheme = () => {
    setTheme(theme === '1' ? '2' : '1');
  };

  const setPalette = (paletteId: string) => {
    const pal = getPalette(paletteId);
    setPaletteState(pal);
    if (typeof document !== 'undefined') {
      document.cookie = `onlyfood_palette=${paletteId}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('onlyfood_palette', paletteId);
      applyPaletteToDOM(pal, isDark);
    }
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof document !== 'undefined') {
      const val = nextDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', val);
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('nl-theme', val);
      applyPaletteToDOM(palette, nextDark);
    }
  };

  return (
    <ERPThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleERPTheme,
        palette,
        setPalette,
        isDark,
        toggleDarkMode,
      }}
    >
      {children}
    </ERPThemeContext.Provider>
  );
}
