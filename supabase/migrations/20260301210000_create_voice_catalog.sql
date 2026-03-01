-- Create the AI Voice Catalog table
CREATE TABLE IF NOT EXISTS public.voice_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_id TEXT NOT NULL UNIQUE, -- e.g., 'Achernar' (fr-FR-Chirp3-HD-xxx)
    target_role TEXT, -- e.g., 'principal', 'secondaire', 'didascalies', 'polyvalent'
    
    -- Les 10 critères de ton tableau (Valeurs numériques requises entre 1 et 4 pour la formule mathématique)
    score_genre SMALLINT NOT NULL CHECK (score_genre BETWEEN 1 AND 4),
    score_age SMALLINT NOT NULL CHECK (score_age BETWEEN 1 AND 4),
    score_tonalite SMALLINT NOT NULL CHECK (score_tonalite BETWEEN 1 AND 4),
    score_comedien SMALLINT NOT NULL CHECK (score_comedien BETWEEN 1 AND 4),
    score_didascalie SMALLINT NOT NULL CHECK (score_didascalie BETWEEN 1 AND 4),
    score_projection SMALLINT NOT NULL CHECK (score_projection BETWEEN 1 AND 4),
    score_vitesse SMALLINT NOT NULL CHECK (score_vitesse BETWEEN 1 AND 4),
    score_texture SMALLINT NOT NULL CHECK (score_texture BETWEEN 1 AND 4),
    score_temperature SMALLINT NOT NULL CHECK (score_temperature BETWEEN 1 AND 4),
    score_energie SMALLINT NOT NULL CHECK (score_energie BETWEEN 1 AND 4),
    
    commentaires TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.voice_catalog ENABLE ROW LEVEL SECURITY;

-- Everybody can read the catalog
CREATE POLICY "Allow read access to authenticated users on voice_catalog" 
ON public.voice_catalog FOR SELECT 
TO authenticated 
USING (true);

-- Only service role or admins can update (since this is internal configuration)

-- Insérer les 30 voix de la version V2 Franck
INSERT INTO public.voice_catalog 
(voice_id, target_role, score_genre, score_age, score_tonalite, score_comedien, score_didascalie, score_projection, score_vitesse, score_texture, score_temperature, score_energie)
VALUES 
('Achernar', 'Voix Personnage principal', 3, 2, 4, 4, 3, 3, 3, 2, 2, 3),
('Achird', 'Voix annonces Actes et Titres', 2, 2, 3, 1, 4, 3, 3, 2, 3, 2),
('Algenib', 'Voix Personnage principal', 2, 3, 2, 4, 3, 3, 2, 2, 2, 2),
('Algieba', 'Voix Personnage principal', 2, 4, 1, 4, 2, 3, 2, 3, 3, 2),
('Alnilam', 'Voix Personnage secondaire', 2, 3, 2, 3, 2, 2, 2, 2, 3, 2),
('Aoede', 'Voix Personnage principal', 3, 3, 2, 4, 2, 3, 2, 2, 3, 3),
('Autonoe', 'Voix Personnage secondaire', 3, 3, 3, 1, 2, 3, 2, 2, 2, 3),
('Callirrhoe', 'Voix Didascalies', 3, 3, 2, 1, 4, 3, 3, 1, 2, 3),
('Charon', 'Voix Personnage secondaire', 2, 3, 2, 2, 1, 3, 2, 2, 2, 2),
('Despina', 'Voix Personnage principal ou secondaire', 3, 3, 2, 3, 2, 2, 2, 2, 3, 2),
('Enceladus', 'Voix Personnage secondaire', 2, 3, 2, 1, 2, 3, 2, 2, 3, 2),
('Erinome', 'Voix Personnage secondaire', 3, 2, 3, 2, 1, 3, 3, 2, 2, 2),
('Fenrir', 'Voix Personnage principal ou secondaire', 2, 2, 3, 3, 3, 3, 3, 2, 3, 2),
('Gacrux', 'Voix Personnage principal ou secondaire', 3, 4, 1, 3, 2, 2, 2, 3, 3, 2),
('Iapetus', 'Voix Personnage principal ou secondaire', 2, 3, 2, 3, 3, 3, 1, 1, 2, 2),
('Kore', 'Voix Personnage secondaire', 3, 2, 3, 2, 1, 3, 2, 2, 3, 2),
('Laomedeia', 'Voix Personnage principal', 3, 3, 3, 4, 3, 3, 2, 2, 3, 3),
('Leda', 'Voix Personnage secondaire', 3, 2, 3, 1, 3, 2, 3, 1, 3, 3),
('Orus', 'Voix Personnage secondaire', 2, 2, 3, 1, 2, 3, 2, 1, 3, 2),
('Puck', 'Voix Personnage principal', 2, 2, 2, 4, 2, 3, 3, 1, 2, 2),
('Pulcherrima', 'Voix Personnage principal', 2, 2, 4, 4, 3, 2, 2, 1, 3, 3),
('Rasalgethi', 'Voix Personnage secondaire', 2, 2, 3, 2, 3, 2, 2, 2, 3, 3),
('Sadachbia', 'Voix Personnage secondaire', 2, 3, 2, 1, 2, 3, 3, 2, 3, 2),
('Sadaltager', 'Voix Personnage principal ou secondaire', 2, 3, 2, 3, 3, 2, 2, 3, 2, 2),
('Schedar', 'Voix Notes Comédien', 2, 2, 3, 2, 4, 3, 3, 2, 2, 3),
('Sulafat', 'Voix Personnage principal ou secondaire', 3, 3, 2, 3, 3, 3, 3, 2, 3, 3),
('Umbriel', 'Voix Indications Metteur en scène et Régie', 2, 3, 2, 1, 4, 2, 3, 2, 3, 2),
('Vindemiatrix', 'Voix Personnage secondaire', 3, 3, 1, 2, 3, 3, 2, 2, 3, 2),
('Zephyr', 'Voix Personnage secondaire', 3, 2, 2, 2, 3, 2, 2, 2, 3, 2),
('Zubenelgenubi', 'Voix Personnage secondaire', 2, 2, 3, 1, 2, 3, 3, 2, 3, 3)
ON CONFLICT (voice_id) DO UPDATE SET
    target_role = EXCLUDED.target_role,
    score_genre = EXCLUDED.score_genre,
    score_age = EXCLUDED.score_age,
    score_tonalite = EXCLUDED.score_tonalite,
    score_comedien = EXCLUDED.score_comedien,
    score_didascalie = EXCLUDED.score_didascalie,
    score_projection = EXCLUDED.score_projection,
    score_vitesse = EXCLUDED.score_vitesse,
    score_texture = EXCLUDED.score_texture,
    score_temperature = EXCLUDED.score_temperature,
    score_energie = EXCLUDED.score_energie;
