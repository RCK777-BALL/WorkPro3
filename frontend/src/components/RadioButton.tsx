import React from 'react';
import { useThemeStore } from '../store/themeStore';

// Supported application themes
export type Themes = 'light' | 'dark' | 'system';

const RadioButton: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  // Update the global theme when a radio input is selected
  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheme(e.target.value as Themes);
  };

  return (
    <div className="flex gap-2">
      <label className="flex items-center gap-1">
        <input
          type="radio"
          name="theme"
          value="light"
          checked={theme === 'light'}
          onChange={handleThemeChange}
        />
        Light
      </label>
      <label className="flex items-center gap-1">
        <input
          type="radio"
          name="theme"
          value="dark"
          checked={theme === 'dark'}
          onChange={handleThemeChange}
        />
        Dark
      </label>
      <label className="flex items-center gap-1">
        <input
          type="radio"
          name="theme"
          value="system"
          checked={theme === 'system'}
          onChange={handleThemeChange}
        />
        System
      </label>
    </div>
  );
};

export default RadioButton;
