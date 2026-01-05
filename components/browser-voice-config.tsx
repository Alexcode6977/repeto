"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Settings, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowserVoiceConfigProps {
    characters: string[];
    voices: SpeechSynthesisVoice[];
    assignments: Record<string, SpeechSynthesisVoice | undefined>;
    onAssign: (role: string, voiceURI: string) => void;
}

export function BrowserVoiceConfig({
    characters,
    voices,
    assignments,
    onAssign,
}: BrowserVoiceConfigProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Filter to show only relevant voices (FR for french context generally, but keep all just in case)
    // Actually, usually we prefer French voices if the app is in French.
    const frVoices = voices.filter(v => v.lang.startsWith("fr"));
    const displayVoices = frVoices.length > 0 ? frVoices : voices;

    const handleTestVoice = (voice: SpeechSynthesisVoice, text: string) => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = voice;
            utterance.lang = voice.lang;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors w-full mt-2"
                >
                    <Settings className="w-3 h-3" />
                    Configurer les voix
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configuration des Voix (Navigateur)</DialogTitle>
                    <DialogDescription>
                        Assignez une voix de synthèse à chaque personnage pour la lecture locale.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {characters.map((char) => {
                        const currentVoice = assignments[char];
                        return (
                            <div key={char} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {char.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-sm">{char}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={currentVoice?.voiceURI || ""}
                                        onValueChange={(val) => onAssign(char, val)}
                                    >
                                        <SelectTrigger className="w-[200px] h-8 text-xs">
                                            <SelectValue placeholder="Choisir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {displayVoices.map((voice) => (
                                                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                                                    {voice.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => currentVoice && handleTestVoice(currentVoice, `Bonjour, je suis ${char}`)}
                                        disabled={!currentVoice}
                                        title="Tester la voix"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end mt-4">
                    <Button onClick={() => setIsOpen(false)}>
                        Terminé
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
