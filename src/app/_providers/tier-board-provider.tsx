'use client';

import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { type PropsWithChildren, useState } from 'react';

export const TierBoardProvider = ({ children }: PropsWithChildren) => {
  const [store] = useState(createStore);

  return <Provider store={store}>{children}</Provider>;
};
