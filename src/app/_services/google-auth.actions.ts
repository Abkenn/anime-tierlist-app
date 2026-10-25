'use server';
import { getGoogleTierlist } from './google-auth';
export const readGoogleTierlist = async () => getGoogleTierlist();
