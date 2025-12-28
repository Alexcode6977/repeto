"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deletePlayAction } from "@/lib/actions/play";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface DeletePlayButtonProps {
    playId: string;
    playTitle: string;
}

export function DeletePlayButton({ playId, playTitle }: DeletePlayButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsLoading(true);
        try {
            await deletePlayAction(playId);
            setOpen(false);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la suppression de la pièce.");
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
                    className="h-10 w-10 rounded-full bg-card border border-border hover:bg-red-500/20 hover:text-red-400 text-foreground transition-all group/delete"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(true);
                    }}
                >
                    <Trash2 className="h-4 w-4 transition-transform group-hover/delete:scale-110" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121212] border-border text-foreground rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/20 mx-auto">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center">Supprimer la pièce ?</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-center pt-2">
                        Êtes-vous sûr de vouloir retirer <span className="text-foreground font-bold">"{playTitle}"</span> de la bibliothèque de la troupe ?
                        Cette action est irréversible pour cette troupe.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-3 sm:gap-0 mt-6">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="flex-1 rounded-xl border border-border hover:bg-card"
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 font-bold"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Supprimer"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
