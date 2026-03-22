'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InteractiveScriptViewer } from "./interactive-script-viewer";
import { AnnotatorGrid } from "./annotator-grid";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AnnotationContext, ParsedScript } from "@/lib/types";
import { useKeyboardInset } from "@/lib/hooks/use-keyboard-inset";

interface AnnotatorPlayCharacter {
    id: string;
    name: string;
    actor_id?: string | null;
    guest_id?: string | null;
}

interface AnnotatorPlayScene {
    title: string;
    scene_characters?: Array<{ character_id: string }> | null;
}

interface TroupeMemberProfile {
    first_name?: string | null;
    avatar_url?: string | null;
}

interface TroupeMember {
    user_id: string;
    profiles?: TroupeMemberProfile | TroupeMemberProfile[] | null;
}

interface GuestMember {
    id: string;
    name: string;
}

interface AnnotatorPlay {
    id: string;
    title: string;
    script_content: ParsedScript;
    play_characters?: AnnotatorPlayCharacter[] | null;
    play_scenes?: AnnotatorPlayScene[] | null;
}

interface AnnotatorClientProps {
    play: AnnotatorPlay;
    troupeId: string;
    troupeMembers: TroupeMember[];
    guests: GuestMember[];
}


export function AnnotatorClient({ play, troupeId, troupeMembers, guests }: AnnotatorClientProps) {
    useKeyboardInset(true);

    const script = play.script_content;
    const scenes = script.scenes || [];

    // View state: Which scenes are displayed
    const [viewSceneIdx, setViewSceneIdx] = useState<number>(0);

    // Selection state: What is being annotated
    const [context, setContext] = useState<AnnotationContext>({ type: 'none' });

    const currentScene = scenes[viewSceneIdx];

    // Get Actors in Current Scene
    const actorsInScene = useMemo(() => {
        if (!currentScene) return [];
        const actors = new Map<string, { id: string; name: string; characterName: string; avatar?: string }>();
        const playCharacters = play.play_characters || [];

        const dbScene = play.play_scenes?.find((s) => s.title === currentScene.title);

        if (dbScene) {
            dbScene.scene_characters?.forEach((sc) => {
                const charDef = playCharacters.find((pc) => pc.id === sc.character_id);
                if (charDef) {
                    const actorId = charDef.actor_id || charDef.guest_id;
                    const member = troupeMembers.find(m => m.user_id === actorId);
                    const guest = guests.find(g => g.id === actorId);
                    const profile = Array.isArray(member?.profiles) ? member?.profiles[0] : member?.profiles;

                    const name = profile?.first_name || guest?.name || "Inconnu";
                    const avatar = profile?.avatar_url || undefined;

                    if (actorId) {
                        const existing = actors.get(actorId);
                        if (existing) {
                            existing.characterName += ` & ${charDef.name}`;
                        } else {
                            actors.set(actorId, {
                                id: actorId,
                                name,
                                characterName: charDef.name,
                                avatar
                            });
                        }
                    } else {
                        actors.set(`unassigned-${charDef.id}`, {
                            id: `unassigned-${charDef.id}`,
                            name: "?",
                            characterName: charDef.name
                        });
                    }
                }
            });
        }

        return Array.from(actors.values());
    }, [currentScene, play.play_characters, play.play_scenes, troupeMembers, guests]);

    return (
        <div className="flex flex-col h-[100dvh] bg-background overflow-hidden relative">

            {/* TOP BAR */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md mobile-heavy-surface flex items-center justify-between gap-2 px-4 z-20">
                <div className="flex items-center gap-4">
                    <Link href={`/troupes/${troupeId}/plays/${play.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h2 className="font-bold text-sm hidden md:block">{play.title} - Mode Annotation</h2>
                </div>

                {/* SCENE SELECTOR */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Afficher :</span>
                    <Select value={viewSceneIdx.toString()} onValueChange={(val) => setViewSceneIdx(parseInt(val))}>
                        <SelectTrigger className="w-[140px] sm:w-[240px] h-9 bg-muted/50 border-border/60 dark:border-white/5 font-bold text-xs ring-offset-background focus:ring-amber-500/20">
                            <SelectValue placeholder="Sélectionner une scène" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover dark:bg-[#15151a] border-border dark:border-white/10">
                            {scenes.map((scene, idx) => (
                                <SelectItem key={`select-${idx}`} value={idx.toString()} className="text-xs font-bold focus:bg-amber-500 focus:text-black">
                                    {idx + 1}. {scene.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* LEFT: SCRIPT (2/3) */}
                <div className="flex-[2] min-w-0 md:border-r border-border/10 bg-muted/40 dark:bg-black/20 overflow-hidden">
                    <InteractiveScriptViewer
                        script={script}
                        currentSceneIdx={viewSceneIdx}
                        context={context}
                        setContext={setContext}
                    />
                </div>

                {/* RIGHT: ANNOTATION PANEL (1/3) */}
                <div className="flex-[1] min-w-0 md:min-w-[350px] bg-background overflow-hidden h-full flex flex-col border-t md:border-t-0 md:border-l border-border/10">
                    <AnnotatorGrid
                        actorsInScene={actorsInScene}
                        playId={play.id}
                        context={context}
                        currentScene={currentScene}
                    />
                </div>

            </div>

        </div>
    );
}
