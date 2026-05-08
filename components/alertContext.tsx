import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertModal } from './alertModal';

interface AlertContextType {
  showAlert: (title: string, message?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const showAlert = (newTitle: string, newMessage: string = '') => {
    setTitle(newTitle);
    setMessage(newMessage);
    setVisible(true);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal visible={visible} title={title} message={message} onClose={() => setVisible(false)} />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within an AlertProvider');
  return context;
};