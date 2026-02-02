'use client';

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
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

interface AnnotatorClientProps {
    play: any;
    troupeId: string;
    troupeMembers: any[];
    guests: any[];
}

export type AnnotationContext =
    | { type: 'none' }
    | { type: 'act', title: string, index: number }
    | { type: 'scene', title: string, index: number }
    | { type: 'line', lineIndex: number, lineContent: string, character: string, sceneIndex: number };

export function AnnotatorClient({ play, troupeId, troupeMembers, guests }: AnnotatorClientProps) {
    const script = play.script_content;
    const scenes = script.scenes || [];

    // View state: Which scenes are displayed
    const [viewSceneIdx, setViewSceneIdx] = useState<number>(0);

    // Selection state: What is being annotated
    const [context, setContext] = useState<AnnotationContext>({ type: 'none' });

    const currentScene = scenes[viewSceneIdx];

    // Helper to get play characters
    const playCharacters = play.play_characters || [];

    // Get Actors in Current Scene
    const actorsInScene = useMemo(() => {
        if (!currentScene) return [];
        const actors = new Map<string, { id: string; name: string; characterName: string; avatar?: string }>();

        const dbScene = play.play_scenes?.find((s: any) => s.title === currentScene.title);

        if (dbScene) {
            dbScene.scene_characters?.forEach((sc: any) => {
                const charDef = playCharacters.find((pc: any) => pc.id === sc.character_id);
                if (charDef) {
                    const actorId = charDef.actor_id || charDef.guest_id;
                    const member = troupeMembers.find(m => m.user_id === actorId);
                    const guest = guests.find(g => g.id === actorId);

                    const name = member?.profiles?.first_name || guest?.name || "Inconnu";
                    const avatar = member?.profiles?.avatar_url;

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
    }, [currentScene, play.play_scenes, playCharacters, troupeMembers, guests]);

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">

            {/* TOP BAR */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">
                    <Link href={`/troupes/${troupeId}/plays/${play.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h2 className="font-bold text-sm hidden md:block">{play.title} - Mode Annotation</h2>
                </div>

                {/* SCENE SELECTOR */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Afficher :</span>
                    <Select value={viewSceneIdx.toString()} onValueChange={(val) => setViewSceneIdx(parseInt(val))}>
                        <SelectTrigger className="w-[240px] h-9 bg-muted/50 border-white/5 font-bold text-xs ring-offset-background focus:ring-amber-500/20">
                            <SelectValue placeholder="Sélectionner une scène" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#15151a] border-white/10">
                            {scenes.map((scene: any, idx: number) => (
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
                <div className="flex-[2] min-w-0 border-r border-border/10 bg-black/20 overflow-hidden">
                    <InteractiveScriptViewer
                        script={script}
                        currentSceneIdx={viewSceneIdx}
                        context={context}
                        setContext={setContext}
                    />
                </div>

                {/* RIGHT: ANNOTATION PANEL (1/3) */}
                <div className="flex-[1] min-w-[350px] bg-background overflow-hidden h-full flex flex-col">
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
