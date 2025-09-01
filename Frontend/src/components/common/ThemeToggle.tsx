import { Moon, Sun } from 'lucide-react';
import React from 'react';
import { useThemeStore } from '../../store/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      aria-label="Toggle theme"
      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
      onClick={toggle}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default ThemeToggle;
