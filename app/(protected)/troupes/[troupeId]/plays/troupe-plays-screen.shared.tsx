"use client";

import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TroupePlaysScreenProps } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.types";
import { TroupeImportWizard } from "@/app/(protected)/troupes/[troupeId]/plays/components/troupe-import-wizard";

export function TroupePlaysIntro() {
    return (
        <div className="flex flex-col gap-2 relative z-10 overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
                Bibliothèque
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                Accédez aux scripts, distribuez les rôles et lancez les répétitions.
            </p>
        </div>
    );
}

export function TroupePlaysEmptyState({
    isAdmin,
}: Pick<TroupePlaysScreenProps, "isAdmin">) {
    if (isAdmin) {
        return null;
    }

    return (
        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-60">
            <BookOpen className="h-16 w-16 mb-4" />
            <p>Aucune pièce disponible</p>
        </div>
    );
}

export function TroupePlaysAddCard({
    onOpenImportWizard,
}: Pick<TroupePlaysScreenProps, "onOpenImportWizard">) {
    return (
        <button onClick={onOpenImportWizard} className="block group relative w-full aspect-[2/3] cursor-pointer text-left z-20">
            <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-4 transition-all duration-300 text-muted-foreground hover:text-primary">
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8 pointer-events-none" />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs pointer-events-none">Ajouter une pièce</span>
            </div>
        </button>
    );
}

export function TroupePlaysToolbar({
    canManage,
    onOpenImportWizard,
}: Pick<TroupePlaysScreenProps, "canManage" | "onOpenImportWizard">) {
    if (!canManage) {
        return null;
    }

    return (
        <div className="flex justify-end">
            <Button onClick={onOpenImportWizard} size="sm" className="rounded-full font-semibold cursor-pointer z-20 relative">
                <Plus className="w-4 h-4 mr-2 pointer-events-none" />
                Ajouter une pièce
            </Button>
        </div>
    );
}

export function TroupePlaysImportWizard(props: TroupePlaysScreenProps) {
    return (
        <TroupeImportWizard
            troupeId={props.troupeId}
            showImportGuide={props.showImportWizard}
            setShowImportGuide={(show) => (show ? props.onOpenImportWizard() : props.onCloseImportWizard())}
            userTier={props.userTier}
            userEmail={props.userEmail}
            onImportComplete={props.onImportComplete}
            onError={(message) => alert(message)}
        />
    );
}
