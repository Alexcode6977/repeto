import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white selection:bg-emerald-500/30">

            {/* Background Ambience */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">

                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                    <Mail className="w-10 h-10 text-emerald-400" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight">Vérifiez vos emails</h1>

                <p className="text-gray-400 text-lg leading-relaxed">
                    Un lien de connexion magique a été envoyé à votre adresse email. Cliquez dessus pour accéder à votre compte.
                </p>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-500">
                    <p>Pas reçu ? Vérifiez vos spams ou réessayez.</p>
                </div>

                <Link href="/login">
                    <Button variant="ghost" className="text-gray-400 hover:text-white mt-8">
                        ← Retour à la connexion
                    </Button>
                </Link>

            </div>
        </div>
    );
}
