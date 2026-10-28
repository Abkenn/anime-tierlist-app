'use client';

import { useRouter } from 'next/navigation';
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  previewLeaveEvent,
  previewReturnEvent,
} from '@/app/_lib/tierlist-share-id';

export const usePreviewReturn = (beforeNavigate?: () => void) => {
  const router = useRouter();
  const [state, setState] = useState({
    navigation: router.bfcacheId,
    returning: false,
  });
  const destination = useRef<{
    navigation: typeof router.bfcacheId;
    href: string;
  } | null>(null);
  const returning = state.navigation === router.bfcacheId && state.returning;

  useLayoutEffect(() => {
    return () => {
      destination.current = null;
      setState((current) => ({ ...current, returning: false }));
    };
  }, []);

  const requestReturn = useEffectEvent((event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') {
      return;
    }
    event.preventDefault();
    if (destination.current?.navigation !== router.bfcacheId) {
      destination.current = {
        navigation: router.bfcacheId,
        href: event.detail,
      };
      setState({ navigation: router.bfcacheId, returning: true });
    }
  });

  useEffect(() => {
    window.addEventListener(previewReturnEvent, requestReturn);

    return () => window.removeEventListener(previewReturnEvent, requestReturn);
  }, []);

  const finishReturn = () => {
    const href = destination.current?.href;
    if (!href) {
      return;
    }
    destination.current = null;
    startTransition(() => {
      beforeNavigate?.();
      window.dispatchEvent(new Event(previewLeaveEvent));
      router.push(href, { scroll: false });
    });
  };

  return { returning, finishReturn };
};
