"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Users, Sparkles } from "lucide-react";
import { createTroupe } from "@/lib/actions/troupe";

interface CreateTroupeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTroupeDialog({ open, onOpenChange }: CreateTroupeDialogProps) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [hasMoreThan12, setHasMoreThan12] = useState<string>("no");
    const [troupeName, setTroupeName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = () => {
        setStep(1);
        setHasMoreThan12("no");
        setTroupeName("");
        setError(null);
        setLoading(false);
    };

    const handleClose = (open: boolean) => {
        if (!open && !loading) {
            handleReset();
        }
        onOpenChange(open);
    };

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        }
    };

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

            // Success - navigate first, then close dialog
            router.push(`/troupes/${troupeId}`);
            router.refresh();

            // Small delay to ensure navigation starts before closing dialog
            setTimeout(() => {
                handleReset();
                onOpenChange(false);
            }, 100);
        } catch (err: any) {
            console.error("Error creating troupe:", err);
            setError(err.message || "Erreur lors de la création de la troupe");
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {step === 1 ? (
                            <>
                                <Users className="w-6 h-6 text-primary" />
                                Créer une troupe
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-6 h-6 text-primary" />
                                Nommez votre troupe
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "Démarrez avec un essai gratuit d'1 mois"
                            : "Choisissez un nom qui représente votre groupe"}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Member count question */}
                {step === 1 && (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">
                                Votre troupe compte-t-elle plus de 12 membres ?
                            </Label>
                            <RadioGroup value={hasMoreThan12} onValueChange={setHasMoreThan12}>
                                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                                    <RadioGroupItem value="no" id="no" />
                                    <Label
                                        htmlFor="no"
                                        className="flex-1 cursor-pointer font-normal"
                                    >
                                        <div className="font-semibold">Non, 12 membres ou moins</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Offre Troupe • 20€/mois après l'essai
                                        </div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                                    <RadioGroupItem value="yes" id="yes" />
                                    <Label
                                        htmlFor="yes"
                                        className="flex-1 cursor-pointer font-normal"
                                    >
                                        <div className="font-semibold">Oui, plus de 12 membres</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Offre Troupe XL • 30€/mois après l'essai
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleNext} size="lg" className="w-full sm:w-auto">
                                Continuer
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Troupe name */}
                {step === 2 && (
                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-base font-semibold">
                                Nom de la troupe
                            </Label>
                            <Input
                                id="name"
                                placeholder="ex: Troupe du Théâtre Municipal"
                                value={troupeName}
                                onChange={(e) => setTroupeName(e.target.value)}
                                disabled={loading}
                                autoFocus
                                className="text-base"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !loading) {
                                        handleCreate();
                                    }
                                }}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold">Essai gratuit d'1 mois</p>
                                    <p className="text-xs text-muted-foreground">
                                        Profitez de toutes les fonctionnalités pendant 30 jours. Aucune carte bancaire requise.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Retour
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={loading || !troupeName.trim()}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    "Créer ma troupe"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
