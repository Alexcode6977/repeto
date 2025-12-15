"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard Error Boundary:", error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center p-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Une erreur est survenue</h2>
            <p className="text-gray-400 max-w-md">
                Nous n'avons pas pu charger votre tableau de bord. Cela peut être dû à un problème de connexion ou de configuration.
            </p>
            <div className="flex gap-4 pt-4">
                <Button onClick={() => window.location.reload()} variant="outline" className="border-white/10 hover:bg-white/5">
                    Rafraîchir la page
                </Button>
                <Button onClick={() => reset()} className="bg-primary hover:bg-primary/90 text-white">
                    Réessayer
                </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-8 p-4 bg-black/50 rounded-xl text-left text-xs text-red-300 overflow-auto max-w-lg">
                    {error.message}
                    {error.stack}
                </pre>
            )}
        </div>
    );
}
