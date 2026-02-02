'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { updateSessionStatus, deleteRawNote, submitSessionFeedback, publishSessionFeedbacks } from "@/lib/actions/session"; // Added helpers
import { useRouter } from "next/navigation";
import { SessionPlanStructure } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NoteProcessingCard } from "./components/note-processing-card";

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
        ? structure.segments.flatMap(seg => seg.scenes.map(s => ({ ...s, playTitle: seg.playTitle })))
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
            {/* Left: Planning/Context (Selectable) */}
            <div className="lg:col-span-4 bg-muted/10 rounded-3xl p-6 border border-border h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Déroulé de la séance</h2>
                <div className="space-y-4">
                    {flatScenes.map((scene: any, idx: number) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedSceneIdx(idx)}
                            className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all",
                                selectedSceneIdx === idx
                                    ? "bg-primary/10 border-primary shadow-md"
                                    : "bg-card border-border hover:border-primary/50"
                            )}
                        >
                            <div className="flex flex-col gap-1 mb-1">
                                <div className="flex justify-between items-center">
                                    <span className={cn(
                                        "text-xs font-black uppercase",
                                        selectedSceneIdx === idx ? "text-primary" : "text-muted-foreground"
                                    )}>Scène {idx + 1}</span>
                                </div>
                                {scene.playTitle && (
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                        {scene.playTitle}
                                    </div>
                                )}
                            </div>
                            <div className="font-bold text-lg leading-tight">{scene.title}</div>
                        </div>
                    ))}
                    {flatScenes.length === 0 && (
                        <div className="text-muted-foreground text-sm italic">Aucune scène planifiée.</div>
                    )}
                </div>
            </div>

            {/* Right: Notes Processing */}
            <div className="lg:col-span-8 flex flex-col h-full space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black">Traitement des notes</h1>
                        <p className="text-sm text-muted-foreground">Triez, qualifiez ou supprimez vos notes prises en live.</p>
                    </div>
                    <Button onClick={handleValidateSession} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Valider la Séance
                    </Button>
                </div>

                <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            Notes pour : {flatScenes[selectedSceneIdx]?.title || "Sélection inconnue"}
                        </h3>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {filteredNotes.length} note{filteredNotes.length > 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                                <CheckCircle className="w-12 h-12 opacity-20" />
                                <p>Aucune note pour cette scène.</p>
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
