"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteGuestAction } from "@/lib/actions/troupe";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteGuestButtonProps {
    troupeId: string;
    guestId: string;
    guestName: string;
}

export function DeleteGuestButton({ troupeId, guestId, guestName }: DeleteGuestButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteGuestAction(troupeId, guestId);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la suppression de l'invité.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
                    disabled={isLoading}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Retirer cet invité ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Voulez-vous vraiment retirer <span className="font-bold text-foreground">{guestName}</span> de la troupe ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                        Supprimer l'invité
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
