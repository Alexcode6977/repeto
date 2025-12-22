'use client';

import { createEvent, updateAttendance } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

interface AddEventModalProps {
    troupeId: string;
    plays: any[];
}

export function AddEventModal({ troupeId, plays }: AddEventModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("18:00");
    const [endTime, setEndTime] = useState("20:00");
    const [type, setType] = useState("rehearsal");
    const [playId, setPlayId] = useState("none");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const start = new Date(`${date}T${startTime}`);
            const end = new Date(`${date}T${endTime}`);

            await createEvent(
                troupeId,
                title,
                start,
                end,
                type,
                playId === "none" ? undefined : playId
            );

            setOpen(false);
            // Reset form
            setTitle("");
            setDate("");
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la création de l'événement.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un événement
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nouvel événement</DialogTitle>
                    <DialogDescription>
                        Planifiez une répétition ou une représentation.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Titre</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Répétition Acte 1" required />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start">Début</Label>
                            <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end">Fin</Label>
                            <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rehearsal">Répétition</SelectItem>
                                <SelectItem value="performance">Représentation</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Pièce concernée (Optionnel)</Label>
                        <Select value={playId} onValueChange={setPlayId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Aucune" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucune</SelectItem>
                                {plays.map((play) => (
                                    <SelectItem key={play.id} value={play.id}>{play.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
