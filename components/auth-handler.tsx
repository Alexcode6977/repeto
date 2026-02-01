'use client';

import { useEffect } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export function AuthHandler() {
    const router = useRouter();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handleDeepLink = async (event: URLOpenListenerEvent) => {
            const url = new URL(event.url);

            // Check if this is the auth callback
            // Scheme: com.souffleur.app
            // Path: /auth/callback (or just capture the fragment/query)
            if (url.host === 'auth' && url.pathname === '/callback') {
                // Supabase sends the session in the URL fragment (#access_token=...) or query
                // The supabase client's getSession() or exchangeCodeForSession usually handles parsing 
                // IF the browser was redirected correctly.
                // But here we are manually catching the URL ensuring the session is set.

                const supabase = createClient();

                // Extract params from hash or search
                const params = new URLSearchParams(url.hash.substring(1)); // remove #
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (!error) {
                        router.push('/dashboard');
                    } else {
                        console.error('Failed to set session from deep link:', error);
                    }
                }
            }
        };

        const listener = App.addListener('appUrlOpen', handleDeepLink);

        return () => {
            listener.then(handle => handle.remove());
        };
    }, [router]);

    return null;
}
