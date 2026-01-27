'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { addGuestMember } from "@/lib/actions/troupe";

export function AddGuestModal({ troupeId }: { troupeId: string }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
                alert("Limite de 12 membres atteinte. Passez à Troupe XL pour ajouter plus de membres.");
            } else {
                alert("Erreur lors de l'ajout du membre.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
    );
}
