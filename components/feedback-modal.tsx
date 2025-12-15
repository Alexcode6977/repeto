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
        characterName: string;
        durationSeconds: number;
        linesRehearsed: number;
        completionPercentage: number;
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
            setError("Veuillez donner une note et remplir au moins un champ de feedback.");
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
            setError("Erreur lors de l'envoi. Réessayez.");
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Votre avis compte ! 🎭</h2>
                            <p className="text-sm text-gray-400 mt-1">Aidez-nous à améliorer Repeto</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                            disabled={isSubmitting}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Session Summary */}
                    <div className="mt-4 p-3 bg-white/5 rounded-xl flex flex-wrap gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Script:</span>
                            <span className="text-white ml-2 font-medium">{sessionData.scriptTitle}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Rôle:</span>
                            <span className="text-yellow-400 ml-2 font-medium">{sessionData.characterName}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Durée:</span>
                            <span className="text-white ml-2">{formatDuration(sessionData.durationSeconds)}</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Star Rating */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-3">
                            Note générale de la session *
                        </label>
                        <div className="flex gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                                >
                                    <Star
                                        className={cn(
                                            "w-10 h-10 transition-colors",
                                            (hoverRating || rating) >= star
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-600"
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-2">
                            {rating === 0 && "Cliquez pour noter"}
                            {rating === 1 && "Très insatisfait 😞"}
                            {rating === 2 && "Insatisfait 😕"}
                            {rating === 3 && "Neutre 😐"}
                            {rating === 4 && "Satisfait 😊"}
                            {rating === 5 && "Très satisfait 🤩"}
                        </p>
                    </div>

                    {/* What worked */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Qu'est-ce qui a bien fonctionné ? *
                        </label>
                        <textarea
                            value={whatWorked}
                            onChange={(e) => setWhatWorked(e.target.value)}
                            placeholder="Ex: La reconnaissance vocale était précise, l'interface est intuitive..."
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    {/* What didn't work */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Qu'est-ce qui n'a pas fonctionné ? *
                        </label>
                        <textarea
                            value={whatDidntWork}
                            onChange={(e) => setWhatDidntWork(e.target.value)}
                            placeholder="Ex: Bug rencontré, fonctionnalité manquante, confusion..."
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    {/* Improvement ideas */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Idées d'amélioration (optionnel)
                        </label>
                        <textarea
                            value={improvementIdeas}
                            onChange={(e) => setImprovementIdeas(e.target.value)}
                            placeholder="Ex: Ajouter un mode sombre, possibilité de partager..."
                            className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    {/* Submit */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl text-lg disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Send className="w-5 h-5 mr-2" />
                        )}
                        Envoyer mon feedback
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                        * Champs obligatoires (au moins un des deux)
                    </p>
                </div>
            </div>
        </div>
    );
}
