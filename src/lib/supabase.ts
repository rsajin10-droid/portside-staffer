import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://owbsjzczcvfrnldpoaic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01ukOcIWuYr2RLrxKE1R2w_bc9GHPTQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
