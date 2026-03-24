'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Sparkles, Check, X } from "lucide-react";
import { createTroupe } from "@/lib/actions/troupe";
import { cn } from "@/lib/utils";

export default function CreateTroupePage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [hasMoreThan12, setHasMoreThan12] = useState<string>("no");
    const [troupeName, setTroupeName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!troupeName.trim()) {
            setError("Veuillez entrer un nom de troupe");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const hasMore = hasMoreThan12 === "yes";
            const troupeId = await createTroupe(troupeName, hasMore);
            router.push(`/troupes/${troupeId}`);
        } catch (err: any) {
            setError(err.message || "Erreur lors de la création de la troupe");
            setLoading(false);
        }
    };

    const selectedPlan = hasMoreThan12 === "yes"
        ? { label: "Troupe XL", price: "30€/mois" }
        : { label: "Troupe", price: "20€/mois" };

    return (
        <div className="min-h-screen flex flex-col px-5 pt-24 pb-24">
            {/* Centered content */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8 py-6">

                {/* Hero */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        {step === 1
                            ? <Users className="w-10 h-10 text-primary" />
                            : <Sparkles className="w-10 h-10 text-primary" />
                        }
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold text-foreground">
                            {step === 1 ? "Créer une troupe" : "Nommez votre troupe"}
                        </h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {step === 1
                                ? "Combien de membres dans votre troupe ?"
                                : "Choisissez un nom qui représente votre groupe."}
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2">
                    <div className={cn("w-6 h-1.5 rounded-full transition-colors", step === 1 ? "bg-primary" : "bg-primary/30")} />
                    <div className={cn("w-6 h-1.5 rounded-full transition-colors", step === 2 ? "bg-primary" : "bg-border")} />
                </div>

                {step === 1 ? (
                    <div className="space-y-4">
                        {/* Trial badge */}
                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-600 border border-violet-500/20">
                                <Sparkles className="w-3 h-3" />
                                Essai gratuit d'1 mois — sans carte bancaire
                            </span>
                        </div>

                        {/* Option cards */}
                        <div className="space-y-3">
                            <button
                                onClick={() => setHasMoreThan12("no")}
                                className={cn(
                                    "w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                                    hasMoreThan12 === "no"
                                        ? "border-primary bg-primary/5"
                                        : "border-border bg-card"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                            hasMoreThan12 === "no" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">12 membres ou moins</p>
                                            <p className="text-xs text-muted-foreground">Offre Troupe standard</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-bold text-foreground text-base">20€</p>
                                            <p className="text-[10px] text-muted-foreground">/mois</p>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                            hasMoreThan12 === "no" ? "border-primary bg-primary" : "border-border"
                                        )}>
                                            {hasMoreThan12 === "no" && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setHasMoreThan12("yes")}
                                className={cn(
                                    "w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                                    hasMoreThan12 === "yes"
                                        ? "border-primary bg-primary/5"
                                        : "border-border bg-card"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                            hasMoreThan12 === "yes" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">Plus de 12 membres</p>
                                            <p className="text-xs text-muted-foreground">Offre Troupe XL</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-bold text-foreground text-base">30€</p>
                                            <p className="text-[10px] text-muted-foreground">/mois</p>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                            hasMoreThan12 === "yes" ? "border-primary bg-primary" : "border-border"
                                        )}>
                                            {hasMoreThan12 === "yes" && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <Button onClick={() => setStep(2)} size="lg" className="w-full h-13 rounded-2xl text-base font-semibold">
                            Continuer
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Selected plan recap */}
                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Check className="w-3 h-3" />
                                {selectedPlan.label} · {selectedPlan.price}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Nom de la troupe
                            </label>
                            <Input
                                placeholder="ex: Troupe du Théâtre Municipal"
                                value={troupeName}
                                onChange={(e) => {
                                    setTroupeName(e.target.value);
                                    if (error) setError(null);
                                }}
                                disabled={loading}
                                autoFocus
                                className="text-base h-14 rounded-2xl"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !loading) handleCreate();
                                }}
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-violet-500/8 border border-violet-500/15 flex items-start gap-3">
                            <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">30 jours gratuits.</span> Aucune carte bancaire requise. Annulable à tout moment.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                disabled={loading}
                                className="rounded-xl"
                            >
                                Retour
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={loading || !troupeName.trim()}
                                className="flex-1 h-13 rounded-2xl text-base font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-4 h-4 mr-2" />
                                        Créer ma troupe
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
