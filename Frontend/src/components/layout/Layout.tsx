import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { theme } = useThemeStore();
  const {
    theme: themeSettings,
    setTheme: setThemeSettings,
  } = useSettingsStore();
  const { sidebarCollapsed } = themeSettings;
  

  useEffect(() => {
    // Handle system theme preference
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const toggleSidebar = () => {
    setThemeSettings({ sidebarCollapsed: !sidebarCollapsed });
  };

  const toggleMobileSidebar = () => {
    setSidebarMobileOpen(!sidebarMobileOpen);
  };

  return (
    <div className="h-screen flex bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>
      
      {/* Mobile Sidebar */}
      {sidebarMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black opacity-50"
            onClick={toggleMobileSidebar}
          ></div>
          <Sidebar
            collapsed={false}
            onToggleCollapse={toggleMobileSidebar}
          />
        </div>
      )}
      
      <div className={`
        flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        <Header 
          onToggleSidebar={toggleMobileSidebar}
          title={title}
        />
        
        <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto dark:bg-neutral-900 dark:text-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
