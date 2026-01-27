"use client";

import { ScriptMetadata } from "@/lib/types";
import { ScriptCard } from "./script-card";
import { FileText } from "lucide-react";

interface ScriptGridProps {
    scripts: ScriptMetadata[];
    isLoading: boolean;
    searchQuery: string;
    userEmail: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onSettings: (script: ScriptMetadata) => void;
}

export function ScriptGrid({
    scripts,
    isLoading,
    searchQuery,
    userEmail,
    onLoad,
    onRename,
    onDelete,
    onTogglePublic,
    onSettings,
}: ScriptGridProps) {

    // Filtering Logic - Only show user's own scripts
    const normSearch = searchQuery.trim().toLowerCase();
    const filteredScripts = scripts.filter((s) => {
        const matchesSearch =
            !normSearch || s.title.toLowerCase().includes(normSearch);
        return s.is_owner && matchesSearch;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-1 md:px-0">
            {isLoading ? (
                // Skeleton Loading
                [1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="aspect-[4/5] bg-card rounded-3xl skeleton-shimmer"
                    />
                ))
            ) : scripts.length > 0 ? (
                filteredScripts.length > 0 ? (
                    filteredScripts.map((s, index) => (
                        <ScriptCard
                            key={s.id}
                            script={s}
                            userEmail={userEmail}
                            index={index}
                            onLoad={onLoad}
                            onRename={onRename}
                            onDelete={onDelete}
                            onTogglePublic={onTogglePublic}
                            onSettings={onSettings}
                        />
                    ))
                ) : (
                    /* No Search Results */
                    <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card mx-4 md:mx-0">
                        <div className="w-20 h-20 mx-auto mb-4 opacity-20">
                            <FileText className="w-full h-full text-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground">Aucun document ici</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto px-4">
                            Aucun script ne correspond à votre recherche.
                        </p>
                    </div>
                )
            ) : (
                /* Empty State (Global) */
                <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card mx-4 md:mx-0">
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full skeleton-shimmer" />
                        <img
                            src="/repeto.png"
                            alt="Repeto Mascot"
                            className="relative w-full h-full object-contain opacity-80"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                        Votre bibliothèque est vide
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto px-4">
                        Touchez le bouton + pour importer votre premier script PDF.
                    </p>
                </div>
            )}
        </div>
    );
}
