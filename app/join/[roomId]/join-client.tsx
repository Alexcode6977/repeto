"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, VideoTrack, useRemoteParticipants, useTracks, RoomAudioRenderer, useDataChannel } from "@livekit/components-react";
import "@livekit/components-styles";
import { Video, Loader2, User, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Track } from "livekit-client";
import { cn } from "@/lib/utils";

interface JoinClientProps {
    roomId: string;
    playId?: string;
    initialName?: string;
}

// Video overlay for partner view
function PartnerVideoOverlay({ isMinimized, onToggleSize }: { isMinimized: boolean; onToggleSize: () => void }) {
    const tracks = useTracks([Track.Source.Camera]);
    const remoteParticipants = useRemoteParticipants();

    const remoteTrack = tracks.find(t => !t.participant.isLocal);
    const localTrack = tracks.find(t => t.participant.isLocal);
    const displayTrack = remoteTrack || localTrack;

    if (!displayTrack) {
        return (
            <div className={cn(
                "bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700 flex items-center justify-center",
                isMinimized ? "w-20 h-20" : "w-64 h-48"
            )}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className={cn(
            "relative bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700 overflow-hidden shadow-2xl transition-all duration-300",
            isMinimized ? "w-20 h-20" : "w-64 h-48"
        )}>
            <VideoTrack trackRef={displayTrack} className="w-full h-full object-cover" />

            {remoteParticipants.length > 0 && (
                <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {remoteParticipants.length + 1} en ligne
                </div>
            )}

            <button
                onClick={onToggleSize}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            >
                {isMinimized ? <Maximize2 className="w-3 h-3 text-white" /> : <Minimize2 className="w-3 h-3 text-white" />}
            </button>

            {remoteTrack && localTrack && !isMinimized && (
                <div className="absolute bottom-2 right-2 w-16 h-12 rounded-lg overflow-hidden border border-gray-600">
                    <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
                </div>
            )}
        </div>
    );
}

// Synced Script View - receives line updates via DataChannel
function SyncedScriptView() {
    const [currentLine, setCurrentLine] = useState<{ character: string; text: string; index: number } | null>(null);
    const [scriptLines, setScriptLines] = useState<Array<{ character: string; text: string }>>([]);

    // Listen for data messages from host
    const { message } = useDataChannel("script-sync", (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === "line-update") {
                setCurrentLine({
                    character: data.character,
                    text: data.text,
                    index: data.index
                });
            }
            if (data.type === "script-init") {
                setScriptLines(data.lines);
            }
        } catch (e) {
            console.error("Failed to parse data message", e);
        }
    });

    if (!currentLine) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">En attente du démarrage...</h2>
                        <p className="text-muted-foreground mt-2">L'hôte va bientôt lancer la répétition</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-8 shadow-2xl">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                    {currentLine.character}
                </p>
                <p className="text-2xl md:text-4xl leading-relaxed font-serif text-foreground">
                    {currentLine.text}
                </p>
                <div className="mt-6 text-sm text-muted-foreground">
                    Ligne {currentLine.index + 1}
                </div>
            </div>
        </div>
    );
}

export function JoinClient({ roomId, playId, initialName }: JoinClientProps) {
    const [step, setStep] = useState<"name" | "joined">("name");
    const [name, setName] = useState(initialName || "");
    const [token, setToken] = useState("");
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleJoin = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const resp = await fetch(
                `/api/livekit/token?room=${roomId}&username=${encodeURIComponent(name)}`
            );
            const data = await resp.json();

            if (data.token) {
                setToken(data.token);
                setStep("joined");
            } else {
                alert("Erreur de connexion");
            }
        } catch (e) {
            console.error("Join error", e);
            alert("Erreur de connexion");
        } finally {
            setIsLoading(false);
        }
    };

    // Name entry screen
    if (step === "name") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-sm w-full space-y-8 text-center">
                    <div>
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/10 text-violet-500 mb-4">
                            <Video className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-foreground">Rejoindre la répétition</h1>
                        <p className="text-muted-foreground mt-2">Entrez votre prénom pour rejoindre</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Votre prénom"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-violet-500/50 text-lg font-bold"
                                autoFocus
                            />
                        </div>

                        <Button
                            onClick={handleJoin}
                            disabled={!name.trim() || isLoading}
                            className="w-full h-14 text-lg font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Video className="w-5 h-5 mr-2" />
                                    Rejoindre
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Votre caméra et micro seront activés
                    </p>
                </div>
            </div>
        );
    }

    // Joined - show synced view
    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-14 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-center px-4 shrink-0">
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold">Répétition en direct</span>
                </div>
            </div>

            {/* Main Content */}
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                className="flex-1 relative"
            >
                <SyncedScriptView />

                {/* Video Overlay */}
                <div className="fixed bottom-6 right-6 z-50">
                    <PartnerVideoOverlay
                        isMinimized={isVideoMinimized}
                        onToggleSize={() => setIsVideoMinimized(!isVideoMinimized)}
                    />
                </div>

                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}
