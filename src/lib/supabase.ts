import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://owbsjzczcvfrnldpoaic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YnNqemN6Y3Zmcm5sZHBvYWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDg1NTEsImV4cCI6MjA4ODE4NDU1MX0.jAgozz0-328iICXrmoEI08oTjQxpTLWmJgmmdyQLFsg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
