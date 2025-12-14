import { signup } from "../actions";
import { Sparkles, ArrowRight, Drama } from "lucide-react";
import Link from "next/link";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="min-h-screen w-full flex bg-background text-foreground font-sans overflow-hidden">

            {/* LEFT SIDE - FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative z-10 animate-in slide-in-from-left-8 duration-700 fade-in">

                <div className="w-full max-w-sm space-y-8">
                    {/* Header */}
                    <div className="text-center lg:text-left">
                        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                                <Sparkles className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">Repeto</span>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Rejoignez la troupe</h1>
                        <p className="text-muted-foreground text-sm">
                            Créez votre compte pour commencer à répéter.
                        </p>
                    </div>

                    {/* Messages */}
                    {message && (
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-in zoom-in-95">
                            <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-sm font-medium animate-in zoom-in-95">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-muted-foreground/50 font-medium"
                                placeholder="nom@exemple.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1" htmlFor="password">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-muted-foreground/50 font-medium"
                                placeholder="••••••••"
                            />
                            <p className="text-[10px] text-muted-foreground pl-1">
                                Au moins 8 caractères.
                            </p>
                        </div>

                        <button
                            formAction={signup}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2 group mt-6"
                        >
                            Créer mon compte
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-4 text-center text-sm text-muted-foreground">
                        Déjà un compte ?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Se connecter
                        </Link>
                    </div>
                </div>

                <div className="mt-auto pt-8 text-center text-xs text-muted-foreground/40">
                    &copy; {new Date().getFullYear()} Repeto. Protegé par reCAPTCHA.
                </div>
            </div>

            {/* RIGHT SIDE - CINEMATIC IMAGE */}
            <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden">
                {/* Background Image / Gradient */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black" />
                    {/* Different visual for signup - maybe a stage view */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503095392237-7362402049e5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay grayscale" />
                </div>

                {/* Overlay Content */}
                <div className="relative z-10 max-w-md text-center p-10 animate-in slide-in-from-right-8 duration-1000 delay-100 fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl skew-y-[-3deg] transform hover:skew-y-0 transition-all duration-500">
                        <Drama className="w-10 h-10 text-white/80" />
                    </div>
                    <blockquote className="text-2xl font-medium text-white/90 leading-relaxed italic mb-6">
                        "Agir, c'est être vivant."
                    </blockquote>
                    <cite className="text-white/50 not-italic font-medium uppercase tracking-widest text-sm">
                        — Émile Zola
                    </cite>
                </div>
            </div>

        </div>
    );
}
