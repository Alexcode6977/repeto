import { login, signup } from "./actions";
import { Drama, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { message, error } = await searchParams;

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-[#0a0505] text-[#f4e4bc] selection:bg-[#c02424]/30 font-serif relative overflow-hidden">

            {/* Ambient Lighting */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#c02424]/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#d4af37]/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">

                <div className="text-center mb-10">
                    <Link href="/" className="inline-block relative group">
                        <div className="w-16 h-16 bg-[#c02424] border-2 border-[#d4af37] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(192,36,36,0.3)] group-hover:scale-105 transition-transform duration-300">
                            <Drama className="h-8 w-8 text-[#fff5d6]" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-medium tracking-tight text-[#fff5d6]">
                        Entrez en scène
                    </h1>
                    <p className="text-[#d4af37]/70 text-base mt-3 font-light italic">
                        Votre loge virtuelle vous attend.
                    </p>
                </div>

                <div className="bg-[#1a0505]/80 backdrop-blur-md border border-[#d4af37]/20 rounded-sm p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative">
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#d4af37]/50" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#d4af37]/50" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#d4af37]/50" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#d4af37]/50" />

                    {message && (
                        <div className="mb-6 p-4 bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-sm text-center font-sans tracking-wide">
                            <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5" />
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mb-6 p-4 bg-[#c02424]/10 border border-[#c02424]/30 text-[#ff8080] text-sm text-center font-sans tracking-wide">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#d4af37] uppercase tracking-widest pl-1 font-sans">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-[#0a0505]/50 border-b border-[#d4af37]/30 focus:border-[#d4af37] text-[#fff5d6] px-4 py-3 outline-none transition-colors placeholder:text-[#d4af37]/20 font-sans"
                                placeholder="acteur@theatre.fr"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#d4af37] uppercase tracking-widest pl-1 font-sans">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-[#0a0505]/50 border-b border-[#d4af37]/30 focus:border-[#d4af37] text-[#fff5d6] px-4 py-3 outline-none transition-colors placeholder:text-[#d4af37]/20 font-sans"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-6 flex flex-col gap-4">
                            {/* Login Button */}
                            <button
                                formAction={login}
                                className="w-full bg-[#c02424] hover:bg-[#a01e1e] text-[#fff5d6] font-bold py-4 transition-all shadow-[0_4px_20px_rgba(192,36,36,0.3)] active:scale-[0.99] flex items-center justify-center gap-3 group font-sans uppercase tracking-widest text-sm"
                            >
                                Ouvrir le rideau
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {/* Signup Button */}
                            <button
                                formAction={signup}
                                className="w-full bg-transparent hover:bg-[#fff5d6]/5 text-[#d4af37]/60 hover:text-[#d4af37] font-medium py-3 transition-colors text-xs uppercase tracking-widest font-sans"
                            >
                                Première visite ? Créer un compte
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
