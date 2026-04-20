import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export interface DealerSettings {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  gstNumber: string;
  status: string;
}

interface DealerContextType {
  settings: DealerSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const DealerContext = createContext<DealerContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
});

export const DealerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuthStore();
  const [settings, setSettings] = useState<DealerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    // Immediately set loading to false for non-dealer roles
    if (!user || (user?.role !== 'DEALER_ADMIN' && user?.role !== 'DEALER_STAFF')) {
      setLoading(false);
      return;
    }

    // Only fetch for dealer roles
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/dealer/settings`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dealer settings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <DealerContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </DealerContext.Provider>
  );
};

export const useDealer = () => useContext(DealerContext);
