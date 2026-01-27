"use client";

import { useState, useEffect, useRef } from "react";
import { ParsedScript } from "@/lib/types";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveKitRoom, VideoTrack, useLocalParticipant, useRemoteParticipants, useTracks, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { ArrowLeft, Video, Copy, Loader2, User, Users, Eye, Lightbulb, EyeOff, Check, Link2, X, Maximize2, Minimize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Track } from "livekit-client";
import { cn } from "@/lib/utils";

interface VisioRehearsalClientProps {
    troupeId: string;
    play: any;
    userId: string;
    members: any[];
}

// Video Overlay Component - Shows inside LiveKitRoom context
function VideoOverlay({ isMinimized, onToggleSize }: { isMinimized: boolean; onToggleSize: () => void }) {
    const tracks = useTracks([Track.Source.Camera]);
    const remoteParticipants = useRemoteParticipants();

    // Prioritize remote video (partner), fallback to local
    const remoteTrack = tracks.find(t => t.participant.isLocal === false);
    const localTrack = tracks.find(t => t.participant.isLocal === true);
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
            <VideoTrack
                trackRef={displayTrack}
                className="w-full h-full object-cover"
            />

            {/* Participant count badge */}
            {remoteParticipants.length > 0 && (
                <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {remoteParticipants.length + 1} en ligne
                </div>
            )}

            {/* Minimize/Maximize button */}
            <button
                onClick={onToggleSize}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
            >
                {isMinimized ? <Maximize2 className="w-3 h-3 text-white" /> : <Minimize2 className="w-3 h-3 text-white" />}
            </button>

            {/* Local video pip when showing remote */}
            {remoteTrack && localTrack && !isMinimized && (
                <div className="absolute bottom-2 right-2 w-16 h-12 rounded-lg overflow-hidden border border-gray-600">
                    <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
                </div>
            )}
        </div>
    );
}

