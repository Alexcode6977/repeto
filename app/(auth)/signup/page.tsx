import { SignupForm } from "./signup-form";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AppleSignInButton } from "@/components/apple-sign-in-button";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string; next?: string }>;
}) {
    const { message, error, next } = await searchParams;

    return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start bg-background text-foreground font-sans p-4 relative overflow-y-auto">
            
            {/* Background Gradient - Simplified for mobile */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-900/5" />
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/10 blur-[100px] rounded-full opacity-50" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[100px] rounded-full opacity-50" />
            </div>

            <div className="w-full max-w-sm flex-1 flex flex-col justify-start relative z-10">
                {/* HEADER SECTION */}
                <div className="w-full flex-none flex flex-col items-center justify-center pt-10 pb-6 text-center">
                    <Link href="/" className="inline-flex items-center gap-3 mb-2 group justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-foreground tracking-tight">Repeto</span>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Rejoignez la troupe ! 🎭
                    </h1>
                </div>

                {/* FORM SECTION */}
                <div className="w-full flex flex-col gap-4">
                    <div className="space-y-3">
                        <GoogleSignInButton label="S'inscrire avec Google" requestedNext={next} />

                        <div className="relative pt-2 pb-1">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">ou</span>
                            </div>
                        </div>
                    </div>

                    <SignupForm message={message} error={error} requestedNext={next} />
                </div>

                <div className="flex-1" />

                {/* FOOTER SECTION */}
                <div className="w-full flex-none py-6 text-center">
                    <div className="text-sm text-muted-foreground">
                        Déjà un compte ?{" "}
                        <Link
                            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
                            className="text-primary font-semibold hover:text-primary/80 transition-colors"
                        >
                            Se connecter
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
