'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerNativeAuthListener } from "@/lib/platform/auth";
import { isNativePlatform } from "@/lib/platform/device";

export function AuthHandler() {
    const router = useRouter();

    useEffect(() => {
        if (!isNativePlatform()) return;

        let listenerCleanup: (() => Promise<void>) | null = null;

        void registerNativeAuthListener((destination) => {
            router.replace(destination);
            router.refresh();
        }).then((listener) => {
            listenerCleanup = listener.remove;
        });

        return () => {
            if (listenerCleanup) {
                void listenerCleanup();
            }
        };
    }, [router]);

    return null;
}
