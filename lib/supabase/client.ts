import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error("Supabase Client: Missing environment variables.");
        // Return a mock or throw a handled error to prevent white screen of death
        throw new Error("Missing Supabase configuration");
    }

    return createBrowserClient(url, key)
}
