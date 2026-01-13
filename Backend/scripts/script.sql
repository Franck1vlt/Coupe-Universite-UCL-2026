-- SQLite

-- Vérifier les données dans la table Match
SELECT * FROM Match;

-- Ajouter la colonne duration à la table Match
ALTER TABLE Match ADD COLUMN duration INTEGER;

-- Mettre à jour la colonne duration pour tous les matchs existants (par exemple, 90 minutes)
DELETE FROM "Match";
DELETE FROM "MatchSchedule";

-- Vérifier les doublons dans la table Match
SELECT COUNT(*), COUNT(DISTINCT uuid) FROM "Match";

-- Supprimer les matchs associés au tournoi avec l'ID 1
DELETE FROM Match WHERE phase_id IN (SELECT id FROM TournamentPhase WHERE tournament_id = 1);

-- Supprimer les matchs de la phase avec l'ID 1
DELETE FROM Match WHERE phase_id = 1;

-- Vérifier les données dans la table Match
SELECT id, uuid, label, team_a_source, team_b_source FROM Match ORDER BY id;

-- Vérifier les matchs de type 'qualification'
SELECT 
    id,
    label,
    team_sport_a_id,
    team_sport_b_id,
    team_a_source,
    team_b_source
FROM Match
WHERE match_type = 'qualification'
ORDER BY id;

-- Ajouter la colonne tournament_id à la table Match
ALTER TABLE "Match" 
ADD COLUMN tournament_id INTEGER;

-- Ajouter les valeurs de tournament_id en se basant sur la table TournamentPhase
UPDATE "Match" 
SET tournament_id = (
    SELECT tp.tournament_id 
    FROM "TournamentPhase" tp 
    WHERE tp.id = "Match".phase_id
);

-- Vérifier les matchs sans tournament_id
SELECT COUNT(*) FROM "Match" WHERE tournament_id IS NULL;

-- Vérifier l'intégrité des données entre Match et TournamentPhase
SELECT m.id, m.tournament_id, tp.tournament_id 
FROM "Match" m 
JOIN "TournamentPhase" tp ON m.phase_id = tp.id 
WHERE m.tournament_id != tp.tournament_id;

-- Vérifier les données dans la table Tournament
SELECT * FROM Tournament WHERE name = 'Test Commit';


SELECT * FROM Tournament;
SELECT * FROM tournament;

DELETE FROM "Tournament";


ALTER TABLE "MatchSchedule"
ADD COLUMN tournament_id INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MatchSchedule"
ADD CONSTRAINT fk_matchschedule_tournament
FOREIGN KEY (tournament_id) REFERENCES "Tournament"(id);