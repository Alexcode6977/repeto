"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { DashboardLoadingDesktop } from "@/app/(protected)/dashboard/dashboard-loading.desktop";
import { DashboardLoadingMobile } from "@/app/(protected)/dashboard/dashboard-loading.mobile";

export default function DashboardLoading() {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return isDesktop ? <DashboardLoadingDesktop /> : <DashboardLoadingMobile />;
}
