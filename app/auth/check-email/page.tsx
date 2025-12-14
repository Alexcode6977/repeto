import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground selection:bg-primary/30 font-sans">

            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">

                <div className="glass-card p-10 rounded-3xl border border-white/5 shadow-2xl">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <Mail className="w-10 h-10 text-primary" />
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight mb-4">Vérifiez vos emails</h1>

                    <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                        Un lien de connexion magique a été envoyé à votre adresse email. Cliquez dessus pour accéder à votre compte.
                    </p>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-muted-foreground/80">
                        <p>Pas reçu ? Vérifiez vos spams ou réessayez.</p>
                    </div>

                    <Link href="/login" className="inline-block mt-8">
                        <Button variant="ghost" className="text-muted-foreground hover:text-white hover:bg-white/5">
                            ← Retour à la connexion
                        </Button>
                    </Link>
                </div>

            </div>
        </div>
    );
}
