-- SQLite
SELECT * FROM Match;

ALTER TABLE Match ADD COLUMN duration INTEGER;


-- Supprime tous les matchs liés à un tournoi donné (remplace :tournament_id par l'id voulu)
DELETE FROM "Match"
WHERE phase_id IN (
    SELECT id FROM "TournamentPhase" WHERE tournament_id = :tournament_id
);

DELETE FROM "Match";

ALTER TABLE "Match" ADD COLUMN uuid TEXT NOT NULL DEFAULT '';
