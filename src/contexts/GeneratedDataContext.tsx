import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GeneratedDataContextType {
  useGeneratedData: boolean;
  setUseGeneratedData: (value: boolean) => void;
}

const GeneratedDataContext = createContext<GeneratedDataContextType | undefined>(undefined);

export const GeneratedDataProvider = ({ children }: { children: ReactNode }) => {
  const [useGeneratedData, setUseGeneratedData] = useState(false);

  return (
    <GeneratedDataContext.Provider value={{ useGeneratedData, setUseGeneratedData }}>
      {children}
    </GeneratedDataContext.Provider>
  );
};

export const useGeneratedDataMode = () => {
  const context = useContext(GeneratedDataContext);
  if (context === undefined) {
    throw new Error('useGeneratedDataMode must be used within a GeneratedDataProvider');
  }
  return context;
};
