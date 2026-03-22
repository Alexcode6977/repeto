'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';
import { Users } from 'lucide-react';

export function NativeRedirect() {
    const router = useRouter();
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        // Run only on client
        if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
            setIsNative(true);

            const checkSession = async () => {
                try {
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        router.replace('/favoris');
                    } else {
                        router.replace('/login');
                    }
                } catch (error) {
                    console.error("Error checking native session:", error);
                    router.replace('/login');
                }
            };

            checkSession();
        }
    }, [router]);

    if (!isNative) return null;

    // Full screen overlay for native app to hide landing page
    return (
        <div className="fixed inset-0 z-[9999] bg-[#050508] flex flex-col items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center gap-4">
                {/* Using a simple SVG or icon if available, or just text */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-8 h-8 text-white"
                    >
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                </div>
                <p className="text-white/60 font-medium">Chargement...</p>
            </div>
        </div>
    );
}
