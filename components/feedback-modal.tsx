"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { X, Star, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: FeedbackData) => Promise<void>;
    sessionData: {
        scriptTitle: string;
        characterName: string | string[];
        durationSeconds: number;
        linesRehearsed: number;
        completionPercentage: number;
        linesValidatedFirstTry?: number;
        linesWrong?: number;
        linesSkipped?: number;
        firstTryRate?: number;
        settings: Record<string, unknown>;
    };
}

export interface FeedbackData {
    rating: number;
    whatWorked: string;
    whatDidntWork: string;
    improvementIdeas: string;
}

export function FeedbackModal({ isOpen, onClose, onSubmit, sessionData }: FeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [whatWorked, setWhatWorked] = useState("");
    const [whatDidntWork, setWhatDidntWork] = useState("");
    const [improvementIdeas, setImprovementIdeas] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isValid = rating > 0 && (whatWorked.trim() || whatDidntWork.trim());

    const handleSubmit = async () => {
        if (!isValid) {
            setError("Donne-moi une note et remplis au moins un champ ! 🙏");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                rating,
                whatWorked: whatWorked.trim(),
                whatDidntWork: whatDidntWork.trim(),
                improvementIdeas: improvementIdeas.trim(),
            });
            onClose();
        } catch (e) {
            setError("Oups, erreur lors de l'envoi. Réessaie !");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
            <div className="bg-gradient-to-b from-[#1f1f1f] to-[#141414] border border-white/10 rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 fade-in duration-300">

                {/* Header with Repeto */}
                <div className="relative p-6 pb-4 text-center border-b border-white/10">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Repeto Avatar */}
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 p-1 ring-4 ring-primary/20">
                        <img
                            src="/repeto.png"
                            alt="Repeto"
                            className="w-full h-full object-contain rounded-full"
                        />
                    </div>

                    <h2 className="text-xl font-bold text-foreground">
                        Comment c'était ? 🎭
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ton avis m'aide à m'améliorer !
                    </p>

                    {/* Session Summary - Detailed Dashboard */}
                    <div className="mt-4 w-full bg-card/50 rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                            <span>{sessionData.scriptTitle}</span>
                            <span>{formatDuration(sessionData.durationSeconds)}</span>
                        </div>

                        {/* Efficiency Score */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-left">
                                <p className="text-sm text-muted-foreground">Efficacité</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {sessionData.firstTryRate || 0}%
                                    <span className="text-xs font-normal text-muted-foreground ml-1">du 1er coup</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Lignes vues</p>
                                <p className="text-2xl font-bold text-white">
                                    {sessionData.linesRehearsed}
                                </p>
                            </div>
                        </div>

                        {/* Detailed Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-green-500/10 rounded-lg p-2 text-center border border-green-500/20">
                                <span className="block text-lg font-bold text-green-400">
                                    {sessionData.linesValidatedFirstTry || 0}
                                </span>
                                <span className="text-[10px] uppercase text-green-400/70 font-bold">Validées</span>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-2 text-center border border-red-500/20">
                                <span className="block text-lg font-bold text-red-400">
                                    {sessionData.linesWrong || 0}
                                </span>
                                <span className="text-[10px] uppercase text-red-400/70 font-bold">Erreurs</span>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/20">
                                <span className="block text-lg font-bold text-blue-400">
                                    {sessionData.linesSkipped || 0}
                                </span>
                                <span className="text-[10px] uppercase text-blue-400/70 font-bold">Passées</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">

                    {/* Star Rating */}
                    <div className="text-center">
                        <p className="text-sm text-foreground font-medium mb-3">
                            🌟 Note cette session
                        </p>
                        <div className="flex gap-1 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                                >
                                    <Star
                                        className={cn(
                                            "w-9 h-9 transition-colors",
                                            (hoverRating || rating) >= star
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-700"
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 h-4">
                            {rating === 1 && "😞 Pas top..."}
                            {rating === 2 && "😕 Bof"}
                            {rating === 3 && "😐 Correct"}
                            {rating === 4 && "😊 Bien !"}
                            {rating === 5 && "🤩 Génial !"}
                        </p>
                    </div>

                    {/* What worked - Repeto asks */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-foreground font-medium mb-2">
                            <span className="text-green-400">✓</span>
                            Qu'est-ce qui t'a plu ?
                        </label>
                        <textarea
                            value={whatWorked}
                            onChange={(e) => setWhatWorked(e.target.value)}
                            placeholder="La reconnaissance vocale, l'interface..."
                            className="w-full h-20 bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                        />
                    </div>

                    {/* What didn't work */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-foreground font-medium mb-2">
                            <span className="text-red-400">✗</span>
                            Un truc qui t'a gêné ?
                        </label>
                        <textarea
                            value={whatDidntWork}
                            onChange={(e) => setWhatDidntWork(e.target.value)}
                            placeholder="Bug, confusion, fonctionnalité manquante..."
                            className="w-full h-20 bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                        />
                    </div>

                    {/* Improvement ideas */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-foreground font-medium mb-2">
                            <span className="text-blue-400">💡</span>
                            Une idée d'amélioration ?
                            <span className="text-gray-600 font-normal">(optionnel)</span>
                        </label>
                        <textarea
                            value={improvementIdeas}
                            onChange={(e) => setImprovementIdeas(e.target.value)}
                            placeholder="Ce serait cool si..."
                            className="w-full h-16 bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">{error}</p>
                    )}

                    {/* Submit */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 rounded-xl text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Envoi...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Envoyer mon avis
                            </>
                        )}
                    </Button>

                    <p className="text-[10px] text-gray-600 text-center">
                        Remplis au moins un champ texte
                    </p>
                </div>
            </div>
        </div>
    );
}
