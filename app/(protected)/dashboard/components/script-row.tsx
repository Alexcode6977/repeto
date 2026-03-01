"use client";

import { memo } from "react";
import { FileText, MoreVertical, Mic, Globe } from "lucide-react";
import { DownloadButton } from "@/components/offline/download-button";
import { Button } from "@/components/ui/button";
import { ScriptMetadata } from "@/lib/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";



interface ScriptRowProps {
    script: ScriptMetadata;
    userEmail?: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, currentTitle: string) => void;
    onTogglePublic: (script: ScriptMetadata) => void;
    onShowStats?: (script: ScriptMetadata) => void;
}

export const ScriptRow = memo(function ScriptRow({
    script: s,
    userEmail,
    onLoad,
    onDelete,
    onRename,
    onTogglePublic,
    onShowStats,
}: ScriptRowProps) {
    const isAdminUser = isPlatformAdminEmail(userEmail);
    return (
        <div
            onClick={() => onLoad(s)}
            className="group flex items-center gap-4 p-3 bg-card border border-border/50 rounded-2xl active:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
        >
            {/* Icon Box */}
            <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                <FileText className={`w-6 h-6 ${s.is_public ? 'text-amber-500' : 'text-primary'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-foreground truncate text-sm md:text-base">
                        {s.title}
                    </h3>
                    {s.is_public && <Globe className="w-3 h-3 text-amber-500 shrink-0" />}
                    {s.hasVoiceConfig && <Mic className="w-3 h-3 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                    {s.characterCount} rôles • {s.lineCount} répliques
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <DownloadButton scriptId={s.id} className="w-8 h-8 md:w-10 md:h-10 border-0 bg-transparent text-muted-foreground hover:bg-secondary rounded-full" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground rounded-full">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => onRename(s.id, s.title)} disabled={!s.is_owner}>
                            Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShowStats?.(s)}>
                            Statistiques
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTogglePublic(s)} disabled={!s.is_owner && !isAdminUser}>
                            {s.is_public ? "Rendre Privé" : "Rendre Public"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(s.id)} disabled={!s.is_owner} className="text-red-400 focus:text-red-400">
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
