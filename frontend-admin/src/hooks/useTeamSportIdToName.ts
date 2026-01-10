import { useEffect, useState } from "react";

/**
 * Hook pour charger le mapping team_sport_id → team_name depuis l'API.
 * Retourne un objet { [teamSportId]: teamName }.
 */
export function useTeamSportIdToName() {
  const [teamSportIdToName, setTeamSportIdToName] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        const teamsRes = await fetch(`http://localhost:8000/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.data?.items || teamsData.data || [];
          const mapping: Record<number, string> = {};
          for (const team of teams) {
            const sportsRes = await fetch(`http://localhost:8000/teams/${team.id}/sports`);
            if (sportsRes.ok) {
              const sportsData = await sportsRes.json();
              const teamSports = sportsData.data || [];
              for (const ts of teamSports) {
                mapping[ts.id] = team.name;
              }
            }
          }
          setTeamSportIdToName(mapping);
        }
      } catch (err) {
        console.warn("Erreur lors du chargement du mapping d'équipes:", err);
      }
    };
    loadTeamNames();
  }, []);

  return teamSportIdToName;
}
