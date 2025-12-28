import { signup } from "../actions";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="dark min-h-screen w-full flex items-center justify-center bg-[#0a0a0f] text-foreground font-sans p-6 overflow-hidden relative">

            {/* Background Gradient - Plus marqué */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-900/30" />
                {/* Glowing orbs */}
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/40 blur-[150px] rounded-full" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/40 blur-[150px] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-teal-500/20 blur-[120px] rounded-full" />
                {/* Subtle noise texture overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
            </div>

            {/* MAIN FORM CONTAINER */}
            <div className="w-full max-w-xl z-10 animate-in zoom-in-95 duration-500 fade-in">

                <div className="space-y-8 backdrop-blur-3xl bg-white/5 border border-white/10 p-6 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {/* Header avec logo cliquable */}
                    <div className="text-center relative z-10">
                        <Link href="/" className="inline-flex items-center gap-3 mb-8 group justify-center hover:opacity-80 transition-opacity">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-white" />
                            </div>
                            <span className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">Repeto</span>
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white drop-shadow-lg">
                            Rejoignez la troupe ! 🎭
                        </h1>
                        <p className="text-gray-300 text-base md:text-lg drop-shadow-md">
                            Créez votre compte pour commencer à répéter.
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

                    {/* Form avec meilleurs focus states */}
                    <form className="space-y-5 relative z-10">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider pl-1" htmlFor="firstName">
                                Prénom
                            </label>
                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white 
                                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-black/60
                                    hover:border-white/20 hover:bg-black/50
                                    transition-all duration-200 placeholder:text-gray-500 font-medium"
                                placeholder="Jean"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider pl-1" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white 
                                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-black/60
                                    hover:border-white/20 hover:bg-black/50
                                    transition-all duration-200 placeholder:text-gray-500 font-medium"
                                placeholder="nom@exemple.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider pl-1" htmlFor="password">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg text-white 
                                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-black/60
                                    hover:border-white/20 hover:bg-black/50
                                    transition-all duration-200 placeholder:text-gray-500 font-medium"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-gray-500 pl-1">
                                Au moins 6 caractères.
                            </p>
                        </div>

                        <button
                            formAction={signup}
                            className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 
                                text-white font-bold text-lg py-4 rounded-2xl 
                                transition-all duration-300 
                                shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                                active:scale-[0.98] hover:scale-[1.02]
                                flex items-center justify-center gap-2 group mt-8"
                        >
                            Créer mon compte
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-4 text-center text-base text-gray-400 relative z-10">
                        Déjà un compte ?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline hover:text-primary/80 transition-colors">
                            Se connecter
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                    &copy; {new Date().getFullYear()} Repeto. Tous droits réservés.
                </div>
            </div>

        </div>
    );
}
