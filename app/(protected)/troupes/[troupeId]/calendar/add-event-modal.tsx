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
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultDate?: Date | null;
}

export function AddEventModal({ troupeId, isOpen, onOpenChange, defaultDate }: AddEventModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Controlled vs Uncontrolled state
    const isControlled = isOpen !== undefined && onOpenChange !== undefined;
    const open = isControlled ? isOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;

    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("18:00");
    const [endTime, setEndTime] = useState("20:00");
    const [recurrence, setRecurrence] = useState<"none" | "weekly">("none");

    const [hasInitialized, setHasInitialized] = useState(false);

    // Sync defaultDate when opening
    if (open && defaultDate && !hasInitialized) {
        const yyyy = defaultDate.getFullYear();
        const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const dd = String(defaultDate.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setHasInitialized(true);
    }

    // Reset initialization when closing
    if (!open && hasInitialized) {
        setHasInitialized(false);
    }

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
                "rehearsal",
                undefined,
                recurrence
            );

            setOpen(false);
            // Reset form
            setTitle("");
            // Keep date if it was set via click, but maybe reset if we want fresh start next time? 
            // Better to keep user flow simple.
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la création de l'événement.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Only show trigger if we are NOT controlled (or if we want the button to always be there?) 
                Actually the original usage wants the button. 
                But for the cell click, we don't have a button trigger.
                So if controlled, we don't render Trigger unless we wrap it?
                Let's simplify: passing a `children` trigger or rendering it if not controlled?
                The previous usage was <AddEventModal troupeId="..."/> which rendered a button.
                So we should keep rendering the button if it's "stand-alone".
                BUT the parent will want to render the button to open it. 
                So let's move the Button OUT of this component if controlled, OR expose a render prop?
                
                Simpler: Always render Dialog. If `!isControlled`, render Trigger. 
             */}
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nouvel événement</DialogTitle>
                    <DialogDescription>
                        Planifiez une répétition.
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
                        <Label>Récurrence</Label>
                        <Select value={recurrence} onValueChange={(val: "none" | "weekly") => setRecurrence(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pas de récurrence" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Une seule fois</SelectItem>
                                <SelectItem value="weekly">Toutes les semaines (12 mardis)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Créera automatiquement les événements pour les 3 prochains mois.</p>
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
