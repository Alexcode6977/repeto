'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { addGuestMember } from "@/lib/actions/troupe";
import Link from "next/link";

export function AddGuestModal({ troupeId }: { troupeId: string }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        try {
            await addGuestMember(troupeId, name, email || undefined);
            setIsOpen(false);
            setName("");
            setEmail("");
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('MEMBER_LIMIT_REACHED')) {
                setIsOpen(false);
                setShowUpgradeModal(true);
            } else {
                alert("Erreur lors de l'ajout du membre.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                        <UserPlus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Ajouter un membre provisoire</span>
                        <span className="md:hidden">Ajouter</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau membre provisoire</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom complet / Pseudo</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Jean Dupont"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email (optionnel)</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="jean@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                L'email permettra de l'inviter officiellement plus tard.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ajouter à la troupe"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Upgrade Modal */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <DialogTitle className="text-center">Limite de membres atteinte</DialogTitle>
                        <DialogDescription className="text-center">
                            Votre formule Troupe est limitée à 12 membres (comédiens + invités).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="w-5 h-5 text-violet-500" />
                                <span className="font-bold text-violet-400">Troupe XL</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Passez à Troupe XL pour ajouter des membres sans limite.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>
                            Plus tard
                        </Button>
                        <Button asChild className="bg-violet-500 hover:bg-violet-600">
                            <Link href={`/troupes/${troupeId}/settings?upgrade=true`}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Passer à Troupe XL
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
