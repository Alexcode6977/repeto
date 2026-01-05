"use client";

import { useOpenAITTS } from "@/lib/hooks/use-openai-tts";
import { OpenAIVoice } from "@/app/actions/tts";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoicePreviewButtonProps {
    voice: OpenAIVoice;
    className?: string;
}

export function VoicePreviewButton({ voice, className }: VoicePreviewButtonProps) {
    const { speak, stop, isSpeaking, isLoading } = useOpenAITTS();

    const handlePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isSpeaking) {
            stop();
        } else {
            speak(`Bonjour, je suis la voix ${voice}.`, voice);
        }
    };

    return (
        <Button
            size="icon"
            variant="ghost"
            className={cn("w-8 h-8 rounded-full hover:bg-primary/10", className, isSpeaking ? "text-primary bg-primary/10" : "text-muted-foreground")}
            onClick={handlePlay}
            disabled={isLoading}
            title="Écouter un extrait"
        >
            {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : isSpeaking ? (
                <Pause className="w-3 h-3 fill-current" />
            ) : (
                <Play className="w-3 h-3 fill-current pl-0.5" />
            )}
        </Button>
    )
}
