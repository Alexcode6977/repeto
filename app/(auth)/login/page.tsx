import { login, signup } from "./actions";
import { Sparkles, ArrowRight } from "lucide-react";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <Sparkles className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                        Bienvenue sur Repeto
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Votre partenaire de répétition IA intelligent
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                    {message && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
                                placeholder="vous@exemple.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            {/* Login Button */}
                            <button
                                formAction={login}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                Se connecter
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Signup Button */}
                            <button
                                formAction={signup}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-3.5 rounded-xl transition-all border border-white/5 hover:border-white/10 text-xs uppercase tracking-wide"
                            >
                                Créer un compte
                            </button>
                        </div>
                    </form>
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-6">
                    En continuant, vous acceptez nos conditions d'utilisation.
                </p>
            </div>
        </div>
    );
}
