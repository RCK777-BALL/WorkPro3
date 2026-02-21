import React from 'react';
import clsx from 'clsx';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={clsx('mx-auto w-full max-w-[1440px] px-4 pb-8 pt-4 md:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
