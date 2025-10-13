// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://yrgqqphpmszbeutdsftq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3FxcGhwbXN6YmV1dGRzZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwOTg3NjEsImV4cCI6MjA3NTY3NDc2MX0.zixzDMJ8u8deCqpfr5gqukYUUTHoozNiiyRwtLKBp6w';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
