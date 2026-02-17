'use client';

import { createEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddEventModalProps {
    troupeId: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultDate?: Date | null;
}

const toInputDate = (value: Date) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

export function AddEventModal({ troupeId, isOpen, onOpenChange, defaultDate }: AddEventModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const isControlled = isOpen !== undefined && onOpenChange !== undefined;
    const open = isControlled ? isOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;

    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("18:00");
    const [endTime, setEndTime] = useState("20:00");
    const [recurrence, setRecurrence] = useState<"none" | "weekly">("none");

    useEffect(() => {
        if (!open) return;
        setDate(toInputDate(defaultDate || new Date()));
        setFormError(null);
    }, [open, defaultDate]);

    useEffect(() => {
        if (open) return;
        setTitle("");
        setStartTime("18:00");
        setEndTime("20:00");
        setRecurrence("none");
        setIsLoading(false);
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!title.trim()) {
            setFormError("Le titre est requis.");
            return;
        }

        if (!date) {
            setFormError("Sélectionnez une date.");
            return;
        }

        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setFormError("Horaires invalides.");
            return;
        }

        if (end <= start) {
            setFormError("L'heure de fin doit être après l'heure de début.");
            return;
        }

        setIsLoading(true);

        try {
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
        } catch (error) {
            console.error(error);
            setFormError("Erreur lors de la création de l'événement.");
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

            <DialogContent
                className={cn(
                    "z-[220] border-border/60 dark:border-white/10 p-0 overflow-hidden max-h-[88vh]",
                    "fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-none rounded-t-[2rem] rounded-b-none",
                    "md:fixed md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-[460px] md:rounded-3xl",
                    "bg-card/95 dark:bg-[#0a0a0f]/98 backdrop-blur-2xl shadow-[0_-10px_45px_rgba(15,23,42,0.15)] dark:shadow-[0_-20px_80px_rgba(0,0,0,0.8)]"
                )}
            >
                <div className="flex md:hidden justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-foreground/20 dark:bg-white/20" />
                </div>

                <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-4 md:px-8 md:pb-8 md:pt-7">
                    <DialogHeader className="mb-5 space-y-2">
                        <DialogTitle className="text-2xl font-black tracking-tight text-foreground dark:text-white md:text-center">
                            Nouvel événement
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-white/60 text-sm font-medium md:text-center">
                            Planifiez votre prochaine séance.
                        </DialogDescription>
                    </DialogHeader>

                    <AddEventForm
                        title={title}
                        setTitle={setTitle}
                        date={date}
                        setDate={setDate}
                        startTime={startTime}
                        setStartTime={setStartTime}
                        endTime={endTime}
                        setEndTime={setEndTime}
                        recurrence={recurrence}
                        setRecurrence={setRecurrence}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        formError={formError}
                        setFormError={setFormError}
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
    formError: string | null;
    setFormError: (v: string | null) => void;
}

function AddEventForm({
    title,
    setTitle,
    date,
    setDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    recurrence,
    setRecurrence,
    handleSubmit,
    isLoading,
    formError,
    setFormError,
}: FormProps) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[76vh]">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-muted/20 dark:bg-white/[0.03] p-4 space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60 ml-1">
                            Titre de la séance
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (formError) setFormError(null);
                            }}
                            placeholder="Ex: Lecture Acte III"
                            required
                            className="h-12 rounded-xl border-border/70 dark:border-white/15 bg-background/90 dark:bg-white/10 px-4 text-sm font-semibold text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/40 hover:border-border dark:hover:border-white/30 focus-visible:ring-primary/60"
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60 ml-1">
                            Date
                        </Label>
                        <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/50" />
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    if (formError) setFormError(null);
                                }}
                                required
                                className="h-12 rounded-xl border-border/70 dark:border-white/15 bg-background/90 dark:bg-white/10 pl-10 pr-4 text-sm font-semibold text-foreground dark:text-white hover:border-border dark:hover:border-white/30 focus-visible:ring-primary/60 appearance-none [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="start" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60 ml-1">
                                Heure début
                            </Label>
                            <Input
                                id="start"
                                type="time"
                                value={startTime}
                                onChange={(e) => {
                                    setStartTime(e.target.value);
                                    if (formError) setFormError(null);
                                }}
                                required
                                className="h-12 rounded-xl border-border/70 dark:border-white/15 bg-background/90 dark:bg-white/10 px-4 text-sm font-semibold text-foreground dark:text-white hover:border-border dark:hover:border-white/30 focus-visible:ring-primary/60 appearance-none [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="end" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60 ml-1">
                                Heure fin
                            </Label>
                            <Input
                                id="end"
                                type="time"
                                value={endTime}
                                onChange={(e) => {
                                    setEndTime(e.target.value);
                                    if (formError) setFormError(null);
                                }}
                                required
                                className="h-12 rounded-xl border-border/70 dark:border-white/15 bg-background/90 dark:bg-white/10 px-4 text-sm font-semibold text-foreground dark:text-white hover:border-border dark:hover:border-white/30 focus-visible:ring-primary/60 appearance-none [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60 ml-1">Répétition</Label>
                        <Select
                            value={recurrence}
                            onValueChange={(val: "none" | "weekly") => {
                                setRecurrence(val);
                                if (formError) setFormError(null);
                            }}
                        >
                            <SelectTrigger className="h-12 rounded-xl border-border/70 dark:border-white/15 bg-background/90 dark:bg-white/10 px-4 text-sm font-semibold text-foreground dark:text-white hover:border-border dark:hover:border-white/30 focus:ring-primary/60 shadow-none">
                                <SelectValue placeholder="Pas de récurrence" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover dark:bg-[#0a0a0f] border-border dark:border-white/10 text-popover-foreground dark:text-white rounded-xl shadow-2xl p-1">
                                <SelectItem value="none" className="rounded-lg focus:bg-primary/20 focus:text-primary transition-colors py-2.5 text-sm">
                                    Une seule fois
                                </SelectItem>
                                <SelectItem value="weekly" className="rounded-lg focus:bg-primary/20 focus:text-primary transition-colors py-2.5 text-sm">
                                    Toutes les semaines
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {formError && (
                    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                        {formError}
                    </p>
                )}
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-2xl bg-primary font-black text-base text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                    Planifier la séance
                </Button>
            </div>
        </form>
    );
}
