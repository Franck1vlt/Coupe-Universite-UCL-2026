import { useEffect, useState } from "react";

export type ApiScoreType = "points" | "goals" | "sets";
export type Sport = {
  id: number;
  name: string;
  code: string;
  score_type: ApiScoreType;
  created_at?: string;
};

/**
 * Hook pour charger les informations d'un sport via son ID.
 * Retourne { sport, sportCode, loading, error }.
 */
export function useSport(sportId?: string) {
  const [sport, setSport] = useState<Sport | null>(null);
  const [sportCode, setSportCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sportId) return;
    setLoading(true);
    setError(null);
    const fetchSport = async () => {
      try {
        const res = await fetch(`http://localhost:8000/sports/${sportId}`);
        if (!res.ok) throw new Error("Sport introuvable");
        const data = await res.json();
        const sportData = data.data as Sport;
        setSport(sportData);
        // Déduire le code du sport à partir du nom
        const name = (sportData?.name || "").trim().toLowerCase();
        const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
        const n = normalize(name);
        let code: string | null = null;
        if (n.includes('foot')) code = 'football';
        else if (n.includes('hand')) code = 'handball';
        else if (n.includes('basket')) code = 'basketball';
        else if (n.includes('volley')) code = 'volleyball';
        else if (n.includes('badminton')) code = 'badminton';
        else if (n.includes('petanque')) code = 'petanque';
        else if (n.includes('flechette')) code = 'flechettes';
        if (code) setSportCode(code);
      } catch (e: any) {
        setError(e?.message || "Erreur lors du chargement du sport.");
      } finally {
        setLoading(false);
      }
    };
    fetchSport();
  }, [sportId]);

  return { sport, sportCode, loading, error };
}
