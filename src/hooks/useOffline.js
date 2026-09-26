import { useEffect, useState } from 'react';

const STORAGE_KEY = 'open-doors-offline-orders';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateConnection = () => {
      setIsOffline(!navigator.onLine);
    };

    const updatePendingCount = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const orders = saved ? JSON.parse(saved) : [];

        setPendingCount(
          Array.isArray(orders) ? orders.length : 0
        );
      } catch {
        setPendingCount(0);
      }
    };

    updateConnection();
    updatePendingCount();

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    window.addEventListener('storage', updatePendingCount);

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      window.removeEventListener('storage', updatePendingCount);
    };
  }, []);

  return {
    isOffline,
    pendingCount,
  };
}

export default useOffline;