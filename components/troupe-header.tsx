"use client";

import type { TroupeHeaderRendererProps } from "@/components/header-renderer.types";
import { TroupeHeaderDesktop } from "@/components/troupe-header.desktop";
import { TroupeHeaderMobile } from "@/components/troupe-header.mobile";

export function TroupeHeader({ troupeName, displayName, isAdminUser }: TroupeHeaderRendererProps) {
    return (
        <header 
            className="fixed top-0 left-0 z-[60] w-full border-b border-border/20 bg-background/60 backdrop-blur-2xl transition-all duration-200"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="relative flex h-20 items-center justify-between px-4 md:px-8 w-full">
                <TroupeHeaderMobile
                    displayName={displayName}
                    isAdminUser={isAdminUser}
                />
                <TroupeHeaderDesktop
                    troupeName={troupeName}
                    displayName={displayName}
                    isAdminUser={isAdminUser}
                />
            </div>
        </header>
    );
}
