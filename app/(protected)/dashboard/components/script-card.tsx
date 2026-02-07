"use client";

import { useState } from "react";
import { ScriptMetadata } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileText, Play, Trash2, Globe, Lock, Edit3, Loader2, Settings2, MoreHorizontal, Download, Pencil, BarChart2 } from "lucide-react";
import { DownloadButton } from "@/components/offline/download-button";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";

interface ScriptCardProps {
    script: ScriptMetadata;
    userEmail: string | null;
    index: number;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onSettings: (script: ScriptMetadata) => void;
    isAdmin?: boolean;
    onRenameSubmit?: (e: React.FormEvent, id: string) => void;
    renamingScriptId?: string | null;
    renamingScriptTitle?: string;
    setRenamingScriptTitle?: (title: string) => void;
    onShowStats?: (script: ScriptMetadata) => void;
}

export function ScriptCard({
    script,
    userEmail,
    index,
    onLoad,
    onRename,
    onDelete,
    onTogglePublic,
    onSettings,
    onShowStats,
}: ScriptCardProps) {
    const isAdminUser = isPlatformAdminEmail(userEmail);
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempTitle, setTempTitle] = useState(script.title);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const handleRenameSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (tempTitle.trim() && tempTitle !== script.title) {
            await onRename(script.id, tempTitle);
        } else {
            setTempTitle(script.title); // reset if empty or unchanged
        }
        setIsRenaming(false);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Voulez-vous vraiment supprimer ce script ?")) return;
        setIsDeleting(true);
        try {
            await onDelete(script.id);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsToggling(true);
        try {
            await onTogglePublic(script);
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div
            onClick={() => !isRenaming && onLoad(script)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`
        group relative aspect-[3/4] md:aspect-[4/5] bg-card border border-border rounded-[2rem] overflow-hidden cursor-pointer card-3d hover-glow 
        active:scale-[0.98] md:hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/10 transition-all duration-300 animate-bounce-in
        ${script.is_public ? "border-amber-500/20" : ""}
      `}
        >
            {/* Card Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />

            {/* Mobile Actions Menu - Top Left */}
            <div className="absolute top-4 left-4 z-30 md:hidden" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-foreground rounded-full w-9 h-9 hover:bg-white/20"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => onSettings(script)}>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Réglages
                        </DropdownMenuItem>
                        {/* Stats Mobile Item */}
                        <DropdownMenuItem onClick={() => onShowStats?.(script)}>
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Statistiques
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsRenaming(true)} disabled={!script.is_owner}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Renommer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <DownloadButton
                                scriptId={script.id}
                                className="w-full justify-start bg-transparent hover:bg-accent border-0 px-2 py-1.5 text-sm cursor-pointer"
                                showLabel
                            />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(script.is_owner || isAdminUser) && (
                            <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Supprimer
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Public Badge - Floating */}
            {script.is_public && (
                <div className="absolute top-4 right-4 z-20 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                    <Globe className="w-3 h-3" />
                    Shared
                </div>
            )}

            {/* Icon / Preview - Large & Centered */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700">
                <FileText
                    className={`w-32 h-32 md:w-40 md:h-40 ${script.is_public ? "text-amber-500" : "text-foreground"
                        }`}
                />
            </div>

            {/* Content - Bottom Aligned */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                    {isRenaming ? (
                        <form
                            onSubmit={handleRenameSubmit}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-2"
                        >
                            <input
                                autoFocus
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={() => handleRenameSubmit()}
                                className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </form>
                    ) : (
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-2xl md:text-xl font-bold text-foreground leading-tight drop-shadow-md truncate flex-1">
                                {script.title || "Script Sans Titre"}
                            </h3>
                            {script.is_owner && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                    }}
                                    className="text-foreground/40 hover:text-foreground transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">
                        <span>{script.characterCount} rôles</span>
                        <span className="w-1 h-1 bg-gray-500 rounded-full" />
                        <span>{script.lineCount} répliques</span>
                    </div>
                </div>

                {/* Desktop Hover Actions */}
                <div className="hidden md:flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {/* Settings Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/10 hover:bg-primary/20 hover:text-primary text-foreground rounded-xl"
                        onClick={(e) => { e.stopPropagation(); onSettings(script); }}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/10 hover:bg-blue-500/20 hover:text-blue-400 text-foreground rounded-xl"
                        title="Voir les statistiques"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowStats?.(script);
                        }}
                    >
                        <BarChart2 className="w-4 h-4" />
                    </Button>

                    <div onClick={(e) => e.stopPropagation()}>
                        <DownloadButton scriptId={script.id} className="bg-white/10 hover:bg-white/20 text-white border-0 w-12 h-12" />
                    </div>

                    {(script.is_owner || isAdminUser) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-foreground rounded-xl"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )}
                    {isAdminUser && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-xl ${script.is_public
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-white/10 text-muted-foreground"
                                }`}
                            onClick={handleToggle}
                            disabled={isToggling}
                        >
                            {isToggling ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : script.is_public ? (
                                <Globe className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
