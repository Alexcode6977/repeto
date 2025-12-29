"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Play, Trash2, Globe, Edit3, Mic } from "lucide-react";

interface ScriptMetadata {
    id: string;
    title: string;
    characterCount: number;
    lineCount: number;
    created_at: string;
    is_public?: boolean;
    is_owner?: boolean;
    hasVoiceConfig?: boolean;
}

interface ScriptCardProps {
    script: ScriptMetadata;
    index: number;
    isAdmin: boolean;
    onLoad: (script: ScriptMetadata) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onRename: (id: string, currentTitle: string) => void;
    onRenameSubmit: (e: React.FormEvent, id: string) => void;
    renamingScriptId: string | null;
    renamingScriptTitle: string;
    setRenamingScriptTitle: (title: string) => void;
}

export const ScriptCard = memo(function ScriptCard({
    script: s,
    index,
    isAdmin,
    onLoad,
    onDelete,
    onRename,
    onRenameSubmit,
    renamingScriptId,
    renamingScriptTitle,
    setRenamingScriptTitle,
}: ScriptCardProps) {
    return (
        <div
            onClick={() => onLoad(s)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`
        group relative aspect-[3/4] md:aspect-[4/5] bg-card border border-border rounded-[2rem] overflow-hidden cursor-pointer card-3d hover-glow 
        active:scale-[0.98] md:hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/10 transition-all duration-300 animate-bounce-in
        ${s.is_public ? 'border-amber-500/20' : ''}
      `}
        >
            {/* Card Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />

            {/* Badges Container - Top Right */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
                {/* Public Badge */}
                {s.is_public && (
                    <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                        <Globe className="w-3 h-3" />
                        Shared
                    </div>
                )}
                {/* Voice IA Badge */}
                {s.hasVoiceConfig && (
                    <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                        <Mic className="w-3 h-3" />
                        Voix IA
                    </div>
                )}
            </div>

            {/* Icon / Preview - Large & Centered */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700">
                <FileText className={`w-32 h-32 md:w-40 md:h-40 ${s.is_public ? 'text-amber-500' : 'text-foreground'}`} />
            </div>

            {/* Content - Bottom Aligned */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                    {renamingScriptId === s.id ? (
                        <form
                            onSubmit={(e) => onRenameSubmit(e, s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-2"
                        >
                            <input
                                autoFocus
                                type="text"
                                value={renamingScriptTitle}
                                onChange={(e) => setRenamingScriptTitle(e.target.value)}
                                onBlur={(e) => onRenameSubmit(e as any, s.id)}
                                className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </form>
                    ) : (
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-2xl md:text-xl font-bold text-foreground leading-tight drop-shadow-md truncate flex-1">
                                {s.title || "Script Sans Titre"}
                            </h3>
                            {s.is_owner && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRename(s.id, s.title);
                                    }}
                                    className="text-foreground/40 hover:text-foreground transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">
                        <span>{s.characterCount} rôles</span>
                        <span className="w-1 h-1 bg-gray-500 rounded-full" />
                        <span>{s.lineCount} répliques</span>
                    </div>
                </div>

                {/* Mobile Play Button overlay */}
                <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl pointer-events-none">
                    <Play className="w-6 h-6 text-foreground fill-white ml-1" />
                </div>

                {/* Desktop Hover Actions */}
                <div className="hidden md:flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <Button className="flex-1 bg-white text-black hover:bg-primary hover:text-foreground border-0 font-bold rounded-xl" size="sm">
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        Répéter
                    </Button>

                    {(s.is_owner || isAdmin) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-foreground rounded-xl"
                            onClick={(e) => onDelete(e, s.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ScriptCard;
