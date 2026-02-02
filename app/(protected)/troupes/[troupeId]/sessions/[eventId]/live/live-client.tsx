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
            } else {
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
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-background overflow-hidden relative">

            {/* A. SCENE NAVIGATION BAR */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2 z-20">
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

            {/* B. SPLIT VIEW MAIN CONTENT */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                {/* LEFT: SCRIPT (75%) */}
                <div className="flex-1 md:flex-[0.75] min-w-0 border-r border-border/10 bg-black/20">
                    <LiveScriptViewer
                        sessionData={sessionData}
                        currentSceneIdx={currentSceneIdx}
                        scenes={scenes}
                        isReadOnly={isReadOnly}
                    />
                </div>

                {/* RIGHT: ACTORS/NOTES (25%) */}
                <div className="flex-1 md:flex-[0.25] min-w-0 bg-background flex flex-col border-l border-border/10">

                    {/* Header */}
                    <div className="flex items-center border-b border-border/50 bg-muted/20 px-4 h-12">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2">
                            Flux de Notes
                        </span>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        <LiveNotesList eventId={sessionData.id} />
                    </div>
                </div>

            </div>

            {/* C. BOTTOM NAVIGATION CONTROLS */}
            <div className="h-20 shrink-0 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-6 pb-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSceneChange('prev')}
                    disabled={currentSceneIdx === 0}
                    className="h-12 w-12 rounded-full border-muted-foreground/20 hover:bg-muted"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Scène</span>
                    <span className="text-xl font-bold font-mono">
                        {currentSceneIdx + 1}<span className="text-muted-foreground/40 text-sm">/{scenes.length}</span>
                    </span>
                </div>

                <Button
                    size={currentSceneIdx === scenes.length - 1 ? "lg" : "icon"}
                    onClick={() => handleSceneChange('next')}
                    className={cn(
                        "rounded-full transition-all shadow-lg",
                        currentSceneIdx === scenes.length - 1
                            ? "h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                            : "h-12 w-12 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                    )}
                >
                    {currentSceneIdx === scenes.length - 1 ? (
                        <span className="flex items-center gap-2 font-bold">Terminer <CheckCircle2 className="w-4 h-4" /></span>
                    ) : (
                        <ChevronRight className="w-6 h-6" />
                    )}
                </Button>
            </div>

            {/* FINISH DIALOG */}
            <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fin de la Séance</DialogTitle>
                        <DialogDescription>
                            Vous allez clôturer cette séance et passer au traitement des notes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Message de fin (Optionnel)</Label>
                            <Textarea
                                placeholder="Un dernier mot pour l'équipe ou une note globale..."
                                value={finalNotes}
                                onChange={(e) => setFinalNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFinishDialog(false)}>Annuler</Button>
                        <Button onClick={handleFinishSession} disabled={isFinishing}>
                            {isFinishing ? "Clôture..." : "Enregistrer et Clôturer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
