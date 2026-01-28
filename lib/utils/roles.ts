/**
 * Check if a role has admin-level permissions
 * Admin-like roles: admin, adjoint, metteur_en_scene
 */
export function isAdminRole(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'adjoint' || role === 'metteur_en_scene';
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
        'admin': 'Admin',
        'adjoint': 'Adjoint',
        'metteur_en_scene': 'Metteur en scène',
        'member': 'Membre'
    };
    return roleNames[role] || 'Membre';
}

/**
 * Valid troupe member roles
 */
export type TroupeRole = 'admin' | 'adjoint' | 'metteur_en_scene' | 'member';
