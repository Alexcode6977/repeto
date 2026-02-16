"use client";

import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Sparkles, ArrowRight, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const EMAIL_OTP_TYPES: EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
    if (!value) {
        return false;
    }

    return EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

function normalizeRecoveryError(message: string): string {
    if (message.toLowerCase().includes("code verifier")) {
        return "Ce lien doit être ouvert dans le meme navigateur que la demande. Demande un nouveau lien puis ouvre-le ici.";
    }

    return message;
}

function ResetPasswordPageContent() {
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const queryError = searchParams.get("error_description") ?? searchParams.get("error");
    const error = submitError ?? queryError;
    const message = submitMessage ?? searchParams.get("message");

    const ensureRecoverySession = async (): Promise<string | null> => {
        const supabase = createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (session) {
            return null;
        }

        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && isEmailOtpType(type)) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type,
            });

            if (verifyError) {
                return normalizeRecoveryError(verifyError.message);
            }
        } else if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                return normalizeRecoveryError(exchangeError.message);
            }
        } else {
            return "Lien de réinitialisation invalide ou expiré.";
        }

        const {
            data: { session: refreshedSession },
        } = await supabase.auth.getSession();

        if (!refreshedSession) {
            return "Session de réinitialisation introuvable. Demande un nouveau lien.";
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitMessage(null);

        if (password.length < 8) {
            setSubmitError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        if (password !== confirmPassword) {
            setSubmitError("Les mots de passe ne correspondent pas.");
            return;
        }

        setIsLoading(true);

        const recoveryError = await ensureRecoverySession();
        if (recoveryError) {
            setSubmitError(recoveryError);
            setIsLoading(false);
            return;
        }

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
            password,
        });

        if (updateError) {
            setSubmitError(normalizeRecoveryError(updateError.message));
            setIsLoading(false);
            return;
        }

        setSubmitMessage("Mot de passe mis à jour. Redirection...");
        window.location.assign("/dashboard");
    };

    return (
        <div className="dark min-h-screen w-full flex items-center justify-center bg-[#0a0a0f] text-foreground font-sans p-6 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-900/30" />
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/40 blur-[150px] rounded-full" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/40 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
            </div>

            <div className="w-full max-w-xl z-10 animate-in zoom-in-95 duration-500 fade-in">
                <div className="space-y-8 backdrop-blur-3xl bg-white/5 border border-white/10 p-6 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    <div className="text-center relative z-10">
                        <Link href="/" className="inline-flex items-center gap-3 mb-8 group justify-center hover:opacity-80 transition-opacity">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-white" />
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">Repeto</span>
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white drop-shadow-lg">
                            Nouveau mot de passe 🔒
                        </h1>
                        <p className="text-gray-300 text-base md:text-lg drop-shadow-md">
                            Choisissez un nouveau mot de passe sécurisé.
                        </p>
                    </div>

                    {message && (
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm md:text-base font-medium animate-in zoom-in-95 text-center">
                            <Sparkles className="w-5 h-5 inline-block mr-2 mb-1" />
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-base font-medium animate-in zoom-in-95 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="password">
                                Nouveau mot de passe
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-14 py-4 text-lg text-white
                                        focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-black/60
                                        hover:border-white/20 hover:bg-black/50
                                        transition-all duration-200 placeholder:text-muted-foreground/50 font-medium
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    disabled={isLoading}
                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="confirmPassword">
                                Confirmer le mot de passe
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-14 py-4 text-lg text-white
                                        focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-black/60
                                        hover:border-white/20 hover:bg-black/50
                                        transition-all duration-200 placeholder:text-muted-foreground/50 font-medium
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((value) => !value)}
                                    disabled={isLoading}
                                    aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90
                                text-white font-bold text-lg py-4 rounded-2xl
                                transition-all duration-300
                                shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                                active:scale-[0.98] hover:scale-[1.02]
                                flex items-center justify-center gap-2 group mt-8
                                disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Réinitialiser le mot de passe
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-4 text-center text-base text-muted-foreground relative z-10">
                        <Link href="/forgot-password" className="text-primary font-semibold hover:underline hover:text-primary/80 transition-colors">
                            Demander un nouveau lien
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-muted-foreground/40">
                    &copy; {new Date().getFullYear()} Repeto. Tous droits réservés.
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordPageContent />
        </Suspense>
    );
}
