"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { CastingStudioDesktop } from "@/components/casting-studio.desktop";
import { CastingStudioMobile } from "@/components/casting-studio.mobile";
import type { CastingStudioProps } from "@/components/casting-studio.types";
import { useCastingStudio } from "@/components/use-casting-studio";

export function CastingStudio(props: CastingStudioProps) {
    const studio = useCastingStudio(props);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return isDesktop ? (
        <CastingStudioDesktop {...studio} />
    ) : (
        <CastingStudioMobile {...studio} />
    );
}
