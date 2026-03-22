"use client";

import Link from "next/link";
import { Plus, X as CloseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function TroupeActions() {
    return (
        <div className="flex w-full gap-2 md:gap-3 mt-2 mb-6 items-center">
            <Button asChild className="flex-1 w-full bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 h-[38px] rounded-xl px-4 text-[13px] font-bold shadow-none">
                <Link href="/troupes/join">Rejoindre</Link>
            </Button>
            <Button asChild className="flex-1 w-full bg-[#7F77DD] text-white hover:bg-[#7F77DD]/90 h-[38px] rounded-xl px-4 text-[13px] font-bold shadow-none">
                <Link href="/troupes/create">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Créer
                </Link>
            </Button>
            
            <Sheet>
                <SheetTrigger asChild>
                    <button className="flex-1 w-full h-[38px] flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-colors shadow-none">
                        ?
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh] h-[85vh] bg-gray-50 p-0 flex flex-col outline-none sm:max-w-md sm:mx-auto shadow-2xl">
                    <SheetHeader className="text-left bg-white px-6 pt-5 pb-4 border-b border-black/[0.04] sticky top-0 z-10 shrink-0 relative">
                        <SheetTitle className="text-xl font-bold text-[#1a1a1a]">Découvrez les troupes</SheetTitle>
                        <SheetDescription className="text-sm text-gray-500 mt-1">
                            Tout ce que vous pouvez faire ensemble
                        </SheetDescription>
                        <SheetClose className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <CloseIcon className="w-5 h-5 text-gray-400" />
                        </SheetClose>
                    </SheetHeader>
                    
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        {/* Section 1 */}
                        <div>
                            <div className="text-[10px] uppercase text-gray-400 tracking-[1.5px] font-bold mb-[12px]">
                                Comment ça marche
                            </div>
                            <div className="space-y-4 bg-white p-5 rounded-2xl border border-black/[0.03] shadow-sm">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">1</div>
                                    <div className="flex-1 pt-1">
                                        <div className="text-[14px] font-bold text-[#1a1a1a]">Créez ou rejoignez</div>
                                        <div className="text-[12px] text-gray-500 leading-relaxed mt-1">
                                            Créez votre troupe et partagez le code d&apos;invitation, ou entrez un code pour rejoindre une troupe existante.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">2</div>
                                    <div className="flex-1 pt-1">
                                        <div className="text-[14px] font-bold text-[#1a1a1a]">Partagez vos textes</div>
                                        <div className="text-[12px] text-gray-500 leading-relaxed mt-1">
                                            Le metteur en scène importe les pièces et distribue les rôles à chaque membre.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#EEEDFE] text-[#7F77DD] flex items-center justify-center text-[13px] font-bold">3</div>
                                    <div className="flex-1 pt-1">
                                        <div className="text-[14px] font-bold text-[#1a1a1a]">Répétez à votre rythme</div>
                                        <div className="text-[12px] text-gray-500 leading-relaxed mt-1">
                                            Chacun travaille ses répliques sur son téléphone, où et quand il veut.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <div className="text-[10px] uppercase text-gray-400 tracking-[1.5px] font-bold mb-[12px]">
                                Ce que vous pouvez faire
                            </div>
                            <div className="space-y-0.5 bg-white rounded-2xl border border-black/[0.03] shadow-sm overflow-hidden">
                                {[
                                    { icon: "📅", title: "Organisez vos répétitions", desc: "Planifiez les séances et partagez le calendrier avec toute la troupe." },
                                    { icon: "💬", title: "Recevez du feedback", desc: "Le metteur en scène vous envoie ses retours et notes après chaque session." },
                                    { icon: "✏️", title: "Annotez votre texte", desc: "Ajoutez des notes personnelles à vos répliques pour votre personnage." },
                                    { icon: "🎬", title: "Indications de mise en scène", desc: "Recevez les indications de jeu et de placement de votre metteur en scène." },
                                    { icon: "🎧", title: "Écoutez avec les vraies voix", desc: "Écoutez votre pièce lue avec les voix de vos partenaires." },
                                ].map((feature, i) => (
                                    <div key={i} className={`flex gap-4 items-center p-4 bg-white ${i !== 4 ? "border-b border-gray-100" : ""}`}>
                                        <div className="flex-shrink-0 w-[32px] h-[32px] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[16px]">
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-bold text-[#1a1a1a]">{feature.title}</div>
                                            <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{feature.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white/90 backdrop-blur-md border-t border-black/[0.04] sticky bottom-0 z-10 shrink-0 pb-8 sm:pb-4">
                        <SheetClose asChild>
                            <Button className="w-full bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white font-bold py-[14px] h-auto rounded-xl text-[15px] shadow-sm transition-all focus:scale-[0.98]">
                                C&apos;est parti !
                            </Button>
                        </SheetClose>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
