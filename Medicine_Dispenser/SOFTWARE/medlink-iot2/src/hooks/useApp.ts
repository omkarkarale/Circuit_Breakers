import { useContext } from 'react';
import { AppContext, AppContextType } from '../context/AppContext';

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
