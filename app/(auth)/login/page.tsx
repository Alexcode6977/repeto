import { login } from "../actions";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { PostAuthDestinationInput } from "@/components/post-auth-destination-input";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string; next?: string }>;
}) {
    const { message, error, next } = await searchParams;

    return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start bg-background text-foreground font-sans p-4 relative overflow-y-auto">
            
            {/* Background Gradient - Simplified for mobile light theme */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-900/5" />
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/10 blur-[100px] rounded-full opacity-50" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[100px] rounded-full opacity-50" />
            </div>

            <div className="w-full max-w-sm flex-1 flex flex-col justify-start relative z-10">
                {/* HEADER SECTION */}
                <div className="w-full flex-none flex flex-col items-center justify-center pt-10 pb-6">
                    <Link href="/" className="inline-flex items-center gap-3 mb-2 group justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-foreground tracking-tight">Repeto</span>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">
                        Bon retour ! 🎭
                    </h1>
                </div>

                {/* FORM SECTION */}
                <div className="w-full flex flex-col gap-4">
                    
                    {/* Messages Area */}
                    {(message || error) && (
                        <div className={message ?
                            "p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium text-center" :
                            "p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-red-500 text-sm font-medium text-center"
                        }>
                            {message && <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />}
                            {message || error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <GoogleSignInButton label="Se connecter avec Google" requestedNext={next} />
                        
                        <div className="relative pt-2 pb-1">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">ou</span>
                            </div>
                        </div>
                    </div>

                    <form className="space-y-3 w-full">
                        <PostAuthDestinationInput requestedNext={next} />
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
                        <div className="space-y-2">
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                placeholder="Mot de passe"
                                className="bg-muted/50 border-input rounded-xl px-4 py-2.5 text-base text-foreground focus:bg-background shadow-sm"
                            />
                            <div className="flex justify-end items-center px-1">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                        </div>

                        <div className="pt-2">
                            <AuthSubmitButton
                                formAction={login}
                                text="Se connecter"
                            />
                        </div>
                    </form>
                </div>

                <div className="flex-1" /> {/* Spacer */}

                {/* FOOTER SECTION */}
                <div className="w-full flex-none py-6 text-center">
                    <div className="text-sm text-muted-foreground">
                        Pas encore de compte ?{" "}
                        <Link
                            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
                            className="text-primary font-semibold hover:text-primary/80 transition-colors"
                        >
                            Créer un compte
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
