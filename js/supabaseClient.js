import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ⚠️ Replace with your Supabase project credentials
const SUPABASE_URL = "https://epwqflscoyqvcqfcfdpn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd3FmbHNjb3lxdmNxZmNmZHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDAzNjcsImV4cCI6MjA3MzQxNjM2N30.g6Gz6KLBuk67ND3oC8VguuU1HwZP7QhrSmxno0vG8MQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
