/**
 * Valid troupe member roles
 */
export type TroupeRole = 'admin' | 'adjoint' | 'metteur_en_scene' | 'member';

/**
 * Check if a user has a specific role
 */
export function hasRole(userRoles: string[] | null | undefined, targetRole: TroupeRole): boolean {
    if (!userRoles || !Array.isArray(userRoles)) return false;
    return userRoles.includes(targetRole);
}

/**
 * Check if user can MANAGE the troupe
 * (Dashboard, Settings, Billing, Members)
 * Roles: Admin, Adjoint
 */
export function canManageTroupe(userRoles: string[] | null | undefined): boolean {
    if (!userRoles) return false;
    return hasRole(userRoles, 'admin') || hasRole(userRoles, 'adjoint');
}

/**
 * Check if user can DIRECT the troupe
 * (Preparation Seance, Casting)
 * Roles: Metteur en scène
 */
export function canDirectTroupe(userRoles: string[] | null | undefined): boolean {
    if (!userRoles) return false;
    return hasRole(userRoles, 'metteur_en_scene');
}

/**
 * Check if user can MANAGE CALENDAR
 * Roles: Admin, Adjoint, Metteur en scène
 */
export function canManageCalendar(userRoles: string[] | null | undefined): boolean {
    if (!userRoles) return false;
    return canManageTroupe(userRoles) || canDirectTroupe(userRoles);
}

/**
 * Check if user can ACCESS SCRIPTS & LIVE SESSIONS
 * Roles: Member OR Metteur en scène
 * (Admins must add 'member' role to see this)
 */
export function canAccessArtisticContent(userRoles: string[] | null | undefined): boolean {
    if (!userRoles) return false;
    // Metteur en scène needs access to scripts to direct
    return hasRole(userRoles, 'member') || hasRole(userRoles, 'metteur_en_scene');
}

/**
 * Check if user can MANAGE CONTENT (plays, casting, annotations)
 * Roles: Admin OR Metteur en scène
 */
export function canManageContent(userRoles: string[] | null | undefined): boolean {
    if (!userRoles) return false;
    return hasRole(userRoles, 'admin') || hasRole(userRoles, 'metteur_en_scene');
}

/**
 * Get display names for roles
 */
export function getRoleLabels(roles: string[]): string {
    if (!roles || roles.length === 0) return 'Membre';

    const roleNames: Record<string, string> = {
        'admin': 'Admin',
        'adjoint': 'Adjoint',
        'metteur_en_scene': 'Metteur en scène',
        'member': 'Membre'
    };

    // Sort to have Admin first if present
    const sortedRoles = [...roles].sort((a, b) => {
        const order = ['admin', 'adjoint', 'metteur_en_scene', 'member'];
        return order.indexOf(a) - order.indexOf(b);
    });

    return sortedRoles.map(r => roleNames[r] || r).join(', ');
}
