'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNativePlatform } from "@/lib/platform/device";
import {
    buildLoginPath,
    DEFAULT_NATIVE_POST_AUTH_DESTINATION,
} from "@/lib/platform/post-auth-destination";
import { resolveNativeStartupDestination } from "@/lib/platform/auth";

export function NativeRedirect() {
    const router = useRouter();
    const nativeShell = isNativePlatform();

    useEffect(() => {
        if (!nativeShell) return;

        let cancelled = false;

        void resolveNativeStartupDestination().then((destination) => {
            if (!destination || cancelled) {
                return;
            }

            const nextHref = destination === DEFAULT_NATIVE_POST_AUTH_DESTINATION
                ? destination
                : buildLoginPath({
                    requestedNext: DEFAULT_NATIVE_POST_AUTH_DESTINATION,
                    isNativeShell: true,
                });

            void router.prefetch(nextHref);
            router.replace(nextHref);
        });

        return () => {
            cancelled = true;
        };
    }, [nativeShell, router]);

    if (!nativeShell) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050508] flex flex-col items-center justify-center text-white">
            <div className="animate-pulse flex flex-col items-center gap-4">
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
