"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { Mic, Square, Volume2, ChevronRight, ChevronLeft, Check, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { uploadLineRecording, getPlayRecordings, deleteLineRecording } from "@/lib/actions/recordings";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";

interface RecordingManagerProps {
    script: ParsedScript;
    userCharacter: string;
    playId: string;
    userId: string;
}

export function RecordingManager({ script, userCharacter, playId, userId }: RecordingManagerProps) {
    const [recordings, setRecordings] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [justFinishedRecording, setJustFinishedRecording] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { isRecording, recordingLineId, startRecording, stopRecording } = useAudioRecorder();

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

            // Refresh recordings
            const updated = await getPlayRecordings(playId);
            setRecordings(updated);
            setJustFinishedRecording(lineId);
        } catch (err: any) {
            alert(err.message || "Erreur lors de l'enregistrement.");
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isLoading || userLines.length === 0) return;

            if (e.code === "Space") {
                e.preventDefault();
                if (isRecording) {
                    handleStopRecord(activeLine.id, userCharacter);
                } else if (!currentRecording) {
                    handleStartRecord(activeLine.id);
                }
            } else if (e.code === "ArrowRight") {
                if (!isRecording && currentIndex < userLines.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setJustFinishedRecording(null);
                }
            } else if (e.code === "ArrowLeft") {
                if (!isRecording && currentIndex > 0) {
                    setCurrentIndex(prev => prev - 1);
                    setJustFinishedRecording(null);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isRecording, currentIndex, activeLine, userLines, currentRecording, isLoading]);

    const handleDelete = async (recordingId: string) => {
        if (!confirm("Supprimer cet enregistrement ?")) return;
        try {
            await deleteLineRecording(recordingId);
            setRecordings(prev => prev.filter(r => r.id !== recordingId));
            setJustFinishedRecording(null);
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
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-white/10 border-dashed">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Aucune réplique trouvée</h3>
                <p className="text-muted-foreground max-w-sm">Le personnage "{userCharacter}" n'a pas été détecté dans le texte de cette pièce.</p>
            </div>
        );
    }

    const progress = ((currentIndex + 1) / userLines.length) * 100;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Context Card */}
            <Card className="bg-card border-white/10 backdrop-blur-md rounded-3xl border overflow-hidden">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-primary">Assistant d'enregistrement</span>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tighter">
                                {userCharacter}
                            </h2>
                            <p className="text-muted-foreground font-medium mt-1">
                                Enregistrez vos répliques pour que vos partenaires puissent répéter avec votre voix.
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-4xl font-black text-foreground leading-none mb-2">
                                {currentIndex + 1} <span className="text-gray-600 text-xl font-medium">/ {userLines.length}</span>
                            </div>
                            <Progress value={progress} className="h-2 w-32 ml-auto bg-white/10" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Stage */}
            <div className="relative min-h-[400px] flex flex-col items-center justify-center py-12 px-4">
                {/* Visual Cue - Current Line */}
                <div className="w-full max-w-2xl bg-card p-12 rounded-[3rem] border border-white/10 shadow-2xl relative group">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-foreground text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg">
                        Réplique en cours
                    </div>

                    <div className="text-center space-y-8">
                        <p className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed font-serif italic">
                            "{activeLine.text}"
                        </p>

                        <div className="h-px w-24 bg-white/10 mx-auto" />

                        {/* Navigation and Actions */}
                        <div className="flex flex-col items-center gap-8">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setCurrentIndex(prev => Math.max(0, prev - 1));
                                        setJustFinishedRecording(null);
                                    }}
                                    disabled={currentIndex === 0 || isRecording}
                                    className="h-14 w-14 rounded-full border border-border hover:bg-white/10 text-muted-foreground disabled:opacity-20"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </Button>

                                <div className="relative">
                                    {!isRecording && !currentRecording && (
                                        <Button
                                            onClick={() => handleStartRecord(activeLine.id)}
                                            className="h-24 w-24 rounded-full bg-primary hover:bg-primary/90 text-foreground shadow-2xl shadow-primary/40 transform transition-all active:scale-90 hover:scale-105"
                                        >
                                            <Mic className="w-10 h-10" />
                                        </Button>
                                    )}

                                    {isRecording && (
                                        <Button
                                            onClick={() => handleStopRecord(activeLine.id, userCharacter)}
                                            variant="destructive"
                                            className="h-24 w-24 rounded-full bg-red-500 hover:bg-red-600 animate-pulse text-foreground shadow-2xl shadow-red-500/40 transform transition-all active:scale-90"
                                        >
                                            <Square className="w-10 h-10" />
                                        </Button>
                                    )}

                                    {currentRecording && !isRecording && (
                                        <div className="flex items-center gap-4">
                                            <Button
                                                onClick={() => playRecording(currentRecording.audio_url)}
                                                className="h-24 w-24 rounded-full bg-emerald-500 hover:bg-emerald-600 text-foreground shadow-2xl shadow-emerald-500/40 transform transition-all active:scale-90 hover:scale-105"
                                            >
                                                <Volume2 className="w-10 h-10" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(currentRecording.id)}
                                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setCurrentIndex(prev => Math.min(userLines.length - 1, prev + 1));
                                        setJustFinishedRecording(null);
                                    }}
                                    disabled={currentIndex === userLines.length - 1 || isRecording}
                                    className="h-14 w-14 rounded-full border border-border hover:bg-white/10 text-muted-foreground disabled:opacity-20 transition-all"
                                >
                                    {justFinishedRecording ? (
                                        <Check className="w-8 h-8 text-emerald-400" />
                                    ) : (
                                        <ChevronRight className="w-8 h-8" />
                                    )}
                                </Button>
                            </div>

                            {justFinishedRecording && (
                                <p className="text-emerald-400 text-xs font-black uppercase tracking-widest animate-in fade-in duration-500">
                                    Enregistré ! Prochaine réplique →
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Keyboard hints */}
                <div className="mt-8 flex gap-6 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                    <span>ESPACE : Enregistrer / Stop</span>
                    <span>← / → : Navigation</span>
                </div>
            </div>
        </div>
    );
}
