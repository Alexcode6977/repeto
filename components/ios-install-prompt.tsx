"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function IosInstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect iOS (iPhone or iPad)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        // Detect redundant standalone mode (app already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        // Check if user dismissed prompt previously
        const hasDismissed = localStorage.getItem("ios-prompt-dismissed");

        if (isIOS && !isStandalone && !hasDismissed) {
            // Wait a bit before showing to not be intrusive immediately
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        // Save dismissal with timestamp, maybe expire after 7 days
        localStorage.setItem("ios-prompt-dismissed", Date.now().toString());
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:hidden pb-[env(safe-area-inset-bottom,20px)]"
                >
                    <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                        {/* Close Button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 p-1 rounded-full bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                                <span className="text-xl">✨</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-foreground">Installer Repeto</h3>
                                <p className="text-sm text-muted-foreground leading-tight">
                                    Pour une meilleure expérience, ajoutez l'application à votre écran d'accueil.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-foreground/80">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                                    <span className="font-bold">1</span>
                                </div>
                                <span className="flex-1">Touchez le bouton <span className="font-bold inline-flex items-center gap-1">Partager <Share className="w-3 h-3" /></span></span>
                            </div>

                            <div className="w-[1px] h-3 bg-border ml-4" />

                            <div className="flex items-center gap-3 text-sm text-foreground/80">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500">
                                    <span className="font-bold">2</span>
                                </div>
                                <span className="flex-1">Sélectionnez <span className="font-bold inline-flex items-center gap-1">Sur l'écran d'accueil <PlusSquare className="w-3 h-3" /></span></span>
                            </div>
                        </div>

                        {/* Arrow pointing down specifically for Safari's bottom bar */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-background/80 rotate-45 border-r border-b border-white/10" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
