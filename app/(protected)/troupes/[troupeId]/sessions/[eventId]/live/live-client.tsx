'use client';

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { LiveScriptViewer } from "./live-script-viewer";
import { LiveNotesList } from "./live-notes-list";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSessionStatus } from "@/lib/actions/session";
import { useRouter } from "next/navigation";

interface LiveClientProps {
    sessionData: any;
    scenes: any[];
    isReadOnly?: boolean;
}

export function LiveSessionClient({ sessionData, scenes, isReadOnly }: LiveClientProps) {
    const router = useRouter();
    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);

    // Completion State
    const [isFinishing, setIsFinishing] = useState(false);
    const [showFinishDialog, setShowFinishDialog] = useState(false);
    const [finalNotes, setFinalNotes] = useState("");

    const currentScene = scenes[currentSceneIdx];

    const handleSceneChange = (dir: 'next' | 'prev') => {
        if (dir === 'next') {
            if (currentSceneIdx < scenes.length - 1) {
                setCurrentSceneIdx(c => c + 1);
            } else if (!isReadOnly) {
                // Last scene -> Open Finish Dialog
                setShowFinishDialog(true);
            }
        }
        if (dir === 'prev' && currentSceneIdx > 0) setCurrentSceneIdx(c => c - 1);
    };

    const handleFinishSession = async () => {
        setIsFinishing(true);
        try {
            // Here we could save the finalNotes to a specific field if needed, 
            // maybe append to general_notes or a new 'debrief_notes' field.
            // For now, we'll just update status.
            // Ideally we'd have a 'saveSessionDebrief' action, but let's stick to updateSessionStatus for now + maybe redirect logic.

            // NOTE: If user wants to save the final message, we need an action for it. 
            // I'll assume for now we just close the session, or maybe save it as a "Conclusion" raw note?
            // Let's just finish the session for now as requested by "Update status to processing".

            await updateSessionStatus(sessionData.id, 'processing');
            router.push(`/troupes/${sessionData.troupe_id}/sessions/${sessionData.id}`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsFinishing(false);
        }
    };

    // Find global scene index (index in the source play's script)
    const globalSceneIndex = useMemo(() => {
        if (!currentScene || !sessionData.plays) return -1;
        const play = sessionData.plays.find((p: any) => p.id === currentScene.playId);
        if (!play || !play.script_content) return -1;

        // Find index in script.scenes by matching title (safest link we have)
        return play.script_content.scenes.findIndex((s: any) => s.title === currentScene.title);
    }, [currentScene, sessionData.plays]);

    if (scenes.length === 0) return <div className="p-8 text-center text-muted-foreground">Aucune scène au programme.</div>;

    return (
        <div className="flex flex-col h-[calc(100dvh-theme(spacing.20))] pb-[4.5rem] md:pb-0 bg-background overflow-hidden relative">

            {/* A. SCENE NAVIGATION BAR */}
            <div className="h-12 md:h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2 z-20">
                {scenes.map((scene: any, idx: number) => {
                    const isActive = idx === currentSceneIdx;
                    return (
                        <button
                            key={`${scene.id}-${idx}`}
                            onClick={() => setCurrentSceneIdx(idx)}
                            className={cn(
                                "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary scale-105"
                                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            )}
                        >
                            <span className="opacity-50 mr-2">{idx + 1}.</span>
                            {scene.title}
                        </button>
                    )
                })}
            </div>

            {/* B. MAIN CONTENT */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                {/* SCRIPT (100% mobile, 75% desktop) */}
                <div className="flex-1 md:flex-[0.75] min-w-0 border-r border-border/10">
                    <LiveScriptViewer
                        sessionData={sessionData}
                        currentSceneIdx={currentSceneIdx}
                        scenes={scenes}
                        isReadOnly={isReadOnly}
                    />
                </div>

                {/* NOTES PANEL (desktop only) */}
                <div className="hidden md:flex md:flex-[0.25] min-w-0 bg-background flex-col border-l border-border/10">
                    <div className="flex items-center border-b border-border/50 bg-muted/20 px-4 h-12">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2">
                            Flux de Notes
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        {isReadOnly ? (
                            <div className="h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                Notes de direction non visibles en mode lecture seule.
                            </div>
                        ) : (
                            <LiveNotesList eventId={sessionData.id} />
                        )}
                    </div>
                </div>

            </div>

            {/* C. BOTTOM NAVIGATION CONTROLS */}
            <div className="h-14 md:h-20 shrink-0 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-between px-5 md:px-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSceneChange('prev')}
                    disabled={currentSceneIdx === 0}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full border-muted-foreground/20 hover:bg-muted"
                >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Scène</span>
                    <span className="text-lg md:text-xl font-bold font-mono">
                        {currentSceneIdx + 1}<span className="text-muted-foreground/40 text-sm">/{scenes.length}</span>
                    </span>
                </div>

                <Button
                    onClick={() => handleSceneChange('next')}
                    disabled={isReadOnly && currentSceneIdx === scenes.length - 1}
                    className={cn(
                        "rounded-full transition-all shadow-lg h-10 md:h-12",
                        currentSceneIdx === scenes.length - 1
                            ? "px-5 md:px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                            : "px-5 md:w-12 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                    )}
                >
                    {currentSceneIdx === scenes.length - 1 ? (
                        <span className="flex items-center gap-2 font-bold text-sm">Terminer <CheckCircle2 className="w-4 h-4" /></span>
                    ) : (
                        <span className="flex items-center gap-2 font-bold text-sm">
                            <span className="md:hidden">Suivant</span>
                            <ChevronRight className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </div>

            {/* FINISH DIALOG */}
            <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
                <DialogContent className="max-md:fixed max-md:bottom-[calc(env(safe-area-inset-bottom)+var(--keyboard-offset,0px))] max-md:left-0 max-md:right-0 max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-3xl max-md:rounded-b-none max-md:p-0 max-md:max-h-[85vh] overflow-hidden">
                    <div className="flex flex-col max-h-[85vh]">
                        <div className="px-6 pt-6 pb-4">
                            <DialogHeader className="text-left">
                                <DialogTitle>Fin de la Séance</DialogTitle>
                                <DialogDescription>
                                    Vous allez clôturer cette séance et passer au traitement des notes.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="px-6 pb-6 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                <Label>Message de fin (Optionnel)</Label>
                                <Textarea
                                    placeholder="Un dernier mot pour l'équipe ou une note globale..."
                                    value={finalNotes}
                                    onChange={(e) => setFinalNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+18px)] border-t border-border/40 bg-background/90 backdrop-blur-md">
                            <div className="flex flex-col gap-3">
                                <Button onClick={handleFinishSession} disabled={isFinishing} className="w-full">
                                    {isFinishing ? "Clôture..." : "Enregistrer et Clôturer"}
                                </Button>
                                <Button variant="outline" onClick={() => setShowFinishDialog(false)} className="w-full">
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
