'use client';

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, StickyNote, Pencil, X, Save, Lock, CheckCircle } from "lucide-react";
import { deleteRawNote, updateRawNote } from "@/lib/actions/session";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface NoteProcessingCardProps {
    note: any;
    sceneCharacters: any[]; // Characters present in the scene
    onDelete: (id: string) => void;
    onUpdate: (id: string, text: string) => void;
    onProcess: (id: string, type: 'feedback' | 'indication', targetIds: string[]) => void;
}

export function NoteProcessingCard({ note, sceneCharacters, onDelete, onUpdate, onProcess }: NoteProcessingCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.text);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal State
    const [actionType, setActionType] = useState<'feedback' | 'indication' | null>(null);

    const handleSaveEdit = async () => {
        setIsProcessing(true);
        try {
            await updateRawNote(note.id, editText);
            onUpdate(note.id, editText);
            setIsEditing(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Supprimer cette note définitivement ?")) return;
        setIsProcessing(true);
        try {
            await deleteRawNote(note.id);
            onDelete(note.id);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Action Modal ---
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

    const handleOpenAction = (type: 'feedback' | 'indication') => {
        setActionType(type);
        setSelectedTargets([]);
    };

    const toggleTarget = (id: string) => {
        if (selectedTargets.includes(id)) {
            setSelectedTargets(prev => prev.filter(t => t !== id));
        } else {
            setSelectedTargets(prev => [...prev, id]);
        }
    };

    const handleConfirmAction = () => {
        if (!actionType) return;
        // In a real app, this would call a server action to create the feedback
        // For now we assume the parent handles the "conversion" (mocked)
        onProcess(note.id, actionType, selectedTargets);
        setActionType(null);
    };

    // Find target names if processed
    const targetNames = note.processedTargets
        ? sceneCharacters.filter(c => note.processedTargets.includes(c.id)).map(c => c.name).join(", ")
        : "";

    if (note.processed) {
        return (
            <Card className="group border-green-500 bg-green-500/10 transition-colors relative">
                <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                            {note.processedType === 'indication' ? 'Indication' : 'Feedback'} prêt à être envoyé
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-700 hover:text-green-800 hover:bg-green-500/20" onClick={() => onDelete(note.id)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <p className="text-foreground text-lg whitespace-pre-wrap opacity-80">{note.text}</p>

                    <div className="mt-2 flex items-center gap-2 text-sm text-green-800 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Pour : {targetNames}</span>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <>
            <Card className="group hover:border-primary/50 transition-colors relative">
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {new Date(note.created_at).toLocaleTimeString()}
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-full text-muted-foreground"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {note.context && (
                            <div className="bg-muted/50 rounded-lg p-2 mb-3 text-xs border border-border/50">
                                {note.context.characterName && (
                                    <span className="font-bold uppercase tracking-wider text-primary block mb-0.5 text-[10px]">
                                        {note.context.characterName}
                                    </span>
                                )}
                                <p className="italic text-muted-foreground font-serif leading-snug line-clamp-2">
                                    "{note.context.lineText}"
                                </p>
                            </div>
                        )}

                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full bg-background border border-input rounded-md p-2 text-sm min-h-[80px]"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isProcessing}>
                                        <X className="w-4 h-4 mr-1" /> Annuler
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEdit} disabled={isProcessing}>
                                        <Save className="w-4 h-4 mr-1" /> Enregistrer
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-foreground text-lg whitespace-pre-wrap">{note.text}</p>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="flex md:flex-col flex-row gap-2 md:opacity-50 md:group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" onClick={() => handleOpenAction('feedback')} className="justify-start gap-2 h-8 text-xs w-full md:w-auto">
                                <MessageSquare className="w-3 h-3" /> Feedback
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenAction('indication')} className="justify-start gap-2 h-8 text-xs w-full md:w-auto">
                                <StickyNote className="w-3 h-3" /> Indication
                            </Button>

                            <Separator className="hidden md:block my-1" />

                            <Button size="sm" variant="ghost" className="justify-start gap-2 h-8 text-xs w-full md:w-auto text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                                <Lock className="w-3 h-3" /> Carder (Note Perso)
                            </Button>

                            <Button size="sm" variant="ghost" onClick={handleDelete} className="justify-start gap-2 h-8 text-xs w-full md:w-auto text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-3 h-3" /> Supprimer
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <Dialog open={!!actionType} onOpenChange={(o) => !o && setActionType(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'feedback' ? 'Envoyer un Feedback' : 'Donner une Indication'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Sélectionnez les personnages concernés par cette note :
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {sceneCharacters.map((char) => (
                                <div
                                    key={char.id}
                                    onClick={() => toggleTarget(char.id)}
                                    className={`
                                       p-3 rounded-lg border cursor-pointer flex items-center gap-2
                                       ${selectedTargets.includes(char.id) ? 'bg-primary/10 border-primary' : 'bg-card hover:border-primary/50'}
                                   `}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTargets.includes(char.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                        {selectedTargets.includes(char.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-sm font-medium">{char.name}</span>
                                </div>
                            ))}
                        </div>
                        {sceneCharacters.length === 0 && (
                            <p className="text-sm text-yellow-600">Aucun personnage détecté dans cette scène.</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setActionType(null)}>Annuler</Button>
                        <Button onClick={handleConfirmAction} disabled={selectedTargets.length === 0}>
                            Confirmer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
