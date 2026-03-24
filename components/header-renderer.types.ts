export interface HeaderRendererProps {
    displayName: string;
    isAdmin: boolean;
    avatarUrl?: string | null;
    initials?: string;
    pathname: string;
}

export interface TroupeHeaderRendererProps {
    troupeName: string;
    displayName: string;
    isAdminUser: boolean;
}
