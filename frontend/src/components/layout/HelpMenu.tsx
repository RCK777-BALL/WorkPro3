/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef } from 'react';
import { HelpCircle, Book, Video, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import Card from '@common/Card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface HelpMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HelpMenu: React.FC<HelpMenuProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      menuRef.current?.focus();
    } else {
      buttonRef.current?.focus();
    }
  }, [open]);

  const helpResources = [
    {
      title: t('header.documentation'),
      description: t('header.documentationDesc'),
      icon: <Book size={20} />,
      link: '/documentation',
      color: 'text-primary-600',
    },
    {
      title: t('header.videoTutorials'),
      description: t('header.videoTutorialsDesc'),
      icon: <Video size={20} />,
      link: '/documentation#videos',
      color: 'text-teal-600',
    },
    {
      title: t('header.liveChat'),
      description: t('header.liveChatDesc'),
      icon: <MessageCircle size={20} />,
      link: '/messages',
      color: 'text-success-600',
    },
    {
      title: t('header.knowledgeBase'),
      description: t('header.knowledgeBaseDesc'),
      icon: <FileText size={20} />,
      link: '/documentation#kb',
      color: 'text-accent-600',
    },
  ];

  const handleResourceClick = (link: string) => {
    onOpenChange(false);
    navigate(link);
  };

  const handleContactSupport = () => {
    onOpenChange(false);
    navigate('/messages');
  };

  const toggle = () => onOpenChange(!open);

  return (
    <div className="relative">
      <button
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
        aria-label="Help menu"
        aria-haspopup="true"
        aria-expanded={open}
        ref={buttonRef}
        onClick={toggle}
      >
        <HelpCircle size={20} className="dark:text-white" />
      </button>

      {open && (
        <div
          ref={menuRef}
          tabIndex={-1}
          role="menu"
          aria-label="Help menu"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onOpenChange(false);
            }
          }}
        >
          <Card
            title={t('header.helpResources')}
            subtitle={t('header.helpSubtitle')}
            noPadding
          >
            <div className="p-2">
              {helpResources.map((resource, index) => (
                <button
                  key={index}
                  onClick={() => handleResourceClick(resource.link)}
                  className="w-full flex items-start p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-150"
                >
                  <div className={`p-2 rounded-lg ${resource.color} bg-opacity-10`}>
                    {resource.icon}
                  </div>
                  <div className="ml-3 text-left">
                    <h4 className="font-medium text-neutral-900 dark:text-white">{resource.title}</h4>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{resource.description}</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-neutral-400" />
                </button>
              ))}
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-t border-neutral-200 dark:border-neutral-600">
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{t('header.needHelp')}</p>
              <Button className="w-full" onClick={handleContactSupport}>
                {t('header.contactSupport')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HelpMenu;

