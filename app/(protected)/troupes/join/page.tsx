'use client';

import { joinTroupe } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Users, X, Hash } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function JoinTroupePage() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCodeChange = (value: string) => {
        // Auto-uppercase, keep only alphanumeric and dashes
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        setCode(cleaned);
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const troupeId = await joinTroupe(code);
            router.push(`/troupes/${troupeId}`);
        } catch (err: any) {
            setError(err?.message || "Code invalide ou impossible de rejoindre cette troupe.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col px-5 pt-24 pb-24">
            {/* Back link */}
            <Link
                href="/troupes"
                className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start mb-auto"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour aux troupes
            </Link>

            {/* Centered content */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8 py-10">

                {/* Icon hero */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold text-foreground">Rejoindre une troupe</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Entrez le code d'invitation que vous avez reçu de l'administrateur de la troupe.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Code input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Code d'invitation
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <Hash className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                placeholder="TROUPE-XXXX"
                                disabled={isLoading}
                                autoFocus
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck={false}
                                className={cn(
                                    "w-full h-14 pl-10 pr-4 rounded-2xl border-2 bg-card text-foreground font-mono text-lg tracking-widest placeholder:text-muted-foreground/40 placeholder:font-sans placeholder:tracking-normal placeholder:text-base transition-all outline-none",
                                    error
                                        ? "border-red-500/60 focus:border-red-500"
                                        : "border-border focus:border-primary"
                                )}
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground px-1">
                            Le code ressemble à <span className="font-mono font-semibold">TROUPE-XXXX</span>. Demandez-le à l'admin de la troupe.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full h-13 rounded-2xl text-base font-semibold"
                        disabled={isLoading || !code.trim()}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Connexion...
                            </>
                        ) : (
                            <>
                                <Users className="w-4 h-4 mr-2" />
                                Rejoindre la troupe
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
