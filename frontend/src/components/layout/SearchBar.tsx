/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  showMobileSearch: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ showMobileSearch }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="hidden md:flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2 w-96">
        <Search size={18} className="text-neutral-700 dark:text-neutral-300" />
        <input
          type="text"
          placeholder={t('header.searchPlaceholder')}
          className="bg-transparent border-none outline-none w-full text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 ml-2"
        />
      </div>
      {showMobileSearch && (
        <div className="absolute top-16 inset-x-0 px-4 py-2 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 md:hidden">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2">
            <Search size={18} className="text-neutral-700 dark:text-neutral-300" />
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              className="bg-transparent border-none outline-none w-full text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 ml-2"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;

