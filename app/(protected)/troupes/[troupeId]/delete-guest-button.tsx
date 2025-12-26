"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteGuestAction } from "@/lib/actions/troupe";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteGuestButtonProps {
    troupeId: string;
    guestId: string;
    guestName: string;
}

export function DeleteGuestButton({ troupeId, guestId, guestName }: DeleteGuestButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteGuestAction(troupeId, guestId);
            setOpen(false);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la suppression de l'invité.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121212] border-white/10 text-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Retirer cet invité ?</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Voulez-vous vraiment retirer <span className="text-white font-bold">{guestName}</span> de la troupe ?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Annuler</Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="rounded-xl bg-red-500 hover:bg-red-600"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
