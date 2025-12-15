import { login } from "../actions";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground font-sans p-6 overflow-hidden relative">

            {/* Background Ambient Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full opacity-40 mix-blend-screen" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full opacity-40 mix-blend-screen" />
            </div>

            {/* MAIN FORM CONTAINER - Centered & Big */}
            <div className="w-full max-w-xl z-10 animate-in zoom-in-95 duration-500 fade-in">

                <div className="space-y-8 backdrop-blur-3xl bg-white/5 border border-white/10 p-6 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="text-center relative z-10">
                        <Link href="/" className="inline-flex items-center gap-2 mb-8 group justify-center">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                            </div>
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">Bon retour</h1>
                        <p className="text-muted-foreground text-base md:text-lg">
                            Entrez vos identifiants pour accéder à votre espace.
                        </p>
                    </div>

                    {/* Messages */}
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

                    {/* Form */}
                    <form className="space-y-6 relative z-10">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-muted-foreground/50 font-medium"
                                placeholder="nom@exemple.com"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="password">
                                    Mot de passe
                                </label>
                                <Link href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                    Oublié ?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-muted-foreground/50 font-medium"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            formAction={login}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2 group mt-8"
                        >
                            Se connecter
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-6 text-center text-base text-muted-foreground relative z-10">
                        Pas encore de compte ?{" "}
                        <Link href="/signup" className="text-primary font-semibold hover:underline">
                            Créer un compte
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
