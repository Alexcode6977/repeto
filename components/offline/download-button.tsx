"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check, RefreshCw, WifiOff } from "lucide-react";
import { offlineManager } from "@/lib/offline/offline-manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface DownloadButtonProps {
    scriptId: string;
    troupeId?: string;
    className?: string;
    showLabel?: boolean;
}

type DownloadStatus = "idle" | "downloading" | "done" | "error";

export function DownloadButton({ scriptId, troupeId, className, showLabel }: DownloadButtonProps) {
    const [status, setStatus] = useState<DownloadStatus>("idle");
    const [progress, setProgress] = useState(0);

    // Initial check (simple for now)
    // In a real app we'd check DB if script exists
    // For now we default to idle/downloadable

    const handleDownload = async () => {
        try {
            setStatus("downloading");
            setProgress(0);

            await offlineManager.downloadScript(scriptId, troupeId, (current, total) => {
                const percent = Math.round((current / total) * 100);
                setProgress(percent);
            });

            setStatus("done");
            toast.success("Script téléchargé pour le mode hors-ligne !");
        } catch (error) {
            console.error("Download failed:", error);
            setStatus("error");
            toast.error("Échec du téléchargement.");
        }
    };

    if (status === "done") {
        return (
            <Button
                variant="outline"
                size={showLabel ? "default" : "icon"}
                className={cn("h-10 rounded-full bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30", showLabel ? "w-auto px-3" : "w-10", className)}
                onClick={() => handleDownload()} // Allow re-sync
                title="Téléchargé (Cliquer pour mettre à jour)"
            >
                <Check className="w-5 h-5" />
                {showLabel && <span className="ml-2">Téléchargé</span>}
            </Button>
        );
    }

    if (status === "downloading") {
        return (
            <div className={cn("relative h-10 w-10 flex items-center justify-center", className)}>
                <Download className="w-5 h-5 text-muted-foreground animate-pulse absolute" />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="text-muted/20"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="text-primary transition-all duration-300 ease-out"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray={`${progress}, 100`}
                    />
                </svg>
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            size={showLabel ? "default" : "icon"}
            className={cn("h-10 rounded-full bg-secondary/20 border-0 hover:bg-secondary/40", showLabel ? "w-auto px-3" : "w-10", className)}
            onClick={handleDownload}
            title="Télécharger hors-ligne"
        >
            <Download className="w-5 h-5 text-muted-foreground" />
            {showLabel && <span className="ml-2">Télécharger</span>}
        </Button>
    );
}
