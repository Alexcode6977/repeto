import type {
    DashboardHeaderProps,
    DashboardViewportVariant,
} from "@/lib/features/dashboard/types";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { DashboardHeaderDesktop } from "./dashboard-header.desktop";
import { DashboardHeaderMobile } from "./dashboard-header.mobile";

interface ResponsiveDashboardHeaderProps extends DashboardHeaderProps {
    forceVariant?: DashboardViewportVariant;
}

export function DashboardHeader({
    forceVariant,
    ...props
}: ResponsiveDashboardHeaderProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const variant = forceVariant || (isDesktop ? "desktop" : "mobile");

    if (variant === "desktop") {
        return <DashboardHeaderDesktop {...props} />;
    }

    return <DashboardHeaderMobile {...props} />;
}
