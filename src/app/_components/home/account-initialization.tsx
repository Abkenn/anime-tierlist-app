import { connection } from 'next/server';
import { readAccountInitialization } from '@/app/_services/account-initialization';
import { AccountInitializationBridge } from './account-initialization-bridge';

export const AccountInitialization = async () => {
  await connection();
  const initial = await readAccountInitialization().catch(() => ({
    status: 'unavailable' as const,
  }));
  return <AccountInitializationBridge initial={initial} />;
};
