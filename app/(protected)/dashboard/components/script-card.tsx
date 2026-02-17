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
        group relative aspect-[3/4] md:aspect-[4/5] 
        bg-card dark:bg-card/50 
        border-0 dark:border dark:border-border 
        rounded-[2rem] overflow-hidden cursor-pointer 
        card-3d 
        shadow-sm hover:shadow-xl dark:shadow-none
        active:scale-[0.98] 
        md:hover:translate-y-[-4px]
        transition-all duration-300 animate-bounce-in
        ${script.is_public ? "ring-2 ring-amber-500/20" : ""}
      `}
        >
            {/* --- TOP: COVER ART (Gradient) --- */}
            <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-br from-primary/5 via-primary/10 to-transparent dark:from-primary/20 dark:to-transparent flex items-center justify-center overflow-hidden">
                {/* Decorative Circle Behind Icon */}
                <div className="absolute w-24 h-24 bg-primary/20 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-700" />

                <FileText
                    className={`relative z-10 w-16 h-16 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 ${script.is_public ? "text-amber-500" : "text-primary/60 dark:text-foreground/80"}`}
                    strokeWidth={1.5}
                />
            </div>

            {/* --- MIDDLE: Public Badge --- */}
            {script.is_public && (
                <div className="absolute top-4 right-4 z-20 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-600 dark:text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Shared
                </div>
            )}

            {/* --- BOTTOM: Content --- */}
            <div className="absolute bottom-0 left-0 right-0 top-[45%] p-5 flex flex-col justify-between bg-card z-20">

                <div className="flex flex-col pt-2">
                    {/* Date or Meta (Optional, can add later) */}

                    {/* Title */}
                    {isRenaming ? (
                        <form
                            onSubmit={handleRenameSubmit}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-1"
                        >
                            <input
                                autoFocus
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={() => handleRenameSubmit()}
                                className="w-full bg-muted/50 border border-primary/20 rounded-lg px-2 py-1 text-foreground text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </form>
                    ) : (
                        <div className="group/title flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-xl font-bold text-foreground leading-snug line-clamp-2" title={script.title}>
                                {script.title || "Script Sans Titre"}
                            </h3>
                            {script.is_owner && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                    }}
                                    className="opacity-0 group-hover/title:opacity-100 text-muted-foreground hover:text-primary transition-opacity p-1"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                            {script.characterCount} rôles
                        </span>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        <span className="flex items-center gap-1">
                            {script.lineCount} répliques
                        </span>
                    </div>
                </div>

                {/* Desktop Hover Actions (Now visible at bottom) */}
                <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {/* Settings Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
                        onClick={(e) => { e.stopPropagation(); onSettings(script); }}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowStats?.(script);
                        }}
                    >
                        <BarChart2 className="w-4 h-4" />
                    </Button>

                    <div onClick={(e) => e.stopPropagation()}>
                        {/* We style the DownloadButton trigger to match locally if possible, usually it renders a button */}
                        <DownloadButton scriptId={script.id} className="h-9 w-9 border-0 hover:bg-muted text-muted-foreground" showLabel={false} />
                    </div>

                    {(script.is_owner || isAdminUser) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-full"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Actions Menu - Keep Top Left for ease */}
            <div className="absolute top-3 left-3 z-30 md:hidden" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/20 text-foreground rounded-full w-8 h-8"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => onSettings(script)}>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Réglages
                        </DropdownMenuItem>
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
                        <DropdownMenuItem
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
