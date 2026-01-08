import { login } from "../actions";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";

export default async function LoginPage({
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

            {/* HEADER SECTION (Top 20-25%) */}
            <div className="w-full flex-none flex flex-col items-center justify-center pt-8 pb-4 relative z-10">
                <Link href="/" className="inline-flex items-center gap-3 mb-4 group justify-center">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Repeto</span>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-white text-center">
                    Bon retour ! 🎭
                </h1>
            </div>

            {/* FORM SECTION (Middle ~60%) */}
            <div className="w-full max-w-sm flex-1 flex flex-col justify-center relative z-10 gap-6">

                {/* Messages Area */}
                {(message || error) && (
                    <div className={message ?
                        "p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium text-center" :
                        "p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-sm font-medium text-center"
                    }>
                        {message && <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />}
                        {message || error}
                    </div>
                )}

                <form className="space-y-4 w-full">
                    <div className="space-y-1.5">
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
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="password">
                                Mot de passe
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-muted-foreground/60 hover:text-white transition-colors"
                            >
                                Oublié ?
                            </Link>
                        </div>
                        <PasswordInput
                            id="password"
                            name="password"
                            required
                            placeholder="••••••••"
                            className="bg-white/5 border-white/10 rounded-xl px-4 py-3 text-base"
                        />
                    </div>

                    {/* Action Button embedded in form flow or purely sticky? 
                        Keeping it here for now but ensuring it's easily reachable */}
                    <button
                        formAction={login}
                        className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 
                            text-white font-bold text-base py-3.5 rounded-xl 
                            transition-all duration-300 
                            shadow-lg shadow-primary/20
                            active:scale-[0.98] 
                            flex items-center justify-center gap-2 mt-4"
                    >
                        Se connecter
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </form>
            </div>

            {/* FOOTER SECTION (Bottom ~15%) */}
            <div className="w-full flex-none pb-6 text-center z-10">
                <div className="text-sm text-muted-foreground">
                    Pas encore de compte ?{" "}
                    <Link href="/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                        Créer un compte
                    </Link>
                </div>
            </div>

        </div>
    );
}
