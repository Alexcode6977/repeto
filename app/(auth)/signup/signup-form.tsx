"use client";

import { signup } from "../actions";
import { PasswordInput } from "@/components/password-input";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface SignupFormProps {
    message?: string;
    error?: string;
}

export function SignupForm({ message: initialMessage, error: initialError }: SignupFormProps) {
    const [clientError, setClientError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setClientError(null);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setClientError("Les mots de passe ne correspondent pas.");
            return;
        }

        // Call the server action
        await signup(formData);
    };

    const displayError = clientError || initialError;

    return (
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center relative z-10 gap-4">

            {/* Messages Area */}
            {(initialMessage || displayError) && (
                <div className={initialMessage && !displayError ?
                    "p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium text-center" :
                    "p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-sm font-medium text-center"
                }>
                    {initialMessage && !displayError && <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />}
                    {displayError || initialMessage}
                </div>
            )}

            <form action={handleSubmit} className="space-y-3 w-full">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="firstName">
                        Prénom
                    </label>
                    <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white 
                            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white/10
                            placeholder:text-muted-foreground/50 font-medium transition-all"
                        placeholder="Jean"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white 
                            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white/10
                            placeholder:text-muted-foreground/50 font-medium transition-all"
                        placeholder="nom@exemple.com"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="password">
                        Mot de passe
                    </label>
                    <PasswordInput
                        id="password"
                        name="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 rounded-xl px-4 py-3 text-base"
                    />
                    <p className="text-[10px] text-muted-foreground pl-1">
                        Min. 6 caractères.
                    </p>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="confirmPassword">
                        Confirmer le mot de passe
                    </label>
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 rounded-xl px-4 py-3 text-base"
                    />
                </div>

                <AuthSubmitButton
                    text="Créer mon compte"
                />
            </form>
        </div>
    );
}
