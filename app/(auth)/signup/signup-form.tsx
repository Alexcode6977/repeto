"use client";

import { signup } from "../actions";
import { PasswordInput } from "@/components/password-input";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { PostAuthDestinationInput } from "@/components/post-auth-destination-input";

interface SignupFormProps {
    message?: string;
    error?: string;
    requestedNext?: string | null;
}

export function SignupForm({ message: initialMessage, error: initialError, requestedNext }: SignupFormProps) {
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
        <div className="w-full max-w-sm flex flex-col justify-center relative z-10 gap-3">
            
            {/* Messages Area */}
            {(initialMessage || displayError) && (
                <div className={initialMessage && !displayError ?
                    "p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium text-center" :
                    "p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm font-medium text-center"
                }>
                    {initialMessage && !displayError && <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />}
                    {displayError || initialMessage}
                </div>
            )}

            <form action={handleSubmit} className="space-y-3 w-full">
                <PostAuthDestinationInput requestedNext={requestedNext} />
                <div>
                    <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="w-full bg-muted/50 border border-input rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background placeholder:text-muted-foreground transition-all shadow-sm"
                        placeholder="Prénom (ex: Jean)"
                    />
                </div>
                <div>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full bg-muted/50 border border-input rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background placeholder:text-muted-foreground transition-all shadow-sm"
                        placeholder="Email (nom@exemple.com)"
                    />
                </div>
                <div>
                    <PasswordInput
                        id="password"
                        name="password"
                        required
                        minLength={6}
                        placeholder="Mot de passe"
                        className="bg-muted/50 border-input rounded-xl px-4 py-2.5 text-base text-foreground focus:bg-background shadow-sm"
                    />
                </div>
                <div>
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        required
                        minLength={6}
                        placeholder="Confirmer le mot de passe"
                        className="bg-muted/50 border-input rounded-xl px-4 py-2.5 text-base text-foreground focus:bg-background shadow-sm"
                    />
                </div>

                <div className="pt-2">
                    <AuthSubmitButton
                        text="Créer mon compte"
                    />
                </div>
            </form>
        </div>
    );
}
