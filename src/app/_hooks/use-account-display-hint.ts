'use client';

import { useEffect, useState } from 'react';

const key = 'tierlist-account-display';

// Cosmetic only. Never use this hint to authorize or select an account profile.
export const useAccountDisplayHint = () => {
  const [name, setName] = useState('');

  useEffect(() => {
    try {
      setName(localStorage.getItem(key) ?? '');
    } catch {
      // Storage can be unavailable; verified account initialization still works.
    }
  }, []);

  const remember = (value: string) => {
    setName(value);

    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // This optional display hint must never block sign-in or sign-out.
    }
  };

  return { name, remember, clear: () => remember('') };
};
