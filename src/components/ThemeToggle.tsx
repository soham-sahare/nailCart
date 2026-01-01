'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        padding: '0.5rem',
        borderRadius: '50%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <FiMoon size={20} /> : <FiSun size={20} />}
    </button>
  );
}
