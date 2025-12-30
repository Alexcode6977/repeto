"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { deleteTroupe } from "@/lib/actions/troupe";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DeleteTroupeButtonProps {
    troupeId: string;
    troupeName?: string;
}

export function DeleteTroupeButton({ troupeId, troupeName }: DeleteTroupeButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteTroupe(troupeId);
            router.push("/troupes");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la suppression de la troupe.");
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-red-500/20 bg-red-500/5 mt-8">
            <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    Zone de danger
                </CardTitle>
                <CardDescription className="text-red-600/70">
                    La suppression de la troupe est irréversible. Toutes les données associées (membres, distribution, planning) seront perdues.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer la troupe définitivement
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Supprimer {troupeName || "la troupe"} ?
                            </DialogTitle>
                            <DialogDescription>
                                Cette action est <strong>irréversible</strong>. Cela supprimera définitivement la troupe et désinscrira tous les membres.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                Annuler
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Confirmer la suppression
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
