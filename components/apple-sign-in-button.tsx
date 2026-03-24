"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { isNativePlatform } from "@/lib/platform/device";
import { buildAuthCallbackUrl } from "@/lib/platform/post-auth-destination";

export function AppleSignInButton({
    label = "Continuer avec Apple",
    requestedNext,
}: {
    label?: string;
    requestedNext?: string | null;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const searchParams = new URLSearchParams(window.location.search);
            const next = requestedNext || searchParams.get("next");

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "apple",
                options: {
                    redirectTo: buildAuthCallbackUrl(window.location.origin, {
                        requestedNext: next,
                        isNativeShell: isNativePlatform(),
                    }),
                },
            });

            if (error) {
                console.error("Apple login error:", error);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Apple login exception:", error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[#000000] text-white font-medium text-base py-3.5 rounded-xl 
                transition-all duration-200 
                hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]
                flex items-center justify-center gap-3
                border border-white/10 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
                <svg className="w-5 h-5 mb-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.16 0-1.54-.73-2.92-.73-1.39 0-1.81.71-2.92.73-1.15.02-2.34-.84-3.32-1.84C2.65 18.06 1 14.88 1 11.75c0-3.1 1.95-4.75 3.82-4.75 1 0 1.94.59 2.56.59.61 0 1.69-.7 2.87-.7 1.25 0 2.37.47 3.1 1.2-3.15 1.88-2.65 6.13.56 7.4-.92 1.98-2.12 3.8-3.08 4.79zM12.75 5.56c-.63.77-1.46 1.2-2.28 1.15a1.9 1.9 0 0 1-.22-.01c.01-.84.4-1.68 1.05-2.42.66-.76 1.58-1.28 2.39-1.28.08 0 .16 0 .23.01-.06.91-.48 1.75-1.17 2.55z"
                        fill="currentColor"
                    />
                </svg>
            )}
            {label}
        </button>
    );
}
