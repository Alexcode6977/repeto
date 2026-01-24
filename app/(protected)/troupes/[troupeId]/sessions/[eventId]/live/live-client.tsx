'use client';

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { LiveScriptViewer } from "./live-script-viewer";
import { LiveActorGrid } from "./live-actor-grid";

interface LiveSessionClientProps {
    sessionData: any;
    troupeId: string;
    currentUser: { id: string; name: string };
    isReadOnly?: boolean;
}

export function LiveSessionClient({ sessionData, troupeId, currentUser, isReadOnly = false }: LiveSessionClientProps) {
    // 1. Data Preparation
    const scenes = useMemo(() => {
        if (!sessionData.session_plans?.selected_scenes) return [];
        return sessionData.session_plans.selected_scenes.map((s: any) => {
            // Normalize ID
            const sId = typeof s === 'string' ? s : s.id;

            // Find full scene details from plays
            for (const play of sessionData.plays || []) {
                const found = play.play_scenes.find((ps: any) => ps.id === sId);
                if (found) return { ...found, playTitle: play.title, playId: play.id, playCharacters: play.play_characters };
            }
            return null;
        }).filter(Boolean);
    }, [sessionData]);

    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);

    // Safety check
    if (scenes.length === 0) return <div className="p-8 text-center text-muted-foreground">Aucune scène au programme.</div>;

    const currentScene = scenes[currentSceneIdx];

    // Get Actors in Current Scene
    const actorsInScene = useMemo(() => {
        if (!currentScene) return [];
        const actors = new Map<string, { id: string; name: string; characterName: string; avatar?: string }>();

        // Iterate characters in scene
        currentScene.scene_characters?.forEach((sc: any) => {
            const charDef = currentScene.playCharacters?.find((pc: any) => pc.id === sc.character_id);
            if (charDef) {
                const actorId = charDef.actor_id || charDef.guest_id;

                if (actorId) {
                    const existing = actors.get(actorId);
                    if (existing) {
                        existing.characterName += ` & ${charDef.name}`;
                    } else {
                        actors.set(actorId, {
                            id: actorId,
                            name: "Acteur", // Placeholder name
                            characterName: charDef.name
                        });
                    }
                } else {
                    // Empty Role
                    actors.set(`unassigned-${charDef.id}`, {
                        id: `unassigned-${charDef.id}`,
                        name: "?",
                        characterName: charDef.name + " (Non distribué)"
                    });
                }
            }
        });
        return Array.from(actors.values());
    }, [currentScene]);

    const handleSceneChange = (dir: 'next' | 'prev') => {
        if (dir === 'next' && currentSceneIdx < scenes.length - 1) setCurrentSceneIdx(c => c + 1);
        if (dir === 'prev' && currentSceneIdx > 0) setCurrentSceneIdx(c => c - 1);
    };

    // Find global scene index (index in the source play's script)
    // We need this for injection. 
    // Wait, LiveScriptViewer does it internally by title. 
    // LiveActorGrid also needs it for "Scene Direction".
    // Let's pass it. Since scenes in `scenes` array might come from different plays, 
    // we need to find the specific play for currentScene.
    const globalSceneIndex = useMemo(() => {
        if (!currentScene || !sessionData.plays) return -1;
        const play = sessionData.plays.find((p: any) => p.id === currentScene.playId);
        if (!play || !play.script_content) return -1;

        // Find index in script.scenes by matching title (safest link we have)
        return play.script_content.scenes.findIndex((s: any) => s.title === currentScene.title);
    }, [currentScene, sessionData.plays]);

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-background overflow-hidden relative">

            {/* A. SCENE NAVIGATION BAR */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2 z-20">
                {scenes.map((scene: any, idx: number) => {
                    const isActive = idx === currentSceneIdx;
                    return (
                        <button
                            key={`${scene.id}-${idx}`}
                            onClick={() => setCurrentSceneIdx(idx)}
                            className={cn(
                                "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary scale-105"
                                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            )}
                        >
                            <span className="opacity-50 mr-2">{idx + 1}.</span>
                            {scene.title}
                        </button>
                    )
                })}
            </div>

            {/* B. SPLIT VIEW MAIN CONTENT */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                {/* LEFT: SCRIPT (60%) */}
                <div className="flex-1 md:flex-[0.6] min-w-0 border-r border-border/10 bg-black/20">
                    <LiveScriptViewer
                        sessionData={sessionData}
                        currentSceneIdx={currentSceneIdx}
                        scenes={scenes}
                        isReadOnly={isReadOnly}
                    />
                </div>

                {/* RIGHT: ACTORS (40%) */}
                <div className="flex-1 md:flex-[0.4] min-w-0 bg-background">
                    <LiveActorGrid
                        actorsInScene={actorsInScene}
                        sessionData={sessionData}
                        currentScene={currentScene}
                        globalSceneIndex={globalSceneIndex}
                        isReadOnly={isReadOnly}
                    />
                </div>

            </div>

            {/* C. BOTTOM NAVIGATION CONTROLS */}
            <div className="h-20 shrink-0 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-6 pb-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSceneChange('prev')}
                    disabled={currentSceneIdx === 0}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Scène</span>
                    <span className="text-xl font-bold font-mono">
                        {currentSceneIdx + 1}<span className="text-muted-foreground/40 text-sm">/{scenes.length}</span>
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSceneChange('next')}
                    disabled={currentSceneIdx === scenes.length - 1}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                >
                    <ChevronRight className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}

