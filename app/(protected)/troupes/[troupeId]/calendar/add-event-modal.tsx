'use client';

import { createEvent, updateAttendance } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary px-6">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className={cn(
                "z-[200] border-white/10 p-0 overflow-hidden",
                // Mobile: Bottom Side
                "fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-none rounded-t-[2rem] rounded-b-none",
                // Desktop: Center
                "md:fixed md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-[420px] md:rounded-3xl",
                "bg-[#0a0a0f]/98 backdrop-blur-2xl shadow-[0_-20px_80px_rgba(0,0,0,0.8)]"
            )}>
                {/* Mobile Handle */}
                <div className="flex md:hidden justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-white/10" />
                </div>

                <div className="p-6 md:p-8">
                    <DialogHeader className="mb-6 space-y-1">
                        <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-white md:text-center">
                            Nouvel événement
                        </DialogTitle>
                        <DialogDescription className="text-white/30 text-xs font-medium md:text-center">
                            Planifiez votre prochaine séance.
                        </DialogDescription>
                    </DialogHeader>

                    <AddEventForm
                        title={title} setTitle={setTitle}
                        date={date} setDate={setDate}
                        startTime={startTime} setStartTime={setStartTime}
                        endTime={endTime} setEndTime={setEndTime}
                        recurrence={recurrence} setRecurrence={setRecurrence}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface FormProps {
    title: string;
    setTitle: (v: string) => void;
    date: string;
    setDate: (v: string) => void;
    startTime: string;
    setStartTime: (v: string) => void;
    endTime: string;
    setEndTime: (v: string) => void;
    recurrence: "none" | "weekly";
    setRecurrence: (v: "none" | "weekly") => void;
    handleSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
}

function AddEventForm({
    title, setTitle, date, setDate, startTime, setStartTime,
    endTime, setEndTime, recurrence, setRecurrence,
    handleSubmit, isLoading
}: FormProps) {
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
                <Label htmlFor="title" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Titre de la séance</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Lecture Acte III"
                    required
                    className="h-11 bg-white/5 border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl transition-all font-bold text-sm text-white placeholder:text-white/10 px-4"
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="date" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Date</Label>
                <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-11 bg-white/5 border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl transition-all font-bold text-sm text-white px-4"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="start" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Heure Début</Label>
                    <Input
                        id="start"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="h-11 bg-white/5 border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl transition-all font-bold text-sm text-white px-4"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="end" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Heure Fin</Label>
                    <Input
                        id="end"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="h-11 bg-white/5 border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl transition-all font-bold text-sm text-white px-4"
                    />
                </div>
            </div>

            <div className="grid gap-1.5">
                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Répétition</Label>
                <Select value={recurrence} onValueChange={(val: "none" | "weekly") => setRecurrence(val)}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/5 hover:border-white/10 focus:border-primary/50 rounded-xl transition-all font-bold text-sm text-white px-4 shadow-none">
                        <SelectValue placeholder="Pas de récurrence" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-white/10 text-white rounded-xl shadow-2xl p-1">
                        <SelectItem value="none" className="rounded-lg focus:bg-primary/20 focus:text-primary transition-colors py-2.5 text-sm">Une seule fois</SelectItem>
                        <SelectItem value="weekly" className="rounded-lg focus:bg-primary/20 focus:text-primary transition-colors py-2.5 text-sm">Toutes les semaines</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base transition-all active:scale-[0.98] shadow-[0_8px_30px_rgba(var(--primary),0.3)] mt-2"
            >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                Planifier la séance
            </Button>
        </form>
    );
}
