import { getTroupeDetails } from "@/lib/actions/troupe";
import { redirect } from "next/navigation";
import { TroupeSidebar } from "@/components/troupe-sidebar";
import { TroupeMobileNav } from "@/components/troupe-mobile-nav";

export default async function TroupeLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);

    if (!troupe) {
        redirect('/troupes');
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Sidebar - Visible on Desktop */}
            <div className="hidden md:block">
                <TroupeSidebar troupeId={troupeId} role={troupe.my_role as any} />
            </div>

            {/* Mobile Navigation - Visible on Mobile */}
            <TroupeMobileNav troupeId={troupeId} />

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
