"use client";

import { useState, useMemo, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { parseScript } from "@/lib/parser";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { ArrowLeft, Video, Copy, Loader2, User, Users, Mic, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

interface VisioRehearsalClientProps {
    troupeId: string;
    play: any;
    userId: string;
    members: any[];
}

export function VisioRehearsalClient({ troupeId, play, userId, members }: VisioRehearsalClientProps) {
    const router = useRouter();

    // -- State: Setup vs Rehearsal --
    const [step, setStep] = useState<"setup" | "rehearsal">("setup");

    // -- Parsing Script --
    const script: ParsedScript = useMemo(() => {
        return parseScript(play.text_content || "", (play.play_characters || []).map((c: any) => c.name));
    }, [play]);

    // -- Setup State --
    const [myCharacter, setMyCharacter] = useState<string>("");
    const [partnerCharacter, setPartnerCharacter] = useState<string>("");
    const [rehearsalMode, setRehearsalMode] = useState<"full" | "cue">("cue");

    // -- Video State --
    const [token, setToken] = useState("");
    const [roomName] = useState(`visio_${troupeId}_${play.id}_${Date.now().toString().slice(-4)}`); // Simple unique room for simplicity or use persistent
    const [inviteUrl, setInviteUrl] = useState("");

    // Detect if valid selection
    const canLaunch = myCharacter && partnerCharacter && myCharacter !== partnerCharacter;

    // -- Handlers --
    const handleLaunch = async () => {
        if (!canLaunch) return;

        try {
            // Generate Token
            const member = members.find(m => m.user_id === userId);
            const name = member?.profiles?.first_name || "Moi";

            const resp = await fetch(
                `/api/livekit/token?room=${roomName}&username=${encodeURIComponent(name)}`
            );
            const data = await resp.json();

            if (data.token) {
                setToken(data.token);
                setInviteUrl(`${window.location.origin}/join/${roomName}`); // Simple invite concept, or just send them to this page with param?
                // Actually, for now, let's just assume they share a "Video Room Name" or we use a fixed room for the play/troupe?
                // The task description said "Share link". 
                // Let's use a simpler approach: The room ID is fixed for this "Session" 
                // BUT if we want ad-hoc, random room is safer to avoid collisions.
                // Let's keep `roomName` state.
                setStep("rehearsal");
            }
        } catch (e) {
            console.error("Token error", e);
            alert("Erreur connection vidéo");
        }
    };

    // If step is setup
    if (step === "setup") {
        return (
            <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Back Button */}
                <div className="absolute top-6 left-6 z-10">
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </Button>
                </div>

                <div className="w-full max-w-lg space-y-8 relative z-10">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 text-violet-500 mb-4 animate-pulse-subtle">
                            <Video className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight">Répétition Visio</h1>
                        <p className="text-muted-foreground">Configurez votre séance de travail à distance.</p>
                    </div>

                    <Card className="border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-card/80">
                        <CardContent className="p-6 space-y-6">

                            {/* MY CHARACTER */}
                            <div className="space-y-3">
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
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Mon partenaire joue...
                                </Label>
                                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs mb-2">
                                    ⚠️ Ce personnage ne sera <strong>pas joué par l'IA</strong> car c'est votre partenaire qui parlera !
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
        );
    }

    // If step is rehearsal
    return (
        <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">

            {/* TOP BAR - Visio Controls & Info */}
            <div className="h-16 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setStep("setup")} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quitter
                </Button>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">En direct</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs"
                        onClick={() => {
                            // Copy room name or link
                            navigator.clipboard.writeText(roomName);
                            alert("Nom du salon copié ! Partagez-le à votre partenaire.");
                        }}
                    >
                        <Copy className="w-3 h-3" />
                        {roomName.substring(0, 8)}...
                    </Button>
                </div>
            </div>

            {/* MAIN CONTENT - Split View */}
            <div className="flex-1 flex min-h-0 relative">

                {/* LEFT: REHEARSAL SCRIPT (Takes most space) */}
                <div className="flex-1 relative z-10">
                    <RehearsalMode
                        script={script}
                        userCharacters={[myCharacter]}
                        partnerCharacters={[partnerCharacter]} // NEW PROP we need to add
                        onExit={() => setStep("setup")}
                        initialSettings={{
                            mode: rehearsalMode,
                            visibility: "visible"
                        }}
                        isVisio={true}
                        troupeId={troupeId}
                    />
                </div>

                {/* RIGHT: VIDEO FLOATING OR SIDEBAR */}
                {/* For now let's make it a draggable overlay style or a fixed sidebar.
                     Since user asked for "new page", split screen is safer.
                     Let's do a fixed sidebar on the right.
                  */}
                <div className="w-[350px] bg-gray-900 border-l border-gray-800 shrink-0 flex flex-col">
                    {token ? (
                        <LiveKitRoom
                            video={true}
                            audio={true}
                            token={token}
                            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                            data-lk-theme="default"
                            style={{ height: '100%', flex: 1 }}
                        >
                            <VideoConference />
                            <RoomAudioRenderer />
                        </LiveKitRoom>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
