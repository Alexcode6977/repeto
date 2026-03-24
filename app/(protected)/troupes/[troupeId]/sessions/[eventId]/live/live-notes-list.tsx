'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { getLiveSessionRawNotes } from "@/lib/features/live-session/live-session-gateway";
import type { LiveSessionRawNote } from "@/lib/features/live-session/types";

interface LiveNotesListProps {
    eventId: string;
    refreshKey?: number;
}

export function LiveNotesList({ eventId, refreshKey = 0 }: LiveNotesListProps) {
    const [notes, setNotes] = useState<LiveSessionRawNote[]>([]);

    useEffect(() => {
        let isActive = true;

        const fetchNotes = async () => {
            const data = await getLiveSessionRawNotes(eventId);
            if (isActive) {
                setNotes(data || []);
            }
        };

        void fetchNotes();

        const intervalId = window.setInterval(() => {
            void fetchNotes();
        }, 5000);

        return () => {
            isActive = false;
            window.clearInterval(intervalId);
        };
    }, [eventId, refreshKey]);

    return (
        <div className="h-full flex flex-col bg-muted/10">
            <div className="p-4 border-b border-border shadow-sm bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Flux de Notes</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {notes.length}
                </span>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                    {notes.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground italic text-sm">
                            Aucune note prise pour le moment.
                        </div>
                    ) : (
                        notes.map((note) => (
                            <Card key={note.id} className="p-3 bg-card border border-border/50 shadow-sm animate-in slide-in-from-right-2 duration-300">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                                        Scène {note.scene_index + 1}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {note.context ? (
                                    <div className="bg-muted/50 rounded-lg p-2 mb-2 text-xs border border-border/50">
                                        {note.context.characterName ? (
                                            <span className="font-bold uppercase tracking-wider text-primary block mb-0.5 text-[10px]">
                                                {note.context.characterName}
                                            </span>
                                        ) : null}
                                        <p className="italic text-muted-foreground font-serif leading-snug line-clamp-2">
                                            &quot;{note.context.lineText}&quot;
                                        </p>
                                    </div>
                                ) : null}
                                <p className="text-sm font-medium text-foreground leading-relaxed">
                                    {note.text}
                                </p>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
