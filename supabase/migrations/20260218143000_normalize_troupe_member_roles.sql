-- Normalize existing troupe member role arrays and enforce guard rails.
-- Business rules:
-- - Allowed roles: admin, adjoint, metteur_en_scene, member
-- - At least one role is required
-- - admin and adjoint cannot coexist in the same role set
-- - admin+member and adjoint+member are allowed

-- 1) Normalize existing rows
WITH normalized AS (
    SELECT
        tm.ctid AS row_id,
        COALESCE(
            ARRAY(
                SELECT r
                FROM unnest(COALESCE(tm.roles, ARRAY[]::text[])) AS r
                WHERE r = ANY (ARRAY['admin', 'adjoint', 'metteur_en_scene', 'member'])
                GROUP BY r
                ORDER BY MIN(CASE r
                    WHEN 'admin' THEN 1
                    WHEN 'adjoint' THEN 2
                    WHEN 'metteur_en_scene' THEN 3
                    WHEN 'member' THEN 4
                    ELSE 999
                END)
            ),
            ARRAY[]::text[]
        ) AS cleaned_roles
    FROM public.troupe_members tm
),
resolved AS (
    SELECT
        n.row_id,
        CASE
            WHEN cardinality(n.cleaned_roles) = 0 THEN ARRAY['member']::text[]
            WHEN n.cleaned_roles @> ARRAY['admin']::text[]
             AND n.cleaned_roles @> ARRAY['adjoint']::text[]
                THEN array_remove(n.cleaned_roles, 'adjoint')
            ELSE n.cleaned_roles
        END AS final_roles
    FROM normalized n
)
UPDATE public.troupe_members tm
SET roles = r.final_roles
FROM resolved r
WHERE tm.ctid = r.row_id
  AND tm.roles IS DISTINCT FROM r.final_roles;

-- 2) Enforce stable constraints for future writes
ALTER TABLE public.troupe_members
ALTER COLUMN roles SET DEFAULT ARRAY['member']::text[],
ALTER COLUMN roles SET NOT NULL;

ALTER TABLE public.troupe_members
DROP CONSTRAINT IF EXISTS troupe_members_roles_valid_check;

ALTER TABLE public.troupe_members
ADD CONSTRAINT troupe_members_roles_valid_check
CHECK (
    cardinality(roles) > 0
    AND roles <@ ARRAY['admin', 'adjoint', 'metteur_en_scene', 'member']::text[]
    AND NOT (roles @> ARRAY['admin']::text[] AND roles @> ARRAY['adjoint']::text[])
);
