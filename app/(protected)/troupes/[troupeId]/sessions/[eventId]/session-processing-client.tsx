'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { updateSessionStatus, deleteRawNote, submitSessionFeedback, publishSessionFeedbacks } from "@/lib/actions/session";
import { useRouter } from "next/navigation";
import { SessionPlanStructure } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NoteProcessingCard } from "./components/note-processing-card";
import { LiveScriptViewer } from "./live/live-script-viewer"; // Import generic viewer
import Link from "next/link";

interface SessionProcessingClientProps {
    sessionData: any;
    troupeId: string;
    rawNotes: any[];
}

export function SessionProcessingClient({ sessionData, troupeId, rawNotes }: SessionProcessingClientProps) {
    const router = useRouter();
    const [notes, setNotes] = useState(rawNotes);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);

    // Extract scenes from new structure or legacy flat list
    const plan = sessionData.session_plans?.[0] || sessionData.session_plans;
    const structure = plan?.plan_structure as SessionPlanStructure | undefined;

    // Flatten segments into a linear list of scenes for the sidebar (matching the "Live" linear flow)
    const flatScenes = structure
        ? structure.segments.flatMap(seg => seg.scenes.map(s => ({ ...s, playId: seg.playId, playTitle: seg.playTitle })))
        : (plan?.selected_scenes || []);

    const handleValidateSession = async () => {
        setIsSubmitting(true);
        try {
            await publishSessionFeedbacks(sessionData.id);
            await updateSessionStatus(sessionData.id, 'validated');
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter notes for the selected scene
    const filteredNotes = notes.filter(n => n.scene_index === selectedSceneIdx);

    // Find characters for the current scene
    const getSceneCharacters = (sceneId: string) => {
        if (!sceneId) return [];
        for (const play of sessionData.plays || []) {
            const scene = play.play_scenes?.find((s: any) => s.id === sceneId);
            if (scene) {
                return scene.scene_characters?.map((sc: any) => {
                    const char = play.play_characters.find((c: any) => c.id === sc.character_id);
                    return char;
                }).filter(Boolean) || [];
            }
        }
        return [];
    };

    const currentScene = flatScenes[selectedSceneIdx];
    const currentSceneCharacters = currentScene ? getSceneCharacters(currentScene.id) : [];

    // Handlers
    const handleDeleteNote = (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const handleUpdateNote = (id: string, text: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    };

    const handleProcessNote = async (id: string, type: 'feedback' | 'indication', targets: string[]) => {
        try {
            // 1. Create feedbacks for each target
            const note = notes.find(n => n.id === id);
            if (!note) return;

            await Promise.all(targets.map(charId =>
                submitSessionFeedback(sessionData.id, charId, `${type === 'indication' ? '[INDICATION] ' : ''}${note.text}`, undefined, undefined, 'pending')
            ));

            // 2. Delete the raw note (it's processed)
            await deleteRawNote(id);
            // Don't remove from UI, mark as processed
            setNotes(prev => prev.map(n =>
                n.id === id
                    ? { ...n, processed: true, processedType: type, processedTargets: targets }
                    : n
            ));
        } catch (e) {
            console.error("Error processing note:", e);
            alert("Erreur lors du traitement de la note");
        }
    };

    if (flatScenes.length === 0) return <div className="p-8 text-center text-muted-foreground">Aucune scène à traiter.</div>;


    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-background overflow-hidden relative">

            {/* Header / Nav */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/troupes/${troupeId}/sessions`}
                        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux séances
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={handleValidateSession}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 text-xs"
                    >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Valider la Séance
                    </Button>
                </div>
            </div>

            {/* Scene Navigation Bar (Horizontal) */}
            <div className="h-12 shrink-0 border-b border-border/50 bg-muted/10 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2">
                {flatScenes.map((scene: any, idx: number) => {
                    const isActive = idx === selectedSceneIdx;
                    return (
                        <button
                            key={`${scene.id}-${idx}`}
                            onClick={() => setSelectedSceneIdx(idx)}
                            className={cn(
                                "shrink-0 px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap border flex flex-col items-start gap-0.5 min-w-[120px]",
                                isActive
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                            )}
                        >
                            <span className="text-[10px] uppercase opacity-70">Scène {idx + 1}</span>
                            <span className="truncate max-w-[150px]">{scene.title}</span>
                        </button>
                    )
                })}
            </div>

            {/* Split View Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
                {/* LEFT: SCRIPT (50%) */}
                <div className="flex-1 md:flex-1 min-w-0 border-r border-border/10 bg-black/20 relative">
                    <LiveScriptViewer
                        sessionData={sessionData}
                        currentSceneIdx={selectedSceneIdx}
                        scenes={flatScenes}
                        isReadOnly={true}
                    />
                </div>

                {/* RIGHT: NOTES (50%) */}
                <div className="flex-1 md:flex-1 min-w-0 bg-background flex flex-col border-l border-border/10">
                    <div className="flex items-center border-b border-border/50 bg-muted/20 px-4 h-12 justify-between">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-2">
                            Notes pour : Scène {selectedSceneIdx + 1}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {filteredNotes.length} Notes
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
                                <p className="text-sm italic">Aucune note pour cette scène.</p>
                            </div>
                        ) : (
                            filteredNotes.map((note) => (
                                <NoteProcessingCard
                                    key={note.id}
                                    note={note}
                                    sceneCharacters={currentSceneCharacters}
                                    onDelete={handleDeleteNote}
                                    onUpdate={handleUpdateNote}
                                    onProcess={handleProcessNote}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
