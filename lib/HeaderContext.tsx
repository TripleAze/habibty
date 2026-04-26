'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface HeaderContextType {
  isHidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [isHidden, setHidden] = useState(false);

  return (
    <HeaderContext.Provider value={{ isHidden, setHidden }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader(options?: { hide?: boolean }) {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }

  useEffect(() => {
    if (options?.hide !== undefined) {
      context.setHidden(options.hide);
    }
  }, [options?.hide, context]);

  return context;
}
