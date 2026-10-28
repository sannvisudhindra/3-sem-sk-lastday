import { useState, useEffect } from 'react';

export interface ActiveHoldState {
  holdId: string;
  eventId: string;
  eventTitle: string;
  expiresAt: string; // ISO string from server
  totalPaise: number;
  ticketCount: number;
}

const STORAGE_KEY = 'encore_active_hold';

// In-memory fallback if sessionStorage is unavailable (e.g. Node tests / SSR)
let memoryStore: ActiveHoldState | null = null;

export function getActiveHold(): ActiveHoldState | null {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      raw = window.sessionStorage.getItem(STORAGE_KEY);
    } else {
      raw = memoryStore ? JSON.stringify(memoryStore) : null;
    }

    if (!raw) return null;
    const hold: ActiveHoldState = JSON.parse(raw);

    // Rule R4 & R8: Lazy expiry - if expiresAt has passed, treat as released
    if (new Date(hold.expiresAt).getTime() <= Date.now()) {
      setActiveHold(null);
      return null;
    }
    return hold;
  } catch {
    return null;
  }
}

export function setActiveHold(hold: ActiveHoldState | null) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (!hold) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hold));
      }
      window.dispatchEvent(new Event('encore_hold_updated'));
    } else {
      memoryStore = hold;
    }
  } catch {
    memoryStore = hold;
  }
}

export function useActiveHold(): ActiveHoldState | null {
  const [hold, setHold] = useState<ActiveHoldState | null>(() => getActiveHold());

  useEffect(() => {
    const onUpdate = () => setHold(getActiveHold());
    if (typeof window !== 'undefined') {
      window.addEventListener('encore_hold_updated', onUpdate);
      window.addEventListener('storage', onUpdate);
    }

    const interval = setInterval(() => {
      const current = getActiveHold();
      if (!current && hold) {
        setHold(null);
      }
    }, 1000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('encore_hold_updated', onUpdate);
        window.removeEventListener('storage', onUpdate);
      }
      clearInterval(interval);
    };
  }, [hold]);

  return hold;
}
