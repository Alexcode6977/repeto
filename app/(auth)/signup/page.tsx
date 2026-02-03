import { SignupForm } from "./signup-form";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="dark min-h-[100dvh] w-full flex flex-col items-center justify-between bg-[#0a0a0f] text-foreground font-sans p-4 relative overflow-hidden">

            {/* Background Gradient - Simplified for mobile */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-900/20" />
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/20 blur-[100px] rounded-full opacity-50" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/20 blur-[100px] rounded-full opacity-50" />
            </div>

            {/* HEADER SECTION (Top 20%) */}
            <div className="w-full flex-none flex flex-col items-center justify-center pt-8 pb-4 relative z-10">
                <Link href="/" className="inline-flex items-center gap-3 mb-4 group justify-center">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Repeto</span>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-white text-center">
                    Rejoignez la troupe ! 🎭
                </h1>
            </div>

            {/* FORM SECTION (Middle ~60-70%) */}
            <div className="w-full max-w-sm flex-1 flex flex-col justify-center relative z-10 gap-4">

                <div className="space-y-4">
                    <GoogleSignInButton label="S'inscrire avec Google" />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0a0a0f] px-2 text-muted-foreground">ou</span>
                        </div>
                    </div>
                </div>

                <SignupForm message={message} error={error} />
            </div>

            {/* FOOTER SECTION (Bottom ~10%) */}
            <div className="w-full flex-none pb-6 text-center z-10">
                <div className="text-sm text-muted-foreground">
                    Déjà un compte ?{" "}
                    <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                        Se connecter
                    </Link>
                </div>
            </div>

        </div>
    );
}
