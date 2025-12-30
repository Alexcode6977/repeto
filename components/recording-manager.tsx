"use client";

import { useState, useMemo, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { Mic, Square, Volume2, Trash2, AlertCircle, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { uploadLineRecording, getPlayRecordings, deleteLineRecording } from "@/lib/actions/recordings";
import { Badge } from "./ui/badge";

interface RecordingManagerProps {
    script: ParsedScript;
    userCharacter: string;
    playId: string;
    userId: string;
}

export function RecordingManager({ script, userCharacter, playId, userId }: RecordingManagerProps) {
    const [recordings, setRecordings] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const { isRecording, startRecording, stopRecording } = useAudioRecorder();

    // Fetch existing recordings
    useEffect(() => {
        const fetchRecordings = async () => {
            const data = await getPlayRecordings(playId);
            setRecordings(data);
            setIsLoading(false);
        };
        fetchRecordings();
    }, [playId]);

    // Filter lines for our character
    const userLines = useMemo(() => {
        return script.lines.filter(line => {
            const normalizedLineChar = line.character?.toLowerCase().trim();
            const normalizedUserChar = userCharacter.toLowerCase().trim();

            if (!line.text) return false;

            return normalizedLineChar === normalizedUserChar ||
                normalizedLineChar?.split(/[\s,]+/).includes(normalizedUserChar);
        });
    }, [script.lines, userCharacter]);

    const activeLine = userLines[currentIndex];
    const currentRecording = recordings.find(r => r.line_id === activeLine?.id && r.user_id === userId);

    const handleStartRecord = async (lineId: string) => {
        try {
            await startRecording(lineId);
        } catch (err) {
            alert("Impossible d'accéder au micro.");
        }
    };

    const handleStopRecord = async (lineId: string, characterName: string) => {
        try {
            const blob = await stopRecording();
            await uploadLineRecording(playId, characterName, lineId, blob);

            // Optimistic update or refetch
            const updated = await getPlayRecordings(playId);
            setRecordings(updated);

            // Auto-advance logic could go here if desired, but user didn't ask for it
        } catch (err: any) {
            alert(err.message || "Erreur lors de l'enregistrement.");
        }
    };

    const handleDelete = async (recordingId: string) => {
        if (!confirm("Supprimer cet enregistrement ?")) return;
        try {
            await deleteLineRecording(recordingId);
            setRecordings(prev => prev.filter(r => r.id !== recordingId));
        } catch (err: any) {
            alert(err.message || "Erreur lors de la suppression.");
        }
    };

    const playRecording = (url: string) => {
        const audio = new Audio(url);
        audio.play();
    };

    if (userLines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-white/10 border-dashed min-h-[400px]">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Aucune réplique trouvée</h3>
                <p className="text-muted-foreground max-w-sm">Le personnage "{userCharacter}" n'a pas été détecté dans le texte de cette pièce.</p>
            </div>
        );
    }

    // Helper to check status
    const isLineRecorded = (lineId: string) => {
        return recordings.some(r => r.line_id === lineId && r.user_id === userId);
    };

    // Calculate progress
    const recordedCount = userLines.filter(l => isLineRecorded(l.id)).length;
    const progressPercent = Math.round((recordedCount / userLines.length) * 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[480px] animate-in fade-in duration-500">
            {/* Left Column: Line List */}
            <div className="md:col-span-4 flex flex-col gap-4 h-full min-h-0">
                <div className="bg-card border border-border rounded-3xl p-6 h-full flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <h3 className="font-bold text-lg">Vos Répliques</h3>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {progressPercent}% Fait
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-visible">
                        <div className="space-y-2 pb-4">
                            {userLines.map((line, idx) => {
                                const isRecorded = isLineRecorded(line.id);
                                const isSelected = idx === currentIndex;

                                return (
                                    <div
                                        key={line.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "p-4 rounded-xl cursor-pointer transition-all border border-transparent text-sm group relative",
                                            isSelected
                                                ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                                : isRecorded
                                                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-100 border-green-500/20"
                                                    : "bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className={cn(
                                                "mt-0.5 text-[10px] uppercase font-black tracking-wider shrink-0 w-8",
                                                isSelected ? "text-primary-foreground/70" : "text-muted-foreground/50"
                                            )}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>

                                            <p className="line-clamp-2 font-medium flex-1">
                                                {line.text}
                                            </p>

                                            {isRecorded && (
                                                <CheckCircle2 className={cn(
                                                    "w-4 h-4 shrink-0 mt-0.5",
                                                    isSelected ? "text-white" : "text-green-500"
                                                )} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Active Line Detail */}
            <div className="md:col-span-8 h-full">
                <div className="bg-card border border-border rounded-3xl p-8 md:p-12 h-full flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">

                    {/* Background Ambience */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

                    {/* Content */}
                    <div className="relative z-10 w-full max-w-2xl text-center space-y-12">

                        {/* Line Display */}
                        <div className="space-y-6">
                            <Badge variant="outline" className="text-xs uppercase tracking-widest opacity-50">
                                Réplique {currentIndex + 1} / {userLines.length}
                            </Badge>

                            <p className="text-2xl md:text-4xl font-black leading-tight text-foreground transition-all duration-300">
                                "{activeLine.text}"
                            </p>

                            {/* Previous Context (Optional enhancement - maybe too cluttered) */}
                            {/* <p className="text-sm text-muted-foreground italic">
                                Scène {activeLine.scene_number}
                            </p> */}
                        </div>

                        {/* Controls Container */}
                        <div className="flex items-center justify-center gap-8 pt-8 border-t border-white/5 mx-12">

                            {/* CASE 1: Recording exists -> Play / Delete */}
                            {currentRecording && (
                                <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-300">
                                    <div className="flex items-center gap-6">
                                        <Button
                                            onClick={() => playRecording(currentRecording.audio_url)}
                                            className="h-24 w-24 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                                        >
                                            <Play className="w-10 h-10 ml-1 fill-current" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm">
                                            Enregistré
                                        </p>
                                        <div className="h-4 w-px bg-white/10" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(currentRecording.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Recommencer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* CASE 2: No Recording -> Record Button */}
                            {!currentRecording && (
                                <div className="flex flex-col items-center gap-6">
                                    {!isRecording ? (
                                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-50 duration-300">
                                            <Button
                                                onClick={() => handleStartRecord(activeLine.id)}
                                                className="h-28 w-28 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                                            >
                                                <Mic className="w-12 h-12" />
                                            </Button>
                                            <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
                                                Appuyer pour enregistrer
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-50 duration-300">
                                            <div className="relative">
                                                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
                                                <Button
                                                    onClick={() => handleStopRecord(activeLine.id, userCharacter)}
                                                    className="relative h-28 w-28 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] transition-all active:scale-95 flex items-center justify-center"
                                                >
                                                    <Square className="w-10 h-10 fill-current" />
                                                </Button>
                                            </div>
                                            <p className="text-red-500 text-xs uppercase tracking-widest font-bold animate-pulse">
                                                Enregistrement en cours...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
