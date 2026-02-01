'use client';

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import Link from "next/link";
// We will create these next
import { InteractiveScriptViewer } from "./interactive-script-viewer";
import { AnnotatorGrid } from "./annotator-grid";
import { MobileAnnotatorSheet } from "./mobile-annotator-sheet";

interface AnnotatorClientProps {
    play: any;
    troupeId: string;
    troupeMembers: any[];
    guests: any[];
}

export type AnnotationContext =
    | { type: 'scene' }
    | { type: 'line', lineIndex: number, lineContent: string, character: string }
    | { type: 'inter-line', afterLineIndex: number };

export function AnnotatorClient({ play, troupeId, troupeMembers, guests }: AnnotatorClientProps) {
    const script = play.script_content;
    const scenes = script.scenes || [];

    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
    const [context, setContext] = useState<AnnotationContext>({ type: 'scene' });

    // Mobile Sheet State
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
    const [mobileContext, setMobileContext] = useState<AnnotationContext>({ type: 'scene' });

    const handleMobileInteract = (ctx: AnnotationContext) => {
        setMobileContext(ctx);
        setIsMobileSheetOpen(true);
    };

    const currentScene = scenes[currentSceneIdx];

    // Helper to get play characters
    const playCharacters = play.play_characters || [];

    // Get Actors in Current Scene (similar logic to LiveSession but using play data)
    const actorsInScene = useMemo(() => {
        if (!currentScene) return [];
        const actors = new Map<string, { id: string; name: string; characterName: string; avatar?: string }>();

        // Scene usually has a list of characters or we infer from lines?
        // In the LiveSession logic, `scene_characters` came from DB relation. 
        // Here we have the raw script scene. We need to find characters in this scene.
        // Actually `play.play_scenes` has the relational data. `script.scenes` is just text content.
        // We should map them.

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
                        // Non distributed
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

    const handleSceneChange = (dir: 'next' | 'prev') => {
        setContext({ type: 'scene' }); // Reset context on scene change
        if (dir === 'next' && currentSceneIdx < scenes.length - 1) setCurrentSceneIdx(c => c + 1);
        if (dir === 'prev' && currentSceneIdx > 0) setCurrentSceneIdx(c => c - 1);
    };

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

                {/* SCENE NAV SCROLL */}
                <div className="flex-1 overflow-x-auto no-scrollbar flex items-center justify-center gap-2 px-4">
                    {scenes.map((scene: any, idx: number) => {
                        const isActive = idx === currentSceneIdx;
                        return (
                            <button
                                key={`nav-${idx}`}
                                onClick={() => setCurrentSceneIdx(idx)}
                                className={cn(
                                    "shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <span className="opacity-50 mr-1">{idx + 1}.</span>
                                {scene.title.substring(0, 15)}{scene.title.length > 15 && "..."}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                {/* LEFT: SCRIPT */}
                <div className="flex-1 md:flex-[0.6] min-w-0 border-r border-border/10 bg-black/20">
                    <InteractiveScriptViewer
                        script={script}
                        currentSceneIdx={currentSceneIdx}
                        context={context}
                        setContext={setContext}
                        onMobileInteract={handleMobileInteract}
                    />
                </div>

                {/* RIGHT: ACTORS & TOOLS (Desktop Only) */}
                <div className="hidden md:block flex-1 md:flex-[0.4] min-w-0 bg-background">
                    <AnnotatorGrid
                        actorsInScene={actorsInScene}
                        playId={play.id}
                        context={context}
                        playCharacters={playCharacters}
                        currentScene={currentScene} // Text Scene
                        globalSceneIndex={currentScene.index} // Assuming script has index, or we use currentSceneIdx if strict match
                    />
                </div>

            </div>

            {/* Mobile Bottom Sheet */}
            <MobileAnnotatorSheet
                isOpen={isMobileSheetOpen}
                onClose={() => setIsMobileSheetOpen(false)}
                actorsInScene={actorsInScene}
                playId={play.id}
                globalSceneIndex={currentScene.index}
                context={mobileContext}
            />

            {/* BOTTOM NAV (Mobile mainly) */}
            <div className="md:hidden h-16 shrink-0 bg-background border-t border-border flex items-center justify-between px-4">
                <Button variant="ghost" onClick={() => handleSceneChange('prev')} disabled={currentSceneIdx === 0}>
                    <ChevronLeft />
                </Button>
                <span className="text-xs font-bold">Scène {currentSceneIdx + 1}/{scenes.length}</span>
                <Button variant="ghost" onClick={() => handleSceneChange('next')} disabled={currentSceneIdx === scenes.length - 1}>
                    <ChevronRight />
                </Button>
            </div>

        </div>
    );
}
