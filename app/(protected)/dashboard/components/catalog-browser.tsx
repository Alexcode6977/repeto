"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCatalogScripts, importFromCatalog, CatalogScript } from "../actions";
import { Search, Loader2, Download, ArrowLeft, Users, FileText, Check } from "lucide-react";

interface CatalogBrowserProps {
    onClose: () => void;
    onImportComplete: () => Promise<void>;
    onError: (msg: string) => void;
}

export function CatalogBrowser({ onClose, onImportComplete, onError }: CatalogBrowserProps) {
    const [scripts, setScripts] = useState<CatalogScript[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [importingId, setImportingId] = useState<string | null>(null);
    const [importedIds, setImportedIds] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<"title" | "characters" | "lines">("title");

    useEffect(() => {
        loadCatalog();
    }, []);

    const loadCatalog = async () => {
        setIsLoading(true);
        try {
            const data = await getCatalogScripts();
            setScripts(data);
        } catch (err) {
            onError("Erreur lors du chargement du catalogue");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (script: CatalogScript) => {
        setImportingId(script.id);
        try {
            const result = await importFromCatalog(script.id);
            if (result.success) {
                setImportedIds(prev => [...prev, script.id]);
                await onImportComplete();
            } else {
                onError(result.error || "Erreur lors de l'import");
            }
        } catch (err) {
            onError("Erreur lors de l'import");
        } finally {
            setImportingId(null);
        }
    };

    // Filter and sort
    const normSearch = searchQuery.trim().toLowerCase();
    const filteredScripts = scripts
        .filter(s => !normSearch || s.title.toLowerCase().includes(normSearch))
        .sort((a, b) => {
            if (sortBy === "title") return a.title.localeCompare(b.title);
            if (sortBy === "characters") return b.characterCount - a.characterCount;
            if (sortBy === "lines") return b.lineCount - a.lineCount;
            return 0;
        });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div
                className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Catalogue</h2>
                            <p className="text-sm text-muted-foreground">
                                {scripts.length} pièces disponibles
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Rechercher une pièce..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 h-12 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { key: "title", label: "Nom" },
                            { key: "characters", label: "Personnages" },
                            { key: "lines", label: "Répliques" },
                        ].map((option) => (
                            <button
                                key={option.key}
                                onClick={() => setSortBy(option.key as typeof sortBy)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === option.key
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredScripts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>Aucune pièce trouvée</p>
                        </div>
                    ) : (
                        filteredScripts.map((script) => {
                            const isImporting = importingId === script.id;
                            const isImported = importedIds.includes(script.id);

                            return (
                                <div
                                    key={script.id}
                                    className="flex items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-2xl hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">
                                            {script.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {script.characterCount} rôles
                                            </span>
                                            <span>{script.lineCount} répliques</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleImport(script)}
                                        disabled={isImporting || isImported}
                                        className={`shrink-0 rounded-xl ${isImported
                                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                                            : ""
                                            }`}
                                        variant={isImported ? "outline" : "default"}
                                    >
                                        {isImporting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isImported ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Importé
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Ajouter à ma bibliothèque
                                            </>
                                        )}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
