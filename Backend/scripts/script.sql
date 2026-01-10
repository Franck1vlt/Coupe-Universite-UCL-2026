-- SQLite
SELECT * FROM Match;

ALTER TABLE Match ADD COLUMN duration INTEGER;

DELETE FROM "Match";

SELECT COUNT(*), COUNT(DISTINCT uuid) FROM "Match";

DELETE FROM Match WHERE phase_id IN (SELECT id FROM TournamentPhase WHERE tournament_id = 1);