export function VisioRehearsalClient({ troupeId, play, userId, members }: VisioRehearsalClientProps) {
    const router = useRouter();

    // -- State: Setup vs Rehearsal --
    const [step, setStep] = useState<"setup" | "rehearsal">("setup");

    // -- Script: use pre-parsed script_content (same as play-dashboard-client) --
    const script: ParsedScript = play.script_content as ParsedScript;

    // -- Setup State --
    const [myCharacter, setMyCharacter] = useState<string>("");
    const [partnerCharacter, setPartnerCharacter] = useState<string>("");
    const [textVisibility, setTextVisibility] = useState<"visible" | "hint" | "hidden">("visible");

    // -- Video State --
    const [token, setToken] = useState("");
    const [roomName] = useState(`visio_${troupeId}_${play.id}_${Date.now().toString().slice(-6)}`);
    const [inviteLink, setInviteLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);

    // Generate invite link on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            setInviteLink(`${window.location.origin}/join/${roomName}?play=${play.id}`);
        }
    }, [roomName, play.id]);

    // Detect if valid selection
    const canLaunch = myCharacter && partnerCharacter && myCharacter !== partnerCharacter;

    // Copy invite link
    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // -- Handlers --
    const handleLaunch = async () => {
        if (!canLaunch) return;

        try {
            const member = members.find(m => m.user_id === userId);
            const name = member?.profiles?.first_name || "Hôte";

            const resp = await fetch(
                `/api/livekit/token?room=${roomName}&username=${encodeURIComponent(name)}`
            );
            const data = await resp.json();

            if (data.token) {
                setToken(data.token);
                setStep("rehearsal");
            }
        } catch (e) {
            console.error("Token error", e);
            alert("Erreur de connexion vidéo");
        }
    };

    // ========== SETUP SCREEN ==========
    if (step === "setup") {
        return (
            <div className="min-h-screen bg-background flex">
                {/* Left Panel - Configuration */}
                <div className="flex-1 flex flex-col justify-center p-8 lg:p-12">
                    {/* Back Button */}
                    <div className="absolute top-6 left-6">
                        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Retour
                        </Button>
                    </div>

                    <div className="max-w-md mx-auto w-full space-y-8">
                        {/* Header */}
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 text-violet-500 mb-4">
                                <Video className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-black text-foreground tracking-tight">Répétition Visio</h1>
                            <p className="text-muted-foreground">Configurez votre séance avec votre partenaire.</p>
                        </div>

                        <Card className="border-2 border-border/50 shadow-2xl bg-card/80">
                            <CardContent className="p-6 space-y-6">
                                {/* MY CHARACTER */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="w-4 h-4" /> Je joue...
                                    </Label>
                                    <select
                                        className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-bold"
                                        value={myCharacter}
                                        onChange={(e) => setMyCharacter(e.target.value)}
                                    >
                                        <option value="">Sélectionner un rôle</option>
                                        {(play.play_characters || []).map((c: any) => (
                                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* PARTNER CHARACTER */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Mon partenaire joue...
                                    </Label>
                                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs">
                                        ⚠️ Ce personnage sera joué par votre partenaire, pas par le Souffleur.
                                    </div>
                                    <select
                                        className="w-full p-3 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold"
                                        value={partnerCharacter}
                                        onChange={(e) => setPartnerCharacter(e.target.value)}
                                    >
                                        <option value="">Sélectionner le rôle du partenaire</option>
                                        {(play.play_characters || [])
                                            .filter((c: any) => c.name !== myCharacter)
                                            .map((c: any) => (
                                                <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* TEXT VISIBILITY */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                        Affichage de vos répliques
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: "visible", label: "Visible", icon: Eye, desc: "Texte complet" },
                                            { id: "hint", label: "Indice", icon: Lightbulb, desc: "Premiers mots" },
                                            { id: "hidden", label: "Caché", icon: EyeOff, desc: "Test mémoire" }
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setTextVisibility(v.id as typeof textVisibility)}
                                                className={cn(
                                                    "p-3 rounded-xl text-center transition-all border flex flex-col items-center gap-1",
                                                    textVisibility === v.id
                                                        ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                                                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                                                )}
                                            >
                                                <v.icon className="w-4 h-4" />
                                                <span className="text-xs font-bold">{v.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* LAUNCH BUTTON */}
                                <Button
                                    size="lg"
                                    className="w-full h-14 text-lg font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/20"
                                    disabled={!canLaunch}
                                    onClick={handleLaunch}
                                >
                                    <Video className="w-5 h-5 mr-2" />
                                    Lancer la séance
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Panel - Invite Link & Preview */}
                <div className="hidden lg:flex w-[400px] bg-muted/30 border-l border-border flex-col items-center justify-center p-8 space-y-8">
                    {/* Invite Link Section */}
                    <div className="w-full space-y-4">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                                <Link2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Invitez votre partenaire</h3>
                            <p className="text-sm text-muted-foreground">Partagez ce lien pour qu'il/elle rejoigne</p>
                        </div>

                        <div className="bg-background border-2 border-dashed border-border rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteLink}
                                    className="flex-1 bg-transparent text-sm text-muted-foreground truncate outline-none"
                                />
                            </div>
                            <Button
                                onClick={copyInviteLink}
                                className={cn(
                                    "w-full gap-2 transition-all",
                                    copied
                                        ? "bg-emerald-500 hover:bg-emerald-600"
                                        : "bg-violet-600 hover:bg-violet-700"
                                )}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copié !
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copier le lien
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-center text-sm text-muted-foreground space-y-2">
                        <p>✨ Votre partenaire verra le script en temps réel</p>
                        <p>🎤 Les autres rôles seront joués par le Souffleur</p>
                        <p>🎬 Vous contrôlez la répétition</p>
                    </div>
                </div>
            </div>
        );
    }

    // ========== REHEARSAL SCREEN ==========
    return (
        <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
            {/* TOP BAR */}
            <div className="h-14 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setStep("setup")} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Quitter
                </Button>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">En direct</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs"
                        onClick={copyInviteLink}
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copié" : "Partager"}
                    </Button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative min-h-0">
                {/* REHEARSAL MODE - Full Screen */}
                <RehearsalMode
                    script={script}
                    userCharacters={[myCharacter]}
                    partnerCharacters={[partnerCharacter]}
                    onExit={() => setStep("setup")}
                    initialSettings={{
                        mode: "full",
                        visibility: textVisibility
                    }}
                    isVisio={true}
                    autoStart={true}
                    troupeId={troupeId}
                />

                {/* VIDEO OVERLAY - Fixed position top left (under top bar) */}
                {token && (
                    <div className="fixed top-20 left-4 z-50">
                        <LiveKitRoom
                            video={true}
                            audio={true}
                            token={token}
                            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                            data-lk-theme="default"
                        >
                            <VideoOverlay
                                isMinimized={isVideoMinimized}
                                onToggleSize={() => setIsVideoMinimized(!isVideoMinimized)}
                            />
                            <RoomAudioRenderer />
                        </LiveKitRoom>
                    </div>
                )}
            </div>
        </div>
    );
}
