import React, { useEffect, useState } from "react";
import { Sparkles, Play, Loader2, CheckCircle2, User, Mic } from "lucide-react";
import { synthesizeGoogleTTSPreview } from "@/app/actions/google-tts";
import { GOOGLE_VOICES } from "@/lib/data/google-voices";
import { ParsedScript } from "@/lib/types";

export interface VoiceAssignment {
    characterName: string;
    voiceId: string;
    justification: string;
}

export interface WizardStepCastingProps {
    characters: string[];
    assignments: VoiceAssignment[] | null;
    setAssignments: React.Dispatch<React.SetStateAction<VoiceAssignment[] | null>>;
    script: ParsedScript | null;
}

function buildLocalFallbackAssignments(characters: string[]): VoiceAssignment[] {
    if (!characters || characters.length === 0) return [];
    return characters.map((characterName, index) => {
        const voice = GOOGLE_VOICES[index % GOOGLE_VOICES.length];
        return {
            characterName,
            voiceId: voice?.id || "fr-FR-Chirp3-HD-Aoede",
            justification: "Fallback local rapide (sans IA).",
        };
    });
}

export function WizardStepCasting({ characters, assignments, setAssignments, script }: WizardStepCastingProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

    useEffect(() => {
        if (!assignments && characters.length > 0) {
            let isMounted = true;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);
            queueMicrotask(() => {
                if (isMounted) {
                    setError(null);
                    setIsLoading(true);
                }
            });
            console.log("WizardStepCasting: Starting auto-matching for", characters);

            const scriptContextLines = script?.lines ? script.lines.slice(0, 400).map(l => ({
                character: l.character,
                text: (l.text || "").slice(0, 220),
                type: l.type
            })) : null;

            fetch('/api/casting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characters, scriptContextLines }),
                signal: controller.signal,
            })
                .then(async (res) => {
                    const payload = await res.json();
                    if (!res.ok) {
                        const message = typeof payload?.error === "string"
                            ? payload.error
                            : "Erreur lors du casting automatique.";
                        throw new Error(message);
                    }
                    return payload;
                })
                .then((res) => {
                    console.log("WizardStepCasting: API response received:", res);
                    if (isMounted) {
                        if (Array.isArray(res)) {
                            setAssignments(res);
                        } else {
                            setError("Le service de casting a répondu de façon inattendue. Fallback local appliqué.");
                            setAssignments(buildLocalFallbackAssignments(characters));
                        }
                    }
                })
                .catch((err) => {
                    const isAbortError = err?.name === "AbortError";
                    if (!isAbortError) {
                        console.error("Erreur casting (fetch):", err);
                    }
                    if (isMounted) {
                        setError(isAbortError ? "Le casting vocal a dépassé le délai. Fallback local appliqué." : "Erreur réseau lors du casting vocal. Fallback local appliqué.");
                        setAssignments(buildLocalFallbackAssignments(characters));
                    }
                })
                .finally(() => {
                    clearTimeout(timeoutId);
                    if (isMounted) setIsLoading(false);
                });

            return () => {
                isMounted = false;
                clearTimeout(timeoutId);
                controller.abort();
                };
        }
    }, [characters, assignments, setAssignments, script]);

    const playPreview = async (voiceId: string, characterName: string) => {
        if (playingVoiceId) return; // Prevent multiple clicks
        const vConfig = GOOGLE_VOICES.find(v => v.id === voiceId);
        if (!vConfig) return;

        setPlayingVoiceId(voiceId);
        try {
            const previewText = `Bonjour, je suis la voix de ${characterName}.`;
            // Call the server action directly
            const audioSrc = await synthesizeGoogleTTSPreview(voiceId, previewText);

            if (!audioSrc) {
                console.error("Preview failed or empty response.");
                setPlayingVoiceId(null);
                return;
            }

            const audio = new Audio(audioSrc);
            audio.onended = () => setPlayingVoiceId(null);
            audio.onerror = () => setPlayingVoiceId(null);
            await audio.play();
        } catch (e) {
            console.error("Audio playback error:", e);
            setPlayingVoiceId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 min-h-[400px] space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                    <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-foreground">Le Directeur de Casting IA travaille...</h3>
                    <p className="text-sm text-cyan-200/60 max-w-sm mx-auto">
                        Analyse du caractère et de l'âge probable de vos {characters.length} personnages pour leur attribuer la voix parfaite par synthèse vocale HD.
                    </p>
                </div>
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mt-4" />
            </div>
        );
    }

    if (error && (!assignments || assignments.length === 0)) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3">
                <p className="text-sm text-red-400 font-medium">{error}</p>
                <p className="text-xs text-muted-foreground">L'import sera terminé sans pré-assignation vocale. Vous pourrez vérifier les répliques néanmoins.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-lg shadow-emerald-500/5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-400">Distribution Vocale Terminée</h3>
                    <p className="text-sm text-emerald-100/70 mt-1 max-w-2xl leading-relaxed">
                        L'intelligence artificielle a analysé le nom et le contexte implicite de vos personnages pour leur attribuer les meilleures voix intelligentes Google.
                        Cliquez sur "Play" pour vérifier un extrait de l'interprétation.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(assignments || []).map((assign, idx) => {
                    const voiceConfig = GOOGLE_VOICES.find(v => v.id === assign.voiceId);
                    const isPlaying = playingVoiceId === assign.voiceId;

                    return (
                        <div key={idx} className="bg-card border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-sm hover:border-cyan-500/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-foreground line-clamp-1" title={assign.characterName}>
                                            {assign.characterName}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                            <Mic className="w-3 h-3" />
                                            {voiceConfig ? voiceConfig.name : "Voix Inconnue"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isPlaying ? "bg-amber-500 text-black animate-pulse" : "bg-white/10 hover:bg-white/20 text-foreground"}`}
                                    onClick={() => playPreview(assign.voiceId, assign.characterName)}
                                    disabled={playingVoiceId !== null}
                                >
                                    {isPlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 ml-0.5" />}
                                </button>
                            </div>

                            <div className="bg-black/20 rounded-lg p-3 relative mt-auto border border-white/5">
                                <div className="absolute top-0 left-4 -mt-1.5 w-3 h-3 bg-black/20 border-t border-l border-white/5 transform rotate-45" />
                                <p className="text-xs text-cyan-100/80 italic leading-relaxed">
                                    "{assign.justification}"
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {(assignments?.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-10">Aucun personnage n'a reçu de voix (script vide ?).</p>
            )}
        </div>
    );
}
