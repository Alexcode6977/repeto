/**
 * Valid troupe member roles
 */
export type TroupeRole = 'admin' | 'adjoint' | 'metteur_en_scene' | 'member';
const ROLE_ORDER: TroupeRole[] = ['admin', 'adjoint', 'metteur_en_scene', 'member'];

/**
 * Normalize a role set to avoid incoherent combinations.
 * Rules:
 * - Only known roles are kept.
 * - 'admin' and 'adjoint' cannot be combined (keep 'admin').
 */
export function normalizeMemberRoles(userRoles: string[] | null | undefined): TroupeRole[] {
    if (!userRoles || !Array.isArray(userRoles)) return [];

    const unique = Array.from(new Set(
        userRoles.filter((role): role is TroupeRole => ROLE_ORDER.includes(role as TroupeRole))
    ));

    // Admin and adjoint are mutually exclusive in the same role set.
    if (unique.includes('admin') && unique.includes('adjoint')) {
        const adjointIndex = unique.indexOf('adjoint');
        unique.splice(adjointIndex, 1);
    }

    return unique.sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userRoles: string[] | null | undefined, targetRole: TroupeRole): boolean {
    return normalizeMemberRoles(userRoles).includes(targetRole);
}

/**
 * Check if user can MANAGE the troupe
 * (Dashboard, Settings, Billing, Members)
 * Roles: Admin, Adjoint
 */
export function canManageTroupe(userRoles: string[] | null | undefined): boolean {
    const roles = normalizeMemberRoles(userRoles);
    return roles.includes('admin') || roles.includes('adjoint');
}

/**
 * Check if user can DIRECT the troupe
 * (Session workflow, Casting)
 * Roles: Metteur en scène
 */
export function canDirectTroupe(userRoles: string[] | null | undefined): boolean {
    const roles = normalizeMemberRoles(userRoles);
    return roles.includes('metteur_en_scene');
}

/**
 * Check if user can MANAGE CALENDAR
 * Roles: Admin, Adjoint, Metteur en scène
 */
export function canManageCalendar(userRoles: string[] | null | undefined): boolean {
    return canManageTroupe(userRoles) || canDirectTroupe(userRoles);
}

/**
 * Check if user can MANAGE SESSIONS
 * (Preparation, Live controls, Processing, Feedback workflow)
 * Roles: Metteur en scène
 */
export function canManageSessions(userRoles: string[] | null | undefined): boolean {
    return canDirectTroupe(userRoles);
}

/**
 * Check if user can ACCESS SCRIPTS & LIVE SESSIONS
 * Roles: Member OR Metteur en scène
 * (Admin/Adjoint need 'member' or 'metteur_en_scene' to access this scope)
 */
export function canAccessArtisticContent(userRoles: string[] | null | undefined): boolean {
    const roles = normalizeMemberRoles(userRoles);
    return roles.includes('member') || roles.includes('metteur_en_scene');
}

/**
 * Check if user can MANAGE CONTENT (plays, casting, annotations)
 * Roles: Metteur en scène
 */
export function canManageContent(userRoles: string[] | null | undefined): boolean {
    return canDirectTroupe(userRoles);
}

/**
 * Check if user can VIEW sessions pages
 * - Session management access (metteur) OR
 * - Artistic member access.
 */
export function canViewSessions(userRoles: string[] | null | undefined): boolean {
    return canManageSessions(userRoles) || canAccessArtisticContent(userRoles);
}

/**
 * Get display names for roles
 */
export function getRoleLabels(roles: string[]): string {
    const normalizedRoles = normalizeMemberRoles(roles);
    if (normalizedRoles.length === 0) return 'Membre';

    const roleNames: Record<string, string> = {
        'admin': 'Admin',
        'adjoint': 'Adjoint',
        'metteur_en_scene': 'Metteur en scène',
        'member': 'Membre'
    };

    return normalizedRoles.map(r => roleNames[r] || r).join(', ');
}
