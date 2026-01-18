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

ALTER TABLE Match ADD COLUMN winner_destination_slot VARCHAR(1);
ALTER TABLE Match ADD COLUMN loser_destination_slot VARCHAR(1);

SELECT * FROM Match WHERE tournament_id	= 1;

-- Voir les détails du match 5
SELECT id, phase_id, tournament_id, team_sport_a_id, team_sport_b_id, team_a_source, team_b_source, status
FROM Match
WHERE id = 5;

-- Voir la phase associée
SELECT tp.id, tp.tournament_id, tp.phase_type
FROM TournamentPhase tp
INNER JOIN Match m ON m.phase_id = tp.id
WHERE m.id = 5;

-- Mettre à jour le tournament_id du match 5 avec celui de sa phase
UPDATE Match
SET tournament_id = (
    SELECT tp.tournament_id 
    FROM TournamentPhase tp 
    WHERE tp.id = Match.phase_id
)
WHERE id = 5;

-- Trouver tous les matchs avec tournament_id NULL ou incorrect
SELECT m.id, m.phase_id, m.tournament_id, tp.tournament_id as correct_tournament_id
FROM Match m
INNER JOIN TournamentPhase tp ON m.phase_id = tp.id
WHERE m.tournament_id IS NULL OR m.tournament_id != tp.tournament_id;

-- Voir les matchs avec leur statut
SELECT id, label, status, score_a, score_b
FROM Match
ORDER BY id;

SELECT id, label, team_a_source, team_b_source, score_a, score_b, status
FROM Match
WHERE id = 5;


SELECT id, label, team_sport_a_id, team_sport_b_id, team_a_source, team_b_source, score_a, score_b, status, winner_destination_match_id, loser_destination_match_id
FROM Match
WHERE id = 5 or id = 10;

-- 1. Trouver les team_sport_id de JUNIA et FMMS pour le sport Football (sport_id = 1)
SELECT ts.id as team_sport_id, t.name as team_name
FROM TeamSport ts
INNER JOIN Team t ON ts.team_id = t.id
WHERE t.name IN ('JUNIA', 'FMMS') AND ts.sport_id = 1;

UPDATE Match
SET score_a = NULL, score_b = NULL, status = 'upcoming', team_sport_a_id = NULL, team_sport_b_id = NULL
WHERE id = 5;

UPDATE Match
SET team_sport_a_id = NULL, team_sport_b_id = NULL
WHERE id = 10;

SELECT winner_points, loser_points FROM Match;

SELECT id, name FROM Team;

SELECT id, team_sport_a_id, team_sport_b_id, team_a_source, team_b_source, score_a, score_b, winner_destination_match_id, loser_destination_match_id
FROM Match;

SELECT id, pool_id, match_type, team_a_source, team_b_source FROM Match WHERE pool_id IS NOT NULL ORDER BY pool_id, id;

SELECT id, team_sport_a_id, team_sport_b_id, team_a_source, team_b_source FROM Match;

SELECT * FROM TeamSport WHERE team_id = 8;
