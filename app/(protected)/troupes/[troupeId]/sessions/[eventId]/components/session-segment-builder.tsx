'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionSegmentBuilderProps {
    segment: any;
    play: any; // Full play data with stats
    attendance: Record<string, string>; // UserId -> Status
    onUpdate: (updatedSegment: any) => void;
    onDelete: () => void;
    actorMap: Record<string, any>; // CharacterID -> Actor (User/Guest)
}

export function SessionSegmentBuilder({ segment, play, attendance, onUpdate, onDelete, actorMap }: SessionSegmentBuilderProps) {
    const [showPlayableOnly, setShowPlayableOnly] = useState(false);
    const [expandedChars, setExpandedChars] = useState(false);

    // Scenes logic
    const scenes = play.play_scenes || [];

    // Filter scenes
    const filteredScenes = useMemo(() => {
        if (!showPlayableOnly) return scenes;

        return scenes.filter((scene: any) => {
            // Check if all required characters have a present actor
            const requiredChars = scene.scene_characters || [];
            if (requiredChars.length === 0) return true; // No characters = playable implicitly

            const allPresent = requiredChars.every((sc: any) => {
                const actor = actorMap[sc.character_id];
                if (!actor) return false; // Unassigned character -> Not playable
                const userId = actor.user_id || actor.id;
                return attendance[userId] === 'present';
            });
            return allPresent;
        });
    }, [scenes, showPlayableOnly, actorMap, attendance]);

    const handleSceneToggle = (sceneId: string) => {
        const currentScenes = segment.scenes || [];
        const exists = currentScenes.find((s: any) => s.id === sceneId);

        let newScenes;
        if (exists) {
            newScenes = currentScenes.filter((s: any) => s.id !== sceneId);
        } else {
            const sceneToAdd = scenes.find((s: any) => s.id === sceneId);
            newScenes = [...currentScenes, { id: sceneToAdd.id, title: sceneToAdd.title, index: sceneToAdd.index }];
        }

        onUpdate({ ...segment, scenes: newScenes });
    };

    const handleNoteChange = (note: string) => {
        onUpdate({ ...segment, segmentNote: note });
    };

    const handleCharacterNoteChange = (charId: string, note: string) => {
        onUpdate({
            ...segment,
            characterNotes: {
                ...segment.characterNotes,
                [charId]: note
            }
        });
    };

    // Calculate involved characters in SELECTED scenes
    const involvedCharacterIds = useMemo(() => {
        const ids = new Set<string>();
        segment.scenes.forEach((s: any) => {
            const fullScene = scenes.find((fs: any) => fs.id === s.id);
            fullScene?.scene_characters?.forEach((sc: any) => ids.add(sc.character_id));
        });
        return Array.from(ids);
    }, [segment.scenes, scenes]);


    return (
        <Card className="border-border/50 bg-card overflow-hidden transition-all duration-300">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                    <h3 className="font-black text-lg text-foreground">{play.title}</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        {segment.scenes.length} scènes sélectionnées
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Retirer
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">

                    {/* LEFT: Scene Selector */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm">Choix des Scènes</h4>
                            <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-lg">
                                <Button
                                    size="sm"
                                    variant={!showPlayableOnly ? "secondary" : "ghost"}
                                    onClick={() => setShowPlayableOnly(false)}
                                    className="h-7 text-[10px] font-bold uppercase"
                                >
                                    Toutes
                                </Button>
                                <Button
                                    size="sm"
                                    variant={showPlayableOnly ? "secondary" : "ghost"}
                                    onClick={() => setShowPlayableOnly(true)}
                                    className="h-7 text-[10px] font-bold uppercase text-green-600"
                                >
                                    Jouables
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {filteredScenes.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic p-4 text-center">Aucune scène ne correspond aux filtres.</p>
                            ) : (
                                filteredScenes.map((scene: any) => {
                                    const isSelected = segment.scenes.some((s: any) => s.id === scene.id);

                                    // Check playability individually for badges
                                    const requiredChars = scene.scene_characters || [];
                                    const missingActors = requiredChars.filter((sc: any) => {
                                        const actor = actorMap[sc.character_id];
                                        if (!actor) return true; // Unassigned is missing
                                        const userId = actor.user_id || actor.id;
                                        return attendance[userId] !== 'present';
                                    });
                                    const isPlayable = missingActors.length === 0;

                                    return (
                                        <div
                                            key={scene.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                                isSelected
                                                    ? "bg-primary/10 border-primary/30"
                                                    : "bg-background border-border hover:border-primary/20"
                                            )}
                                            onClick={() => handleSceneToggle(scene.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="pointer-events-none h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm truncate">{scene.title}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {requiredChars.map((sc: any) => {
                                                            const character = play.play_characters?.find((c: any) => c.id === sc.character_id);
                                                            const charName = character?.name || "Inconnu";
                                                            const actor = actorMap[sc.character_id];
                                                            const userId = actor?.user_id || actor?.id;
                                                            const isPresent = userId && attendance[userId] === 'present';

                                                            return (
                                                                <Badge
                                                                    key={sc.character_id}
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[9px] px-1 py-0 h-4 border-0",
                                                                        isPresent
                                                                            ? "bg-green-500/10 text-green-600"
                                                                            : "bg-red-500/10 text-red-500"
                                                                    )}
                                                                >
                                                                    {charName}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {isPlayable ? (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] uppercase tracking-wider">
                                                    Jouable
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[9px] uppercase tracking-wider">
                                                    Manque {missingActors.length}
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Notes */}
                    <div className="p-4 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Note générale pour cette partie</Label>
                            <Textarea
                                placeholder="Objectifs spécifiques, points d'attention..."
                                value={segment.segmentNote || ''}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                className="resize-none h-24 bg-muted/10 focus:bg-background transition-colors"
                            />
                        </div>

                        {involvedCharacterIds.length > 0 && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => setExpandedChars(!expandedChars)}
                                    className="flex items-center justify-between w-full text-xs font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <span>Notes aux acteurs ({involvedCharacterIds.length})</span>
                                    {expandedChars ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {expandedChars && (
                                    <div className="space-y-3 pt-2">
                                        {involvedCharacterIds.map(charId => {
                                            const charName = play.play_characters.find((c: any) => c.id === charId)?.name || "Inconnu";
                                            return (
                                                <div key={charId} className="space-y-1">
                                                    <Label className="text-[10px] font-bold">{charName}</Label>
                                                    <input
                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder={`Note pour ${charName}...`}
                                                        value={segment.characterNotes?.[charId] || ''}
                                                        onChange={(e) => handleCharacterNoteChange(charId, e.target.value)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
