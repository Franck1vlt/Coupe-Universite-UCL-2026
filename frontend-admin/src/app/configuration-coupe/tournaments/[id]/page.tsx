"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { 
  resolveTeamName, 
  calculatePoolStandings, 
  propagateMatchResults,
  calculateFinalRankings,
  getMatchWinner,
  getMatchLoser
} from "./tournamentLogic";

// Types
type Sport = {
  id: number;
  name: string;
  score_type: string;
  created_at?: string;
};

type MatchType = "qualifications" | "poule" | "phase-finale" | "loser-bracket" ; 
type MatchStatus = "planifié" | "en-cours" | "terminé" | "annulé";
type BracketMatchType = "quarts" | "demi" | "finale" | "petite-finale";
type LoserBracketMatchType = "loser-round-1" | "loser-round-2" | "loser-round-3" | "loser-finale";

type Match = {
  id: string;
  uuid?: string;
  teamA: string;
  teamB: string;
  label?: string; // étiquette du match (ex: WQ1, LQF1)
  date: string;
  time: string;
  court: string; // Nom du terrain (toujours le nom, jamais l'id)
  status: MatchStatus;
  duration: number; // en minutes
  type: MatchType;
  scoreA?: number;
  scoreB?: number;
  winnerPoints?: number;
  loserPoints?: number;
  winnerCode?: string; // ex: WQ1 pour un match de qualifications, WQF1 pour quart de finale
  loserCode?: string; // ex: LQF1 pour perdant de quart de finale
  position: { x: number; y: number };
  // Pour les poules
  isPoolContainer?: boolean;
  poolTeams?: string[];
  poolMatches?: string[]; // IDs des matchs de la poule
  // Pour les brackets
  bracketMatchType?: BracketMatchType; // Type spécifique au bracket
  loserBracketMatchType?: LoserBracketMatchType; // Type spécifique au loser bracket
  winnerDestination?: string; // Match ID ou code de destination du vainqueur
  loserDestination?: string; // Match ID ou code de destination du perdant
  winner_destination_slot?: "A" | "B";
  loser_destination_slot?: "A" | "B";
  // Champs pour la propagation des vainqueurs/perdants (backend)
  winner_destination_match_id?: string | null;
  loser_destination_match_id?: string | null;
};

type Pool = {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
  position: { x: number; y: number };
  qualifiedToFinals: number;
  qualifiedToLoserBracket: number;
};

type Bracket = {
  id: string;
  name: string;
  enabledRounds: BracketMatchType[]; // Rounds activés (quarts, demi, finale, petite-finale)
  teams: string[]; // Équipes configurées manuellement pour le premier tour
  matches: Match[]; // Tous les matchs du bracket
  position: { x: number; y: number };
  winnerPoints?: number; // Points pour les vainqueurs
  loserPoints?: number; // Points pour les perdants
  loserToLoserBracket: boolean; // Les perdants vont-ils au loser bracket?
};

type LoserBracket = {
  id: string;
  name: string;
  enabledRounds: LoserBracketMatchType[]; // Rounds activés dans le loser bracket
  teams: string[]; // Équipes (perdants des autres phases)
  matches: Match[]; // Tous les matchs du loser bracket
  position: { x: number; y: number };
  winnerPoints?: number; // Points pour les vainqueurs
  loserPoints?: number; // Points pour les perdants
};

type Team = {
  id: string;
  name: string;
};

type Court = {
  id: string;
  name: string;
};

// --- MAPPING VOCABULAIRE API → REACT ---
// L'API envoie "semifinal", "final", etc. mais React attend "demi", "finale"
const bracketTypeApiToReact: Record<string, BracketMatchType> = {
  'quarterfinal': 'quarts',
  'semifinal': 'demi',
  'final': 'finale',
  'third_place': 'petite-finale',
  // Fallbacks si déjà en français
  'quarts': 'quarts',
  'demi': 'demi',
  'finale': 'finale',
  'petite-finale': 'petite-finale'
};

const loserBracketTypeApiToReact: Record<string, LoserBracketMatchType> = {
  'loser_round_1': 'loser-round-1',
  'loser_round_2': 'loser-round-2',
  'loser_round_3': 'loser-round-3',
  'loser_final': 'loser-finale',
  // Fallbacks si déjà en français
  'loser-round-1': 'loser-round-1',
  'loser-round-2': 'loser-round-2',
  'loser-round-3': 'loser-round-3',
  'loser-finale': 'loser-finale'
};

// Fonction pour calculer la position automatique des matchs de bracket
const calculateBracketMatchPosition = (
  bracketType: BracketMatchType,
  matchIndex: number,
  totalMatchesInRound: number
): { x: number; y: number } => {
  const columnOffsets: Record<BracketMatchType, number> = {
    'quarts': 0,
    'demi': 320,
    'finale': 640,
    'petite-finale': 640
  };
  
  const x = columnOffsets[bracketType] || 0;
  const baseSpacing = 160;
  
  // Espacement différent selon le round
  const spacingMultiplier: Record<BracketMatchType, number> = {
    'quarts': 1,
    'demi': 2,
    'finale': 1,
    'petite-finale': 1
  };
  
  const spacing = baseSpacing * (spacingMultiplier[bracketType] || 1);
  const startY = 100;
  
  // Position verticale: petite-finale en dessous de la finale
  if (bracketType === 'petite-finale') {
    return { x, y: startY + 300 };
  }
  
  const y = startY + matchIndex * spacing;
  return { x, y };
};

// Fonction pour calculer la position automatique des matchs de loser bracket
const calculateLoserBracketMatchPosition = (
  loserBracketType: LoserBracketMatchType,
  matchIndex: number
): { x: number; y: number } => {
  const columnOffsets: Record<LoserBracketMatchType, number> = {
    'loser-round-1': 0,
    'loser-round-2': 280,
    'loser-round-3': 560,
    'loser-finale': 840
  };
  
  const x = columnOffsets[loserBracketType] || 0;
  const spacing = 140;
  const y = 100 + matchIndex * spacing;
  
  return { x, y };
};


// Fonction helper pour obtenir les équipes utilisées par phase
const getUsedTeamsByPhase = (
  matches: Match[], 
  pools: Pool[], 
  brackets: Bracket[], 
  loserBrackets: LoserBracket[],
  currentPhaseType: 'qualification' | 'pool' | 'bracket' | 'loser-bracket',
  currentPhaseId?: string
) => {
  const usedTeams = {
    qualifications: new Set<string>(),
    pools: new Set<string>(),
    brackets: new Set<string>(),
    loserBrackets: new Set<string>()
  };

  // Équipes dans les matchs de qualification
  matches.filter(m => m.type === "qualifications").forEach(match => {
    if (match.teamA) usedTeams.qualifications.add(match.teamA);
    if (match.teamB) usedTeams.qualifications.add(match.teamB);
  });

  // Équipes dans les poules (sauf la poule actuelle si on la modifie)
  pools.forEach(pool => {
    if (currentPhaseType === 'pool' && pool.id === currentPhaseId) return;
    pool.teams.forEach(team => usedTeams.pools.add(team));
  });

  // Équipes dans les brackets (sauf le bracket actuel si on le modifie)
  brackets.forEach(bracket => {
    if (currentPhaseType === 'bracket' && bracket.id === currentPhaseId) return;
    bracket.teams.forEach(team => usedTeams.brackets.add(team));
  });

  // Équipes dans les loser brackets (sauf le loser bracket actuel si on le modifie)
  loserBrackets.forEach(lb => {
    if (currentPhaseType === 'loser-bracket' && lb.id === currentPhaseId) return;
    lb.teams.forEach(team => usedTeams.loserBrackets.add(team));
  });

  return usedTeams;
};

export default function TournamentsPage() {
    // Vérifie si un terrain est disponible pour un créneau donné
    const isCourtAvailable = (
      courtName: string,
      date: string,
      time: string,
      duration: number,
      matchId?: string
    ) => {
      if (!courtName || !date || !time || !duration) return true;
      // Convertir date et heure en timestamp de début et de fin
      const start = new Date(`${date}T${time}:00`).getTime();
      const end = start + duration * 60 * 1000;
      // Chercher tous les matchs (tous types) qui occupent ce terrain à cette date
      const allMatches = [
        ...matches,
        ...pools.flatMap(p => p.matches),
        ...brackets.flatMap(b => b.matches),
        ...loserBrackets.flatMap(lb => lb.matches),
      ];
      for (const m of allMatches) {
        if (
          m.court === courtName &&
          m.date === date &&
          m.id !== matchId &&
          m.time && m.duration
        ) {
          const mStart = new Date(`${m.date}T${m.time}:00`).getTime();
          const mEnd = mStart + m.duration * 60 * 1000;
          // Si les créneaux se chevauchent
          if (!(end <= mStart || start >= mEnd)) {
            return false;
          }
        }
      }
      return true;
    };
  const router = useRouter();
  const params = useParams();
  const [sport, setSport] = useState<Sport | null>(null);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loserBrackets, setLoserBrackets] = useState<LoserBracket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedBracket, setSelectedBracket] = useState<Bracket | null>(null);
  const [selectedLoserBracket, setSelectedLoserBracket] = useState<LoserBracket | null>(null);
  const [selectedPoolMatch, setSelectedPoolMatch] = useState<Match | null>(null);
  const [selectedBracketMatch, setSelectedBracketMatch] = useState<Match | null>(null);
  const [selectedLoserBracketMatch, setSelectedLoserBracketMatch] = useState<Match | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [draggedMatch, setDraggedMatch] = useState<string | null>(null);
  const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);
  const [nextMatchId, setNextMatchId] = useState(1); // Compteur pour les IDs de matchs
  
  const qualificationMatchesCount = matches.filter(m => m.type === "qualifications").length;

  // Récupérer les équipes depuis l'API
  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch("http://localhost:8000/teams?skip=0&limit=100", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les équipes");
      const data = await res.json();
      const teamsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setTeams(teamsData.map((team: any) => ({
        id: team.id.toString(),
        name: team.name
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des équipes:", error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Récupérer les terrains depuis l'API
  const fetchCourts = async () => {
    setLoadingCourts(true);
    try {
      const res = await fetch("http://localhost:8000/courts?skip=0&limit=100", {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Impossible de charger les terrains");
      const data = await res.json();
      const courtsData = Array.isArray(data?.data?.items) ? data.data.items : [];
      setCourts(courtsData.map((court: any) => ({
        id: court.id.toString(),
        name: court.name
      })));
    } catch (error) {
      console.error("Erreur lors du chargement des terrains:", error);
      setCourts([]);
    } finally {
      setLoadingCourts(false);
    }
  };

  // Fonction pour créer ou mettre à jour un match schedule
  const postMatchSchedule = async (
    matchId: string,
    courtName: string,
    date: string,
    time: string,
    duration: number
  ) => {
    try {
      // Trouver l'ID du terrain depuis son nom
      const court = courts.find(c => c.name === courtName);
      if (!court) {
        console.error(`Terrain non trouvé: ${courtName}`);
        return;
      }

      // Construire scheduled_datetime au format ISO (YYYY-MM-DDTHH:MM:SS)
      const scheduledDatetime = `${date}T${time}:00`;

      // Calculer estimated_duration_minutes
      const estimatedDurationMinutes = duration;


      const payload = {
        match_id: parseInt(matchId, 10),
        court_id: parseInt(court.id, 10),
        scheduled_datetime: scheduledDatetime,
        estimated_duration_minutes: estimatedDurationMinutes,
        tournament_id: tournamentId // Ajout de tournament_id
      };

      console.log(`📅 Envoi match schedule pour match ${matchId}:`, payload);

      // Essayer d'abord un PUT (mise à jour)
      let res = await fetch(`http://localhost:8000/match-schedules/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Si 404, créer avec POST
      if (res.status === 404) {
        console.log(`⚠️ Schedule inexistant pour match ${matchId}, création...`);
        res = await fetch(`http://localhost:8000/match-schedules/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Erreur schedule match ${matchId}:`, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const result = await res.json();
      console.log(`✅ Schedule enregistré pour match ${matchId}:`, result);
    } catch (error) {
      console.error(`❌ Erreur lors de l'enregistrement du schedule pour match ${matchId}:`, error);
    }
  };

  // Affiche le select des terrains pour n'importe quel match
  const renderCourtSelect = (match: Match, onChange: (courtName: string) => void) => {
    return (
      <select
        value={match.court || ""}
        onChange={e => onChange(e.target.value)}
        className="border rounded px-2 py-1 w-full text-black"
      >
        <option value="">Sélectionner un terrain</option>
        {courts.map(court => {
          const isOccupied = !isCourtAvailable(
            court.name,
            match.date,
            match.time,
            match.duration,
            match.id
          );
          // Si le terrain est occupé ET n'est pas celui sélectionné, on le désactive
          const disabled = isOccupied && match.court !== court.name;
          return (
            <option
              key={court.id}
              value={court.name}
              disabled={disabled}
            >
              {court.name + (disabled ? " (occupé)" : "")}
            </option>
          );
        })}
      </select>
    );
  };

  const loadTournamentData = async () => {
    try {
      // 1. Récupération du tournoi
      const response = await fetch(`http://localhost:8000/tournaments`);
      if (!response.ok) return;
      const tournamentsData = await response.json();
      const tournament = tournamentsData.data.items.find(
        (t: any) => t.sport_id === parseInt(params.id as string)
      );

      if (!tournament) return;
      setTournamentId(tournament.id);

      // 2. Récupération des matchs via la liste globale (plus fiable)
      const matchesRes = await fetch(
        `http://localhost:8000/tournaments/${tournament.id}/matches`
      );
      if (!matchesRes.ok) return;
      const matchesJson = await matchesRes.json();
      
      // Filtrage pour ne garder que les matchs qui pourraient appartenir à ce tournoi
      const allMatchesRaw = matchesJson.data || [];

      const mapRawToMatch = (m: any, type: MatchType): Match => ({
        id: m.id?.toString() || uuidv4(),
        uuid: m.uuid || `match-${m.id || uuidv4()}`,
        teamA: m.team_a_source || "",
        teamB: m.team_b_source || "",
        label: m.label || "",
        status: m.status === "upcoming" ? "planifié" : (m.status === "in_progress" ? "en-cours" : "terminé"),
        date: m.date || "",
        time: m.time || "",
        court: m.court || "",
        duration: m.duration || 90,
        type: type,
        bracketMatchType: bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale',
        position: { x: 0, y: 0 }
      });

      // 3. RECONSTRUCTION DES QUALIFICATIONS
      const qualMatches = allMatchesRaw
        .filter((m: any) => m.match_type === "qualification")
        .map((m: any, i: number) => ({
          ...mapRawToMatch(m, "qualifications"),
          position: { x: 50, y: 100 + i * 160 }
        }));
      setMatches(qualMatches);

      // 4. RECONSTRUCTION DU BRACKET (PHASE FINALE)
      const bracketMatchesRaw = allMatchesRaw.filter(
        (m: any) => m.match_type === "bracket"
      );
      
      if (bracketMatchesRaw.length > 0) {
        console.log("Matchs de bracket trouvés:", bracketMatchesRaw.length);

        // Grouper les matchs par type pour calculer les positions
        const matchesByType: Record<string, any[]> = {};
        bracketMatchesRaw.forEach((m: any) => {
          const mappedType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
          if (!matchesByType[mappedType]) matchesByType[mappedType] = [];
          matchesByType[mappedType].push(m);
        });

        const mappedBracketMatches = bracketMatchesRaw.map((m: any, index: number) => {
          const mappedType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
          const matchesOfSameType = matchesByType[mappedType] || [];
          const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
          
          return {
            ...mapRawToMatch(m, "phase-finale"),
            bracketMatchType: mappedType as BracketMatchType,
            position: calculateBracketMatchPosition(
              mappedType as BracketMatchType,
              indexInType >= 0 ? indexInType : index,
              matchesOfSameType.length
            )
          };
        });
        
        // On identifie les rounds (colonnes) présents
        const roundsFound = Array.from(new Set(
          mappedBracketMatches.map((m: any) => m.bracketMatchType).filter(Boolean)
        )) as BracketMatchType[];

        // ON FORCE LA CRÉATION DE LA TUILE DANS L'ÉTAT
        setBrackets([{
          id: "bracket-auto",
          name: "Phase Finale",
          matches: mappedBracketMatches,
          enabledRounds: roundsFound,
          teams: [],
          position: { x: 850, y: 100 }, // Position par défaut à droite
          winnerPoints: 0,
          loserPoints: 0,
          loserToLoserBracket: false
        }]);
      } else {
        setBrackets([]); // On vide si aucun match de bracket
      }

      // 5. RECONSTRUCTION DES POULES
      // On groupe les matchs par pool_id pour créer autant de tuiles que de poules
      const poolIds = Array.from(new Set(allMatchesRaw.filter((m: any) => m.match_type === "pool").map((m: any) => m.pool_id)));
      
      const reconstructedPools = poolIds.map((pId: any, i: number) => {
        const pMatches = allMatchesRaw
          .filter((m: any) => m.match_type === "pool" && m.pool_id === pId)
          .map((m: any, idx: number) => ({
            ...mapRawToMatch(m, "poule"),
            position: { x: 0, y: idx * 100 }
          }));

        return {
          id: pId?.toString() || uuidv4(),
          name: `Poule ${pId}`,
          teams: [],
          matches: pMatches,
          position: { x: 450, y: 100 + i * 350 },
          qualifiedToFinals: 2,
          qualifiedToLoserBracket: 0
        };
      });
      setPools(reconstructedPools);

      // 6. RECONSTRUCTION DES LOSER BRACKETS
      const loserMatchesRaw = allMatchesRaw.filter(
        (m: any) => m.match_type === "loser_bracket"
      );

      
      if (loserMatchesRaw.length > 0) {
        console.log("Matchs de loser bracket trouvés:", loserMatchesRaw.length);

        // Grouper les matchs par type pour calculer les positions
        const loserMatchesByType: Record<string, any[]> = {};
        loserMatchesRaw.forEach((m: any) => {
          const mappedType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
          if (!loserMatchesByType[mappedType]) loserMatchesByType[mappedType] = [];
          loserMatchesByType[mappedType].push(m);
        });

        const mappedLoserMatches = loserMatchesRaw.map((m: any, index: number) => {
          const mappedType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
          const matchesOfSameType = loserMatchesByType[mappedType] || [];
          const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
          
          return {
            ...mapRawToMatch(m, "loser-bracket"),
            loserBracketMatchType: mappedType as LoserBracketMatchType,
            position: calculateLoserBracketMatchPosition(
              mappedType as LoserBracketMatchType,
              indexInType >= 0 ? indexInType : index
            )
          };
        });

        const loserRoundsFound = Array.from(new Set(
          mappedLoserMatches.map((m: any) => m.loserBracketMatchType).filter(Boolean)
        )) as LoserBracketMatchType[];

        setLoserBrackets([{
          id: "loser-bracket-auto",
          name: "Loser Bracket",
          matches: mappedLoserMatches,
          enabledRounds: loserRoundsFound,
          teams: [],
          position: { x: 100, y: 500 },
          winnerPoints: 0,
          loserPoints: 0
        }]);
      } else {
        setLoserBrackets([]);
      }

      console.log("✅ Reconstruction terminée");

    } catch (error) {
      console.error("❌ Erreur dans loadTournamentData:", error);
    }
  };

  // Charger les données initiales (équipes, terrains, layout éventuel enregistré)
  useEffect(() => {
    fetchTeams();
    fetchCourts();
    // Note: loadTournamentData() est maintenant intégré dans loadFromAPI() 
    // pour éviter les conditions de course

    if (params.id && typeof params.id === "string") {
      // Essayer de charger depuis l'API d'abord
      const loadFromAPI = async () => {
        try {
          // Charger tous les tournois et trouver celui qui correspond au sport
          const response = await fetch(`http://localhost:8000/tournaments`);
          if (response.ok) {
            const data = await response.json();
            console.log("📥 Données API tournois:", data);
            if (data.success && data.data && Array.isArray(data.data.items)) {
              // Chercher le tournoi pour ce sport
              const tournament = data.data.items.find((t: any) => t.sport_id === parseInt(params.id as string));
              
              if (tournament) {
                console.log("📥 Tournoi trouvé:", tournament);
                setTournamentId(tournament.id);
                
                // Charger la structure du tournoi
                const structureResponse = await fetch(`http://localhost:8000/tournaments/${tournament.id}/structure`);
                if (structureResponse.ok) {
                  const structureData = await structureResponse.json();
                  if (structureData.success && structureData.data) {
                    console.log("📥 Chargement depuis l'API:", structureData.data);
              
              // Convertir les matchs de qualification
              const apiQualificationMatches: Match[] = (structureData.data.qualification_matches || []).map((m: any) => ({
                id: m.id.toString(),
                uuid: m.uuid,
                label: m.label,
                teamA: m.team_a_source ?? "",
                teamB: m.team_b_source ?? "",
                date: m.scheduled_datetime ? m.scheduled_datetime.split('T')[0] : (m.date ?? ""),
                time: m.scheduled_datetime ? (m.scheduled_datetime.split('T')[1]?.slice(0,5) ?? "") : (m.time ?? ""),
                court: m.court ?? "",
                status: m.status === "upcoming" ? "planifié" : 
                  m.status === "in_progress" ? "en-cours" :
                  m.status === "completed" ? "terminé" : "planifié",
                duration: m.duration || 90,
                type: "qualifications" as MatchType,
                scoreA: m.score_a,
                scoreB: m.score_b,
                winnerCode: m.label,
                position: { x: 100, y: 100 + (m.match_order || 0) * 100 },
              }));

              console.log("=== MATCHS CHARGÉS DEPUIS LA BDD ===");
              apiQualificationMatches.forEach((m, idx) => {
                console.log(`Match ${idx + 1}:`, {
                  id: m.id,
                  uuid: m.uuid,
                  label: m.label,
                  teamA: m.teamA,
                  teamB: m.teamB
                });
              });


              // Convertir les poules
              const apiPools: Pool[] = (structureData.data.pools || []).map((p: any) => ({
                id: p.id.toString(),
                name: p.name,
                teams: [], // Les équipes seront récupérées séparément si nécessaire
                matches: (p.matches || []).map((m: any) => ({
                    id: m.id.toString(),
                    uuid: m.uuid,
                    label: m.label,
                    teamA: m.team_a_source ?? "",
                    teamB: m.team_b_source ?? "",
                    date: m.scheduled_datetime ? m.scheduled_datetime.split('T')[0] : (m.date ?? ""),
                    time: m.scheduled_datetime ? (m.scheduled_datetime.split('T')[1]?.slice(0,5) ?? "") : (m.time ?? ""),
                    court: m.court ?? "",
                    status: m.status === "upcoming" ? "planifié" : 
                      m.status === "in_progress" ? "en-cours" :
                      m.status === "completed" ? "terminé" : "planifié",
                    duration: m.duration || 90,
                    type: "poule" as MatchType,
                    scoreA: m.score_a,
                    scoreB: m.score_b,
                    position: { x: 0, y: 0 },
                })),
                position: { x: 100, y: 100 },
                qualifiedToFinals: p.qualified_to_finals || 2,
                qualifiedToLoserBracket: p.qualified_to_loser_bracket || 0,
              }));

              // Convertir les brackets
              const apiBrackets: Bracket[] = [];
              if (structureData.data.bracket_matches && structureData.data.bracket_matches.length > 0) {
                // Grouper les matchs par type de bracket pour calculer les positions
                const matchesByType: Record<string, any[]> = {};
                structureData.data.bracket_matches.forEach((m: any) => {
                  const mappedType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
                  if (!matchesByType[mappedType]) matchesByType[mappedType] = [];
                  matchesByType[mappedType].push(m);
                });

                const bracketMatches = structureData.data.bracket_matches.map((m: any, index: number) => {
                    // CORRECTION 1: Mapping vocabulaire API → React
                    const mappedBracketType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
                    
                    // CORRECTION 4: UUID généré si absent
                    const matchUuid = m.uuid || `bracket-match-${m.id || uuidv4()}`;
                    
                    // CORRECTION 5: Calculer la position automatiquement
                    const matchesOfSameType = matchesByType[mappedBracketType] || [];
                    const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
                    const position = calculateBracketMatchPosition(
                      mappedBracketType as BracketMatchType,
                      indexInType >= 0 ? indexInType : index,
                      matchesOfSameType.length
                    );
                    
                    return {
                      id: m.id?.toString() || matchUuid,
                      uuid: matchUuid,
                      label: m.label,
                      teamA: m.team_a_source ?? "",
                      teamB: m.team_b_source ?? "",
                      date: m.scheduled_datetime ? m.scheduled_datetime.split('T')[0] : (m.date ?? ""),
                      time: m.scheduled_datetime ? (m.scheduled_datetime.split('T')[1]?.slice(0,5) ?? "") : (m.time ?? ""),
                      court: m.court ?? "",
                      status: m.status === "upcoming" ? "planifié" : 
                        m.status === "in_progress" ? "en-cours" :
                        m.status === "completed" ? "terminé" : "planifié",
                      duration: m.duration || 90,
                      type: "phase-finale" as MatchType,
                      scoreA: m.score_a,
                      scoreB: m.score_b,
                      bracketMatchType: mappedBracketType as BracketMatchType,
                      winnerCode: m.label,
                      position: position,
                    };
                });
                
                // CORRECTION 3: Initialiser enabledRounds avec les rounds trouvés
                const enabledRounds = Array.from(new Set(
                  bracketMatches.map((m: Match) => m.bracketMatchType).filter(Boolean)
                )) as BracketMatchType[];
                
                apiBrackets.push({
                  id: "bracket-1",
                  name: "Phase Finale",
                  enabledRounds: enabledRounds,
                  teams: [],
                  matches: bracketMatches,
                  position: { x: 500, y: 100 },
                  loserToLoserBracket: false,
                });
              }

              // Convertir les loser brackets
              const apiLoserBrackets: LoserBracket[] = [];
              if (structureData.data.loser_bracket_matches && structureData.data.loser_bracket_matches.length > 0) {
                // Grouper les matchs par type pour calculer les positions
                const loserMatchesByType: Record<string, any[]> = {};
                structureData.data.loser_bracket_matches.forEach((m: any) => {
                  const mappedType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
                  if (!loserMatchesByType[mappedType]) loserMatchesByType[mappedType] = [];
                  loserMatchesByType[mappedType].push(m);
                });

                const loserMatches = structureData.data.loser_bracket_matches.map((m: any, index: number) => {
                    // CORRECTION 1: Mapping vocabulaire API → React
                    const mappedLoserType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
                    
                    // CORRECTION 4: UUID généré si absent
                    const matchUuid = m.uuid || `loser-match-${m.id || uuidv4()}`;
                    
                    // CORRECTION 5: Calculer la position automatiquement
                    const matchesOfSameType = loserMatchesByType[mappedLoserType] || [];
                    const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
                    const position = calculateLoserBracketMatchPosition(
                      mappedLoserType as LoserBracketMatchType,
                      indexInType >= 0 ? indexInType : index
                    );
                    
                    return {
                      id: m.id?.toString() || matchUuid,
                      uuid: matchUuid,
                      label: m.label,
                      teamA: m.team_a_source || "",
                      teamB: m.team_b_source || "",
                      date: m.scheduled_datetime ? m.scheduled_datetime.split('T')[0] : (m.date ?? ""),
                      time: m.scheduled_datetime ? (m.scheduled_datetime.split('T')[1]?.slice(0,5) ?? "") : (m.time ?? ""),
                      court: m.court ?? "",
                      status: m.status === "upcoming" ? "planifié" : 
                        m.status === "in_progress" ? "en-cours" :
                        m.status === "completed" ? "terminé" : "planifié",
                      duration: m.duration || 90,
                      type: "loser-bracket" as MatchType,
                      scoreA: m.score_a,
                      scoreB: m.score_b,
                      loserBracketMatchType: mappedLoserType as LoserBracketMatchType,
                      position: position,
                    };
                });
                
                // CORRECTION 3: Initialiser enabledRounds avec les rounds trouvés
                const enabledLoserRounds = Array.from(new Set(
                  loserMatches.map((m: Match) => m.loserBracketMatchType).filter(Boolean)
                )) as LoserBracketMatchType[];
                
                apiLoserBrackets.push({
                  id: "loser-bracket-1",
                  name: "Loser Bracket",
                  enabledRounds: enabledLoserRounds,
                  teams: [],
                  matches: loserMatches,
                  position: { x: 300, y: 100 },
                });
              }

              setMatches(apiQualificationMatches);
              setPools(apiPools);
              
              // CORRECTION: Si l'API structure ne retourne pas de bracket_matches,
              // on les charge depuis /matches pour ne pas écraser les données de loadTournamentData
              if (apiBrackets.length > 0) {
                setBrackets(apiBrackets);
              } else {
                // Charger les brackets depuis /matches si structure ne les a pas
                console.log("⚠️ Pas de bracket_matches dans /structure, chargement depuis /matches...");
                try {
                  const matchesRes = await fetch(
                    `http://localhost:8000/tournaments/${tournament.id}/matches`
                  );
                  if (matchesRes.ok) {
                    const matchesJson = await matchesRes.json();
                    const allMatchesRaw = matchesJson.data || [];
                    const bracketMatchesRaw = allMatchesRaw.filter(
                      (m: any) => m.match_type === "bracket"
                    );

                    
                    if (bracketMatchesRaw.length > 0) {
                      console.log(`✅ ${bracketMatchesRaw.length} matchs de bracket trouvés via /matches`);
                      
                      // Grouper les matchs par type pour calculer les positions
                      const matchesByType: Record<string, any[]> = {};
                      bracketMatchesRaw.forEach((m: any) => {
                        const mappedType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
                        if (!matchesByType[mappedType]) matchesByType[mappedType] = [];
                        matchesByType[mappedType].push(m);
                      });

                      const bracketMatches = bracketMatchesRaw.map((m: any, index: number) => {
                        const mappedBracketType = bracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'finale';
                        const matchUuid = m.uuid || `bracket-match-${m.id || uuidv4()}`;
                        const matchesOfSameType = matchesByType[mappedBracketType] || [];
                        const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
                        const position = calculateBracketMatchPosition(
                          mappedBracketType as BracketMatchType,
                          indexInType >= 0 ? indexInType : index,
                          matchesOfSameType.length
                        );
                        
                        return {
                          id: m.id?.toString() || matchUuid,
                          uuid: matchUuid,
                          label: m.label,
                          teamA: m.team_a_source ?? "",
                          teamB: m.team_b_source ?? "",
                          date: m.date ?? "",
                          time: m.time ?? "",
                          court: m.court ?? "",
                          status: m.status === "upcoming" ? "planifié" : 
                            m.status === "in_progress" ? "en-cours" :
                            m.status === "completed" ? "terminé" : "planifié",
                          duration: m.duration || 90,
                          type: "phase-finale" as MatchType,
                          scoreA: m.score_a,
                          scoreB: m.score_b,
                          bracketMatchType: mappedBracketType as BracketMatchType,
                          winnerCode: m.label,
                          position: position,
                        };
                      });
                      
                      const enabledRounds = Array.from(new Set(
                        bracketMatches.map((m: Match) => m.bracketMatchType).filter(Boolean)
                      )) as BracketMatchType[];
                      
                      setBrackets([{
                        id: "bracket-1",
                        name: "Phase Finale",
                        enabledRounds: enabledRounds,
                        teams: [],
                        matches: bracketMatches,
                        position: { x: 500, y: 100 },
                        loserToLoserBracket: false,
                      }]);
                    }
                  }
                } catch (e) {
                  console.log("⚠️ Impossible de charger les brackets depuis /matches:", e);
                }
              }
              
              // Idem pour les loser brackets
              if (apiLoserBrackets.length > 0) {
                setLoserBrackets(apiLoserBrackets);
              } else {
                // Charger les loser brackets depuis /matches si structure ne les a pas
                try {
                  const matchesRes = await fetch(
                    `http://localhost:8000/tournaments/${tournament.id}/matches`
                  );
                  if (matchesRes.ok) {
                    const matchesJson = await matchesRes.json();
                    const allMatchesRaw = matchesJson.data || [];
                    const loserMatchesRaw = allMatchesRaw.filter((m: any) => m.match_type === "loser_bracket");
                    
                    if (loserMatchesRaw.length > 0) {
                      console.log(`✅ ${loserMatchesRaw.length} matchs de loser bracket trouvés via /matches`);
                      
                      const loserMatchesByType: Record<string, any[]> = {};
                      loserMatchesRaw.forEach((m: any) => {
                        const mappedType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
                        if (!loserMatchesByType[mappedType]) loserMatchesByType[mappedType] = [];
                        loserMatchesByType[mappedType].push(m);
                      });

                      const loserMatches = loserMatchesRaw.map((m: any, index: number) => {
                        const mappedLoserType = loserBracketTypeApiToReact[m.bracket_type] || m.bracket_type || 'loser-round-1';
                        const matchUuid = m.uuid || `loser-match-${m.id || uuidv4()}`;
                        const matchesOfSameType = loserMatchesByType[mappedLoserType] || [];
                        const indexInType = matchesOfSameType.findIndex((match: any) => match.id === m.id);
                        const position = calculateLoserBracketMatchPosition(
                          mappedLoserType as LoserBracketMatchType,
                          indexInType >= 0 ? indexInType : index
                        );
                        
                        return {
                          id: m.id?.toString() || matchUuid,
                          uuid: matchUuid,
                          label: m.label,
                          teamA: m.team_a_source || "",
                          teamB: m.team_b_source || "",
                          date: m.date ?? "",
                          time: m.time ?? "",
                          court: m.court ?? "",
                          status: m.status === "upcoming" ? "planifié" : 
                            m.status === "in_progress" ? "en-cours" :
                            m.status === "completed" ? "terminé" : "planifié",
                          duration: m.duration || 90,
                          type: "loser-bracket" as MatchType,
                          scoreA: m.score_a,
                          scoreB: m.score_b,
                          loserBracketMatchType: mappedLoserType as LoserBracketMatchType,
                          position: position,
                        };
                      });
                      
                      const enabledLoserRounds = Array.from(new Set(
                        loserMatches.map((m: Match) => m.loserBracketMatchType).filter(Boolean)
                      )) as LoserBracketMatchType[];
                      
                      setLoserBrackets([{
                        id: "loser-bracket-1",
                        name: "Loser Bracket",
                        enabledRounds: enabledLoserRounds,
                        teams: [],
                        matches: loserMatches,
                        position: { x: 300, y: 100 },
                      }]);
                    }
                  }
                } catch (e) {
                  console.log("⚠️ Impossible de charger les loser brackets depuis /matches:", e);
                }
              }
              
              // Calculer le prochain ID
              const allIds = [
                ...apiQualificationMatches.map(m => parseInt(m.id)),
                ...apiPools.flatMap(p => p.matches.map(m => parseInt(m.id))),
                ...apiBrackets.flatMap(b => b.matches.map(m => parseInt(m.id))),
                ...apiLoserBrackets.flatMap(lb => lb.matches.map(m => parseInt(m.id))),
              ].filter(id => !isNaN(id));
              
              setNextMatchId(allIds.length > 0 ? Math.max(...allIds) + 1 : 1);
              console.log("✅ Données chargées depuis l'API");
              return;
                  }
                }
              } else {
                console.log("⚠️ Aucun tournoi trouvé pour ce sport");
              }
            }
          }
        } catch (err) {
          console.log("⚠️ Impossible de charger depuis l'API:", err);
          // Fallback: charger via loadTournamentData
          console.log("🔄 Fallback vers loadTournamentData...");
          loadTournamentData();
        }
        
        // Ne plus utiliser localStorage pour éviter les conflits
        // Tous les tournois doivent être créés et chargés depuis l'API
      };
      
      loadFromAPI();
    }
  }, [params.id]);

  // Récupérer le sport par son ID
  const fetchSport = async (sportId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/sports/${sportId}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error("Sport introuvable");
      const data = await res.json();
      setSport(data.data);
    } catch (error) {
      console.error("Erreur lors du chargement du sport:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      fetchSport(params.id);
    }
  }, [params.id]);

  useEffect(() => {
    setMatches([]);
    setPools([]);
    setBrackets([]);
    setLoserBrackets([]);
  }, [tournamentId]);


  const addNewMatchFromPalette = (type: MatchType, x: number, y: number) => {
      // Générer l'UUID ici pour qu'il soit persistant
      const newUuid = uuidv4();

      if (type === "poule") {
        const newPool: Pool = {
          id: `pool-${nextMatchId}`,
          name: `Poule ${pools.length + 1}`,
          teams: [],
          matches: [],
          position: { x: Math.max(0, x - 150), y: Math.max(0, y - 100) },
          qualifiedToFinals: 0,
          qualifiedToLoserBracket: 0
        };
        setPools([...pools, newPool]);
        setSelectedPool(newPool);
        setSelectedMatch(null);
        setSelectedBracket(null);
        setNextMatchId(nextMatchId + 1);
      } else if (type === "phase-finale") {
        // (Code bracket inchangé, pas d'UUID sur le conteneur bracket lui-même pour l'instant)
        const newBracket: Bracket = {
          id: `bracket-${nextMatchId}`,
          name: `Phase Finale ${brackets.length + 1}`,
          enabledRounds: ["quarts", "demi", "finale", "petite-finale"],
          teams: [],
          matches: [],
          position: { x: Math.max(0, x - 150), y: Math.max(0, y - 100) },
          winnerPoints: 0,
          loserPoints: 0,
          loserToLoserBracket: false
        };
        setBrackets([...brackets, newBracket]);
        setSelectedBracket(newBracket);
        setSelectedMatch(null);
        setSelectedPool(null);
        setNextMatchId(nextMatchId + 1);
      } else if (type === "loser-bracket") {
        // (Code loser bracket inchangé)
        const newLoserBracket: LoserBracket = {
          id: `loser-${nextMatchId}`,
          name: `Loser Bracket ${loserBrackets.length + 1}`,
          enabledRounds: ["loser-round-1", "loser-finale"],
          teams: [],
          matches: [],
          position: { x: Math.max(0, x - 150), y: Math.max(0, y - 100) },
          winnerPoints: 0,
          loserPoints: 0
        };
        setLoserBrackets([...loserBrackets, newLoserBracket]);
        setSelectedLoserBracket(newLoserBracket);
        setSelectedMatch(null);
        setSelectedPool(null);
        setSelectedBracket(null);
        setNextMatchId(nextMatchId + 1);
      } else {
        const isQualification = type === "qualifications";
        const existingQualifsCount = matches.filter(m => m.type === "qualifications").length;
        const qualifIndex = isQualification ? existingQualifsCount + 1 : undefined;

        const newMatch: Match = {
          id: `match-${nextMatchId}`,
          uuid: uuidv4(),
          teamA: "",
          teamB: "",
          date: "",
          time: "",
          court: "",
          status: "planifié",
          duration: 90,
          type: type,
          position: { x: Math.max(0, x - 144), y: Math.max(0, y - 80) },
          winnerPoints: isQualification ? 0 : undefined,
          loserPoints: isQualification ? 0 : undefined,
          winnerCode: isQualification && qualifIndex ? `WQ${qualifIndex}` : undefined
        };
        setMatches([...matches, newMatch]);
        setSelectedMatch(newMatch);
        setSelectedPool(null);
        setSelectedBracket(null);
        setNextMatchId(nextMatchId + 1);
      }
  };

  const adjustQualificationMatchesCount = (targetCount: number) => {
    if (targetCount <= 0) return;

    const currentQualifs = matches.filter(m => m.type === "qualifications");

    // On ne supprime pas automatiquement les matchs existants :
    // l'utilisateur peut les supprimer manuellement depuis le canevas.
    if (targetCount <= currentQualifs.length) {
      return;
    }

    const anchorMatch = currentQualifs[0] || selectedMatch;
    const baseX = anchorMatch ? anchorMatch.position.x : 100;
    const baseY = anchorMatch ? anchorMatch.position.y : 100;

    const newMatches: Match[] = [];
    let currentId = nextMatchId;
    for (let i = currentQualifs.length; i < targetCount; i++) {
      const index = i + 1; // WQ1, WQ2, ...
      newMatches.push({
        id: `match-${currentId}`,
        uuid: uuidv4(),
        label: `WQ${index}`,
        teamA: "",
        teamB: "",
        date: "",
        time: "",
        court: "",
        status: "planifié",
        duration: 90,
        type: "qualifications",
        position: { x: baseX, y: baseY + (i - currentQualifs.length) * 90 },
        winnerPoints: 0,
        loserPoints: 0,
        winnerCode: `WQ${index}`
      });
      currentId++;
    }

    setMatches([...matches, ...newMatches]);
    setNextMatchId(currentId);
  };

  const handlePaletteDragStart = (e: React.DragEvent, matchType: MatchType) => {
    e.dataTransfer.setData("text/plain", matchType);
    e.dataTransfer.effectAllowed = "move";
    setIsDraggingFromPalette(true);
  };

  const handlePaletteDragEnd = () => {
    setIsDraggingFromPalette(false);
  };

  const updateMatch = (updatedMatch: Match) => {
    // Vérifier si le match vient d'être terminé avec des scores
    const oldMatch = matches.find(m => m.id === updatedMatch.id);
    const justCompleted = oldMatch && oldMatch.status !== "terminé" && updatedMatch.status === "terminé";

    // Toujours propager le champ 'court' (nom du terrain)
    setMatches(matches.map(m => m.id === updatedMatch.id ? { ...updatedMatch, court: updatedMatch.court } : m));
    setSelectedMatch({ ...updatedMatch, court: updatedMatch.court });

    // Si le match vient d'être terminé, propager les résultats
    if (justCompleted && updatedMatch.scoreA !== undefined && updatedMatch.scoreB !== undefined) {
      const { updatedMatches, updatedBrackets: newBrackets, updatedLoserBrackets: newLoserBrackets } = 
        propagateMatchResults(updatedMatch, matches, pools, brackets, loserBrackets);
      
      setMatches(newBrackets.length > 0 || newLoserBrackets.length > 0 ? updatedMatches : matches);
      if (newBrackets.length > 0) setBrackets(newBrackets);
      if (newLoserBrackets.length > 0) setLoserBrackets(newLoserBrackets);
    }
  };

  const updatePoolMatch = (updatedMatch: Match) => {
    const pool = pools.find(p => p.matches.some(m => m.id === updatedMatch.id));
    if (pool) {
      // Toujours propager le champ 'court' (nom du terrain)
      const oldMatch = pool.matches.find(m => m.id === updatedMatch.id);
      const justCompleted = oldMatch && oldMatch.status !== "terminé" && updatedMatch.status === "terminé";

      const updatedPool = {
        ...pool,
        matches: pool.matches.map(m => m.id === updatedMatch.id ? { ...updatedMatch, court: updatedMatch.court } : m)
      };
      updatePool(updatedPool);
      setSelectedPoolMatch({ ...updatedMatch, court: updatedMatch.court });

      // Si le match vient d'être terminé, recalculer le classement de la poule
      if (justCompleted) {
        // Le classement sera automatiquement recalculé par la fonction calculatePoolStandings
        // quand on affichera la visualisation du tournoi
      }
    }
  };

  const updatePool = (updatedPool: Pool) => {
    setPools(pools.map(p => p.id === updatedPool.id ? updatedPool : p));
    setSelectedPool(updatedPool);
  };

  const addTeamToPool = (poolId: string, teamName: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool && !pool.teams.includes(teamName)) {
      const updatedPool = {
        ...pool,
        teams: [...pool.teams, teamName]
      };
      updatePool(updatedPool);
      generatePoolMatches(updatedPool);
    }
  };

  const removeTeamFromPool = (poolId: string, teamName: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool) {
      const updatedPool = {
        ...pool,
        teams: pool.teams.filter(t => t !== teamName)
      };
      updatePool(updatedPool);
      generatePoolMatches(updatedPool);
    }
  };

  const generatePoolMatches = (pool: Pool) => {
      if (pool.teams.length < 2) return;

      // Sauvegarde des anciens matchs pour récupérer les UUIDs/IDs
      const oldMatches = pool.matches || [];

      const newMatches: Match[] = [];
      for (let i = 0; i < pool.teams.length; i++) {
        for (let j = i + 1; j < pool.teams.length; j++) {
          const teamA = pool.teams[i];
          const teamB = pool.teams[j];
          
          // Cherche si ce match existait déjà
          const existing = oldMatches.find(m => 
              (m.teamA === teamA && m.teamB === teamB) || 
              (m.teamA === teamB && m.teamB === teamA)
          );

          newMatches.push({
            id: existing?.id || `${pool.id}-${i}-${j}`,
            uuid: existing?.uuid || uuidv4(), // Garde l'UUID existant ou en crée un nouveau
            teamA: teamA,
            teamB: teamB,
            date: existing?.date || "",
            time: existing?.time || "",
            court: existing?.court || "",
            status: existing?.status || "planifié",
            duration: existing?.duration || 90,
            type: "poule",
            position: { x: 0, y: 0 }
          });
        }
      }
      
      const updatedPool = {
        ...pool,
        matches: newMatches
      };
      updatePool(updatedPool);
  };

  // Fonctions de gestion des brackets
  const updateBracket = (updatedBracket: Bracket) => {
    setBrackets(brackets.map(b => b.id === updatedBracket.id ? updatedBracket : b));
    setSelectedBracket(updatedBracket);
  };

  const addTeamToBracket = (bracketId: string, teamName: string) => {
    const bracket = brackets.find(b => b.id === bracketId);
    if (bracket && !bracket.teams.includes(teamName)) {
      const updatedBracket = {
        ...bracket,
        teams: [...bracket.teams, teamName]
      };
      updateBracket(updatedBracket);
      generateBracketMatches(updatedBracket);
    }
  };

  const removeTeamFromBracket = (bracketId: string, teamName: string) => {
    const bracket = brackets.find(b => b.id === bracketId);
    if (bracket) {
      const updatedBracket = {
        ...bracket,
        teams: bracket.teams.filter(t => t !== teamName)
      };
      updateBracket(updatedBracket);
      generateBracketMatches(updatedBracket);
    }
  };

  const generateBracketMatches = (bracket: Bracket) => {
      const roundOrder: BracketMatchType[] = ["quarts", "demi", "petite-finale", "finale"];
      const enabledRounds = [...bracket.enabledRounds].sort((a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b));
      
      if (enabledRounds.length === 0) return;

      const oldMatches = bracket.matches || [];

      // Helper pour récupérer un match existant
      const getPersistentMatch = (type: BracketMatchType, code: string, defaults: Partial<Match>): Match => {
        const existing = oldMatches.find(m => m.bracketMatchType === type && m.winnerCode === code);
        return {
          ...defaults,
          id: existing?.id || defaults.id || `${bracket.id}-${code}`,
          uuid: existing?.uuid || uuidv4(), // Conservation UUID
          date: existing?.date || "",
          time: existing?.time || "",
          court: existing?.court || "",
          status: existing?.status || "planifié",
          duration: existing?.duration || 90,
        } as Match;
      };

      const newMatches: Match[] = [];

      // (Logique de création identique, mais utilise getPersistentMatch)
      if (enabledRounds.includes("quarts")) {
        for (let i = 1; i <= 4; i++) {
          newMatches.push(getPersistentMatch("quarts", `WQF${i}`, {
            teamA: bracket.teams[(i - 1) * 2] || "",
            teamB: bracket.teams[(i - 1) * 2 + 1] || "",
            type: "phase-finale",
            bracketMatchType: "quarts",
            winnerCode: `WQF${i}`,
            loserCode: `LQF${i}`,
            winnerDestination: `SF${Math.ceil(i / 2)}`,
            loserDestination: bracket.loserToLoserBracket ? "LOSER_BRACKET" : undefined,
          }));
        }
      }

      if (enabledRounds.includes("demi")) {
        for (let i = 1; i <= 2; i++) {
          const hasQuarts = enabledRounds.includes("quarts");
          newMatches.push(getPersistentMatch("demi", `WSF${i}`, {
            teamA: hasQuarts ? `WQF${(i - 1) * 2 + 1}` : (bracket.teams[(i - 1) * 2] || ""),
            teamB: hasQuarts ? `WQF${(i - 1) * 2 + 2}` : (bracket.teams[(i - 1) * 2 + 1] || ""),
            type: "phase-finale",
            bracketMatchType: "demi",
            winnerCode: `WSF${i}`,
            winnerDestination: "F",
            loserCode: `LSF${i}`,
            loserDestination: enabledRounds.includes("petite-finale") ? "PF" : undefined,
          }));
        }
      }

      if (enabledRounds.includes("finale")) {
        newMatches.push(getPersistentMatch("finale", "WF", {
          teamA: enabledRounds.includes("demi") ? "WSF1" : (bracket.teams[0] || ""),
          teamB: enabledRounds.includes("demi") ? "WSF2" : (bracket.teams[1] || ""),
          type: "phase-finale",
          bracketMatchType: "finale",
          winnerCode: "WF",
        }));
      }

      if (enabledRounds.includes("petite-finale")) {
        newMatches.push(getPersistentMatch("petite-finale", "WPF", {
          teamA: enabledRounds.includes("demi") ? "LSF1" : "",
          teamB: enabledRounds.includes("demi") ? "LSF2" : "",
          type: "phase-finale",
          bracketMatchType: "petite-finale",
          winnerCode: "WPF",
        }));
      }

      updateBracket({ ...bracket, matches: newMatches });
  };

  const updateBracketMatch = (updatedMatch: Match) => {
    const bracket = brackets.find(b => b.matches.some(m => m.id === updatedMatch.id));
    if (bracket) {
      // Toujours propager le champ 'court' (nom du terrain)
      const oldMatch = bracket.matches.find(m => m.id === updatedMatch.id);
      const justCompleted = oldMatch && oldMatch.status !== "terminé" && updatedMatch.status === "terminé";

      const updatedBracket = {
        ...bracket,
        matches: bracket.matches.map(m => m.id === updatedMatch.id ? { ...updatedMatch, court: updatedMatch.court } : m)
      };
      updateBracket(updatedBracket);
      setSelectedBracketMatch({ ...updatedMatch, court: updatedMatch.court });

      // Si le match vient d'être terminé, propager les résultats
      if (justCompleted && updatedMatch.scoreA !== undefined && updatedMatch.scoreB !== undefined) {
        const { updatedBrackets: newBrackets, updatedLoserBrackets: newLoserBrackets } = 
          propagateMatchResults(updatedMatch, matches, pools, brackets, loserBrackets);
        
        if (newBrackets.length > 0) setBrackets(newBrackets);
        if (newLoserBrackets.length > 0) setLoserBrackets(newLoserBrackets);
      }
    }
  };

  // Fonctions de gestion des loser brackets
  const updateLoserBracket = (updatedLoserBracket: LoserBracket) => {
    setLoserBrackets(loserBrackets.map(lb => lb.id === updatedLoserBracket.id ? updatedLoserBracket : lb));
    setSelectedLoserBracket(updatedLoserBracket);
  };

  const addTeamToLoserBracket = (loserBracketId: string, teamName: string) => {
    const loserBracket = loserBrackets.find(lb => lb.id === loserBracketId);
    if (loserBracket && !loserBracket.teams.includes(teamName)) {
      const updatedLoserBracket = {
        ...loserBracket,
        teams: [...loserBracket.teams, teamName]
      };
      updateLoserBracket(updatedLoserBracket);
      generateLoserBracketMatches(updatedLoserBracket);
    }
  };

  const removeTeamFromLoserBracket = (loserBracketId: string, teamName: string) => {
    const loserBracket = loserBrackets.find(lb => lb.id === loserBracketId);
    if (loserBracket) {
      const updatedLoserBracket = {
        ...loserBracket,
        teams: loserBracket.teams.filter(t => t !== teamName)
      };
      updateLoserBracket(updatedLoserBracket);
      generateLoserBracketMatches(updatedLoserBracket);
    }
  };

  const generateLoserBracketMatches = (loserBracket: LoserBracket) => {
      const enabledRounds = loserBracket.enabledRounds;
      if (enabledRounds.length === 0) return;

      const oldMatches = loserBracket.matches || [];
      
      // Helper pour trouver match existant
      const getPersistentMatch = (type: LoserBracketMatchType, code: string, defaults: Partial<Match>): Match => {
          const existing = oldMatches.find(m => m.loserBracketMatchType === type && m.winnerCode === code);
          return {
              ...defaults,
              id: existing?.id || defaults.id || `${loserBracket.id}-${code}`,
              uuid: existing?.uuid || uuidv4(), // Conservation UUID
              date: existing?.date || "",
              time: existing?.time || "",
              court: existing?.court || "",
              status: existing?.status || "planifié",
              duration: existing?.duration || 90,
          } as Match;
      };

      const hasRound1 = enabledRounds.includes("loser-round-1");
      const hasRound2 = enabledRounds.includes("loser-round-2");
      const hasRound3 = enabledRounds.includes("loser-round-3");
      const hasFinale = enabledRounds.includes("loser-finale");

      const newMatches: Match[] = [];
      
      if (hasRound1) {
        const round1Count = Math.floor(loserBracket.teams.length / 2);
        for (let i = 1; i <= round1Count; i++) {
          const teamIndex = (i - 1) * 2;
          newMatches.push(getPersistentMatch("loser-round-1", `WLR1-${i}`, {
            teamA: loserBracket.teams[teamIndex] || "",
            teamB: loserBracket.teams[teamIndex + 1] || "",
            type: "loser-bracket",
            loserBracketMatchType: "loser-round-1",
            winnerCode: `WLR1-${i}`,
            loserCode: `LLR1-${i}`,
            winnerDestination: hasRound2 ? "LR2" : (hasFinale ? "LF" : undefined),
            position: { x: 0, y: 0 }
          }));
        }
      }
      
      // (Ajouter la même logique getPersistentMatch pour Round 2, 3 et Finale selon ton code existant)
      // Exemple pour Round 2 :
      if (hasRound2) {
        for (let i = 1; i <= 2; i++) {
          newMatches.push(getPersistentMatch("loser-round-2", `WLR2-${i}`, {
            teamA: hasRound1 ? `WLR1-${i * 2 - 1}` : (loserBracket.teams[i * 2 - 2] || ""),
            teamB: hasRound1 ? `WLR1-${i * 2}` : (loserBracket.teams[i * 2 - 1] || ""),
            type: "loser-bracket",
            loserBracketMatchType: "loser-round-2",
            winnerCode: `WLR2-${i}`,
            winnerDestination: hasRound3 ? "LR3" : (hasFinale ? "LF" : undefined),
          }));
        }
      }

      // Round 3 et Finale idem...
      if (hasRound3) {
          newMatches.push(getPersistentMatch("loser-round-3", "WLR3", {
              teamA: hasRound2 ? "WLR2-1" : (loserBracket.teams[0] || ""),
              teamB: hasRound2 ? "WLR2-2" : (loserBracket.teams[1] || ""),
              type: "loser-bracket",
              loserBracketMatchType: "loser-round-3",
              winnerCode: "WLR3",
              winnerDestination: hasFinale ? "LF" : undefined,
          }));
      }

      if (hasFinale) {
          let teamA = "", teamB = "";
          if (hasRound3) { teamA = "WLR3"; teamB = loserBracket.teams[loserBracket.teams.length - 1] || ""; }
          else if (hasRound2) { teamA = "WLR2-1"; teamB = "WLR2-2"; }
          else if (hasRound1) { teamA = "WLR1-1"; teamB = "WLR1-2"; }
          else { teamA = loserBracket.teams[0] || ""; teamB = loserBracket.teams[1] || ""; }

          newMatches.push(getPersistentMatch("loser-finale", "WLF", {
              teamA, teamB,
              type: "loser-bracket",
              loserBracketMatchType: "loser-finale",
              winnerCode: "WLF",
          }));
      }

      const updatedLoserBracket = {
        ...loserBracket,
        matches: newMatches
      };
      updateLoserBracket(updatedLoserBracket);
  };

  const updateLoserBracketMatch = (updatedMatch: Match) => {
    const loserBracket = loserBrackets.find(lb => lb.matches.some(m => m.id === updatedMatch.id));
    if (loserBracket) {
      // Toujours propager le champ 'court' (nom du terrain)
      const oldMatch = loserBracket.matches.find(m => m.id === updatedMatch.id);
      const justCompleted = oldMatch && oldMatch.status !== "terminé" && updatedMatch.status === "terminé";

      const updatedLoserBracket = {
        ...loserBracket,
        matches: loserBracket.matches.map(m => m.id === updatedMatch.id ? { ...updatedMatch, court: updatedMatch.court } : m)
      };
      updateLoserBracket(updatedLoserBracket);
      setSelectedLoserBracketMatch({ ...updatedMatch, court: updatedMatch.court });

      // Si le match vient d'être terminé, propager les résultats
      if (justCompleted && updatedMatch.scoreA !== undefined && updatedMatch.scoreB !== undefined) {
        const { updatedLoserBrackets: newLoserBrackets } = 
          propagateMatchResults(updatedMatch, matches, pools, brackets, loserBrackets);
        
        if (newLoserBrackets.length > 0) setLoserBrackets(newLoserBrackets);
      }
    }
  };

  const deleteMatch = (matchId: string) => {
    setMatches(matches.filter(m => m.id !== matchId));
    setSelectedMatch(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedMatch(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFromPalette(false);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Vérifier si c'est un drag depuis la palette
    const paletteData = e.dataTransfer.getData("text/plain");
    if (paletteData && (paletteData === "poule" || paletteData === "qualifications" || paletteData === "phase-finale" || paletteData === "loser-bracket" || paletteData === "finale" || paletteData === "demi-finale" || paletteData === "quarts" || paletteData === "huitiemes" || paletteData === "petite-finale")) {
      addNewMatchFromPalette(paletteData as MatchType, x, y);
      return;
    }

    // Sinon, c'est un déplacement d'élément existant
    if (!draggedMatch) return;
    
    // Vérifier si c'est une poule
    const pool = pools.find(p => p.id === draggedMatch);
    if (pool) {
      setPools(pools.map(p => 
        p.id === draggedMatch 
          ? { ...p, position: { x, y } }
          : p
      ));
    } else {
      // Vérifier si c'est un bracket
      const bracket = brackets.find(b => b.id === draggedMatch);
      if (bracket) {
        setBrackets(brackets.map(b => 
          b.id === draggedMatch 
            ? { ...b, position: { x, y } }
            : b
        ));
      } else {
        // Vérifier si c'est un loser bracket
        const loserBracket = loserBrackets.find(lb => lb.id === draggedMatch);
        if (loserBracket) {
          setLoserBrackets(loserBrackets.map(lb => 
            lb.id === draggedMatch 
              ? { ...lb, position: { x, y } }
              : lb
          ));
        } else {
          // C'est un match
          setMatches(matches.map(match => 
            match.id === draggedMatch 
              ? { ...match, position: { x, y } }
              : match
          ));
        }
      }
    }
    setDraggedMatch(null);
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case "planifié": return "bg-blue-100 text-blue-800";
      case "en-cours": return "bg-yellow-100 text-yellow-800";
      case "terminé": return "bg-green-100 text-green-800";
      case "annulé": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: MatchType) => {
    switch (type) {
      case "poule": return "bg-purple-100 text-purple-800";
      case "qualifications": return "bg-indigo-100 text-indigo-800";
      case "phase-finale": return "bg-orange-100 text-orange-800";
      case "loser-bracket": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleResetMatches = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer toutes les tuiles ? Cette action est irréversible.")) {
      return;
    }

    try {
      // 1. Si on a un tournamentId, supprimer via l'API backend
      if (tournamentId) {
        console.log(`🗑️ Suppression de la structure du tournoi ${tournamentId}...`);
        
        const response = await fetch(`http://localhost:8000/tournament_structure/${tournamentId}/matches`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ Structure supprimée côté serveur:", result);
        } else {
          const errorText = await response.text();
          console.error(`⚠️ Erreur API: ${response.status} - ${errorText}`);
          // On continue quand même pour nettoyer le frontend
        }
      } else {
        console.log("⚠️ Pas de tournamentId, suppression locale uniquement");
      }

      // 2. Réinitialiser tous les états frontend
      setMatches([]);
      setPools([]);
      setBrackets([]);
      setLoserBrackets([]);
      setSelectedMatch(null);
      setSelectedPool(null);
      setSelectedPoolMatch(null);
      setSelectedBracket(null);
      setSelectedBracketMatch(null);
      setSelectedLoserBracket(null);
      setSelectedLoserBracketMatch(null);
      setNextMatchId(1);

      console.log("✅ Toutes les tuiles ont été supprimées");
      alert("Toutes les tuiles et les matchs ont été supprimés avec succès !");
    } catch (err: any) {
      console.error("❌ Erreur lors de la réinitialisation:", err);
      alert(`Impossible de réinitialiser les tuiles: ${err.message}`);
    }
  };

  // Fonction pour mapper les bracket_type du frontend vers le backend
  const mapBracketTypeToSQL = (frontendType: BracketMatchType | LoserBracketMatchType | null | undefined): string | null => {
    if (!frontendType) return null;
    
    const mapping: Record<string, string> = {
      'quarts': 'quarterfinal',
      'demi': 'semifinal',
      'finale': 'final',
      'petite-finale': 'third_place',
      'loser-round-1': 'loser_round_1',
      'loser-round-2': 'loser_round_2',
      'loser-round-3': 'loser_round_3',
      'loser-finale': 'loser_final'
    };
    
    return mapping[frontendType] || null;
  };

  // 2. Fonction de sauvegarde
  const handleSaveLayout = async () => {
            // Vérification : tous les matchs doivent avoir une date et une heure
            const allMatches = [
              ...matches,
              ...pools.flatMap(p => p.matches),
              ...brackets.flatMap(b => b.matches),
              ...loserBrackets.flatMap(lb => lb.matches),
            ];
            const missingDateTime = allMatches.filter(m => !m.date || !m.time);
            if (missingDateTime.length > 0) {
              alert("Tous les matchs doivent avoir une date et une heure !");
              return;
            }
      const rawSportId = params.id;
      const sportIdStr = Array.isArray(rawSportId) ? rawSportId[0] : rawSportId;

      if (!sportIdStr) {
        alert("ID du sport introuvable");
        return;
      }

      const mapStatus = (s: string) => {
        const map: Record<string, string> = {
          "planifié": "upcoming",
          "en-cours": "in_progress",
          "terminé": "completed",
        };
        return map[s] || "upcoming";
      };

      try {
        // Construction du payload SANS générer de nouveaux UUIDs
        const structure = {
          qualification_matches: matches
            .filter((m) => m.type === "qualifications")
            .map((m) => ({
              uuid: m.uuid, // Utilise strictement l'UUID du state
              id: (m.id && /^\d+$/.test(m.id)) ? parseInt(m.id) : null, // ID SQL si dispo
              match_type: "qualification",
              label: m.label || m.winnerCode || null,
              status: mapStatus(m.status),
              court: m.court || null,
              scheduled_datetime: (m.date && m.time)
                ? `${m.date}T${m.time}:00`
                : (() => {
                    // Valeur par défaut : aujourd'hui à 09:00
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}T09:00:00`;
                  })(),
              duration: m.duration || 90,
              team_a_source: m.teamA || null,
              team_b_source: m.teamB || null,
              winner_destination_match_id: m.winner_destination_match_id || null,
              loser_destination_match_id: m.loser_destination_match_id || null,
              winner_destination_slot: m.winner_destination_slot || null,
              loser_destination_slot: m.loser_destination_slot || null,
            })),

          pools: pools.map((pool, pIdx) => ({
            name: pool.name,
            display_order: pIdx + 1,
            matches: pool.matches.map((m) => ({
              uuid: m.uuid, // Strict
              id: (m.id && /^\d+$/.test(m.id)) ? parseInt(m.id) : null,
              match_type: "pool",
              label: m.label || m.winnerCode || null,
              status: mapStatus(m.status),
              court: m.court || null,
              scheduled_datetime: (m.date && m.time)
                ? `${m.date}T${m.time}:00`
                : (() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}T09:00:00`;
                  })(),
              duration: m.duration || 90,
              team_a_source: m.teamA || null,
              team_b_source: m.teamB || null,
              winner_destination_match_id: m.winner_destination_match_id || null,
              loser_destination_match_id: m.loser_destination_match_id || null,
              winner_destination_slot: m.winner_destination_slot || null,
              loser_destination_slot: m.loser_destination_slot || null,
            })),
          })),

          brackets: brackets.map((b) => ({
            name: b.name,
            matches: b.matches.map((m) => ({
              uuid: m.uuid, // Strict
              id: (m.id && /^\d+$/.test(m.id)) ? parseInt(m.id) : null,
              match_type: "bracket",
              bracket_type: mapBracketTypeToSQL(m.bracketMatchType),
              label: m.label || m.winnerCode,
              status: mapStatus(m.status),
              court: m.court || null,
              scheduled_datetime: (m.date && m.time)
                ? `${m.date}T${m.time}:00`
                : (() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}T09:00:00`;
                  })(),
              duration: m.duration || 90,
              team_a_source: m.teamA || null,
              team_b_source: m.teamB || null,
              winner_destination_match_id: m.winner_destination_match_id || null,
              loser_destination_match_id: m.loser_destination_match_id || null,
              winner_destination_slot: m.winner_destination_slot || null,
              loser_destination_slot: m.loser_destination_slot || null,
            })),
          })),

          loserBrackets: loserBrackets.map((lb) => ({
            name: lb.name,
            matches: lb.matches.map((m) => ({
              uuid: m.uuid, // Strict
              id: (m.id && /^\d+$/.test(m.id)) ? parseInt(m.id) : null,
              match_type: "bracket",
              bracket_type: mapBracketTypeToSQL(m.bracketMatchType),
              label: m.label || m.winnerCode,
              status: mapStatus(m.status),
              court: m.court || null,
              scheduled_datetime: (m.date && m.time)
                ? `${m.date}T${m.time}:00`
                : (() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}T09:00:00`;
                  })(),
              duration: m.duration || 90,
              team_a_source: m.teamA || null,
              team_b_source: m.teamB || null,
              winner_destination_match_id: m.winner_destination_match_id || null,
              loser_destination_match_id: m.loser_destination_match_id || null,
              winner_destination_slot: m.winner_destination_slot || null,
              loser_destination_slot: m.loser_destination_slot || null,
            })),
          })),
        };

        const sportName = sport?.name || "Tournoi";
        const tournamentName = `${sportName} - ${new Date().getFullYear()}`;

        const url = tournamentId 
          ? `http://localhost:8000/tournaments/${tournamentId}/structure` 
          : `http://localhost:8000/tournaments`;

        const payload = tournamentId 
          ? structure 
          : { 
              // ✅ Champs obligatoires ajoutés
              name: tournamentName,
              sport_id: parseInt(sportIdStr),
              created_by_user_id: 1, // ⚠️ TODO: Remplacer par le vrai user ID
              tournament_type: "qualifications",
              status: "scheduled",
              // Structure optionnelle
              ...structure 
            };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Serveur : ${errorText}`);
        }

        const result = await response.json();

        // --- SYNCHRONISATION IMPORTANTE ---
        // On met à jour le state avec les vrais ID SQL pour la prochaine sauvegarde
        if (result.matches && Array.isArray(result.matches)) {
          // Créer une map pour accès rapide : UUID -> ID Backend
          const dbMatchMap = new Map();
          result.matches.forEach((m: any) => {
              if(m.uuid) dbMatchMap.set(m.uuid, m.id);
          });

          const syncMatchWithDB = (localM: Match) => {
            if (localM.uuid && dbMatchMap.has(localM.uuid)) {
              // Remplace l'ID temporaire "match-x" par l'ID SQL "42"
              return { ...localM, id: dbMatchMap.get(localM.uuid).toString() };
            }
            return localM;
          };

          setMatches(prev => prev.map(syncMatchWithDB));
          
          setPools(prev => prev.map(p => ({
            ...p,
            matches: p.matches.map(syncMatchWithDB)
          })));

          setBrackets(prev => prev.map(b => ({
            ...b,
            matches: b.matches.map(syncMatchWithDB)
          })));

          setLoserBrackets(prev => prev.map(lb => ({
            ...lb,
            matches: lb.matches.map(syncMatchWithDB)
          })));
        }

        if (!tournamentId && result.data?.id) {
          setTournamentId(result.data.id);
        }

        alert("✅ Tournoi enregistré et synchronisé !");
      } catch (err: any) {
        console.error("Save error:", err);
        alert("❌ Erreur : " + err.message);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
            <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-xl font-bold text-gray-900">
              {loading ? "Chargement..." : sport ? `Tournoi ${sport.name}` : "Tournoi introuvable"}
            </h1>
            <p className="text-sm text-gray-500">Configuration des matchs</p>
            </div>

            <button
            onClick={() => router.push("/configuration-coupe")}
            className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Retour"
            >
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 20 20"
              stroke="currentColor"
            >
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4l-6 6m0 0l6 6m-6-6h14"
              />
            </svg>
            <span className="text-blue-700 font-medium">Retour</span>
            </button>

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Glissez une tuile depuis la palette pour créer un match
            </div>

            <button
              onClick={handleResetMatches}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow hover:bg-red-700 transition text-sm"
              title="Réinitialiser tous les matchs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Réinitialiser</span>
            </button>

            <button
              onClick={handleSaveLayout}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Zone principale - Canvas des matchs */}
        <div 
          className={`flex-1 relative bg-gray-100 overflow-hidden ${isDraggingFromPalette ? 'bg-blue-50' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 bg-dot-pattern opacity-30"></div>
          
          {/* Grille de fond */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>

          {/* Tuiles de matchs */}
          {matches.map((match) => (
            <div
              key={match.id}
              draggable
              onDragStart={(e) => handleDragStart(e, match.id)}
              onClick={() => setSelectedMatch(match)}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-72 cursor-move transition-all hover:shadow-xl ${
                selectedMatch?.id === match.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              style={{
                left: match.position.x,
                top: match.position.y,
                minHeight: '160px'
              }}
            >
              {/* Header du match */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(match.type)}`}>
                    {match.type === "qualifications" ? "Qualifs" : 
                     match.type === "poule" ? "Poule" :
                     match.type === "phase-finale" ? "Phase Finale" :
                     match.type === "loser-bracket" ? "Loser Bracket" :
                     "Match"}
                  </span>
                  {match.type === "qualifications" && match.winnerCode && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 text-black">
                      {match.winnerCode}
                    </span>
                  )}
                  {match.type === "loser-bracket" && match.loserBracketMatchType && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-black">
                      {match.loserBracketMatchType === "loser-round-1" ? "Repêchage" :
                       match.loserBracketMatchType === "loser-round-2" ? "Demi LB" :
                       match.loserBracketMatchType === "loser-round-3" ? "7e place" :
                       match.loserBracketMatchType === "loser-finale" ? "5e place" : ""}
                    </span>
                  )}
                  {match.type === "phase-finale" && match.bracketMatchType && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-50 text-black">
                      {match.bracketMatchType === "quarts" ? "QF" :
                       match.bracketMatchType === "demi" ? "SF" :
                       match.bracketMatchType === "petite-finale" ? "3e place" :
                       match.bracketMatchType === "finale" ? "Finale" : ""}
                    </span>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(match.status)}`}>
                  {match.status}
                </span>
              </div>

              {/* Équipes */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900">
                    {match.teamA || "Équipe A"}
                  </span>
                  {match.scoreA !== undefined && (
                    <span className="text-lg font-bold text-gray-900">{match.scoreA}</span>
                  )}
                </div>
                <div className="text-center text-xs text-gray-500 my-1">VS</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">
                    {match.teamB || "Équipe B"}
                  </span>
                  {match.scoreB !== undefined && (
                    <span className="text-lg font-bold text-gray-900">{match.scoreB}</span>
                  )}
                </div>
              </div>

              {/* Informations du match */}
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {match.date && match.time ? `${match.date} à ${match.time}` : "Date/heure non définie"}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {match.court || "Terrain non défini"}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {match.duration} min
                </div>
                {/* Destinations vainqueur/perdant */}
                {(match.winner_destination_match_id || match.loser_destination_match_id) && (
                  <div className="flex flex-col gap-1 mt-1">
                    {match.winner_destination_match_id && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Vainqueur →</span>
                        <span className="font-mono">{match.winner_destination_match_id}</span>
                      </div>
                    )}
                    {match.loser_destination_match_id && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">Perdant →</span>
                        <span className="font-mono">{match.loser_destination_match_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Tuiles de poules */}
          {pools.map((pool) => (
            <div
              key={pool.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pool.id)}
              onClick={() => {setSelectedPool(pool); setSelectedMatch(null);}}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-80 cursor-move transition-all hover:shadow-xl ${
                selectedPool?.id === pool.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-200'
              }`}
              style={{
                left: pool.position.x,
                top: pool.position.y,
                minHeight: '200px'
              }}
            >
              {/* Header de la poule */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                  {pool.name}
                </span>
                <span className="text-xs text-gray-500">{pool.teams.length} équipes</span>
              </div>

              {/* Équipes de la poule */}
              <div className="mb-3">
                <div className="text-xs font-medium text-black mb-2">Équipes :</div>
                {pool.teams.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {pool.teams.map((team, index) => {
                      const isQualifWinner = team.startsWith('WQ');
                      return (
                        <span 
                          key={index} 
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            isQualifWinner 
                              ? 'bg-indigo-200 text-black' 
                              : 'bg-purple-200 text-black'
                          }`}
                        >
                          {team}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
                )}
              </div>

              {/* Matchs générés */}
              <div>
                <div className="text-xs font-medium text-black mb-2">
                  Matchs : {pool.matches.length}
                </div>
                {pool.matches.length > 0 ? (
                  <div className="space-y-1">
                    {pool.matches.slice(0, 3).map((match, index) => (
                      <div 
                        key={index} 
                        className="text-xs text-black flex flex-col p-1 rounded hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPoolMatch(match);
                          setSelectedMatch(null);
                          setSelectedPool(null);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span>{match.teamA} vs {match.teamB}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                        {(match.winner_destination_match_id || match.loser_destination_match_id) && (
                          <div className="flex gap-2 mt-0.5">
                            {match.winner_destination_match_id && (
                              <span className="px-1 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Vainqueur → {match.winner_destination_match_id}</span>
                            )}
                            {match.loser_destination_match_id && (
                              <span className="px-1 py-0.5 rounded bg-red-100 text-red-800 font-semibold">Perdant → {match.loser_destination_match_id}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {pool.matches.length > 3 && (
                      <div 
                        className="text-xs text-purple-600 italic cursor-pointer hover:text-purple-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPool(pool);
                          setSelectedMatch(null);
                          setSelectedPoolMatch(null);
                        }}
                      >
                        +{pool.matches.length - 3} autres matchs... (cliquez pour voir tous)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Ajoutez des équipes pour générer les matchs</div>
                )}
              </div>
            </div>
          ))}

          {/* Tuiles de brackets (Phase Finale) */}
          {brackets.map((bracket) => (
            <div
              key={bracket.id}
              draggable
              onDragStart={(e) => handleDragStart(e, bracket.id)}
              onClick={() => {setSelectedBracket(bracket); setSelectedMatch(null); setSelectedPool(null);}}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-80 cursor-move transition-all hover:shadow-xl ${
                selectedBracket?.id === bracket.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200'
              }`}
              style={{
                left: bracket.position.x,
                top: bracket.position.y,
                minHeight: '200px'
              }}
            >
              {/* Header du bracket */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                  {bracket.name}
                </span>
                <span className="text-xs text-gray-500">{bracket.teams.length} équipes</span>
              </div>

              {/* Rounds activés */}
              <div className="mb-3">
                <div className="text-xs font-medium text-black mb-2">Rounds activés :</div>
                {bracket.enabledRounds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {bracket.enabledRounds.map((round, index) => {
                      const roundLabels: Record<BracketMatchType, string> = {
                        "quarts": "Quarts",
                        "demi": "Demi-finales",
                        "petite-finale": "Petite finale",
                        "finale": "Finale"
                      };
                      return (
                        <span 
                          key={index} 
                          className="px-2 py-1 text-xs rounded font-medium bg-orange-200 text-black"
                        >
                          {roundLabels[round]}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucun round sélectionné</div>
                )}
              </div>

              {/* Équipes du bracket */}
              <div className="mb-3">
                <div className="text-xs font-medium text-black mb-2">Équipes :</div>
                {bracket.teams.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {bracket.teams.slice(0, 8).map((team, index) => {
                      const isFromPool = team.startsWith('P') && team.includes('-');
                      const isFromQualif = team.startsWith('WQ');
                      return (
                        <span 
                          key={index} 
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            isFromQualif ? 'bg-indigo-200 text-black' : 
                            isFromPool ? 'bg-purple-200 text-black' : 
                            'bg-orange-200 text-black'
                          }`}
                        >
                          {team}
                        </span>
                      );
                    })}
                    {bracket.teams.length > 8 && (
                      <span className="px-2 py-1 text-xs italic text-gray-500">
                        +{bracket.teams.length - 8}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
                )}
              </div>

              {/* Matchs générés */}
              <div>
                <div className="text-xs font-medium text-black mb-2">
                  Matchs : {bracket.matches.length}
                </div>
                {bracket.matches.length > 0 ? (
                  <div className="space-y-1">
                    {bracket.matches.slice(0, 3).map((match, index) => {
                      const matchTypeLabels: Record<BracketMatchType, string> = {
                        "quarts": "QF",
                        "demi": "SF",
                        "petite-finale": "PF",
                        "finale": "F"
                      };
                      const matchLabel = match.bracketMatchType ? matchTypeLabels[match.bracketMatchType] : "";
                      return (
                        <div 
                          key={index} 
                          className="text-xs text-black flex flex-col p-1 rounded hover:bg-orange-50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBracketMatch(match);
                            setSelectedMatch(null);
                            setSelectedPool(null);
                            setSelectedBracket(null);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span>{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                            <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(match.status)}`}>
                              {match.status}
                            </span>
                          </div>
                          {(match.winner_destination_match_id || match.loser_destination_match_id) && (
                            <div className="flex gap-2 mt-0.5">
                              {match.winner_destination_match_id && (
                                <span className="px-1 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Vainqueur → {match.winner_destination_match_id}</span>
                              )}
                              {match.loser_destination_match_id && (
                                <span className="px-1 py-0.5 rounded bg-red-100 text-red-800 font-semibold">Perdant → {match.loser_destination_match_id}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {bracket.matches.length > 3 && (
                      <div 
                        className="text-xs text-orange-600 italic cursor-pointer hover:text-orange-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBracket(bracket);
                          setSelectedMatch(null);
                          setSelectedPoolMatch(null);
                          setSelectedBracketMatch(null);
                        }}
                      >
                        +{bracket.matches.length - 3} autres matchs... (cliquez pour voir tous)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Configurez les rounds et équipes pour générer les matchs</div>
                )}
              </div>
            </div>
          ))}

          {/* Tuiles de loser brackets */}
          {loserBrackets.map((loserBracket) => (
            <div
              key={loserBracket.id}
              draggable
              onDragStart={(e) => handleDragStart(e, loserBracket.id)}
              onClick={() => {setSelectedLoserBracket(loserBracket); setSelectedMatch(null); setSelectedPool(null); setSelectedBracket(null);}}
              className={`absolute bg-white rounded-lg shadow-lg border-2 p-4 w-80 cursor-move transition-all hover:shadow-xl ${
                selectedLoserBracket?.id === loserBracket.id ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-200'
              }`}
              style={{
                left: loserBracket.position.x,
                top: loserBracket.position.y,
                minHeight: '200px'
              }}
            >
              {/* Header du loser bracket */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-800">
                  {loserBracket.name}
                </span>
                <span className="text-xs text-gray-500">{loserBracket.teams.length} équipes</span>
              </div>

              {/* Rounds activés */}
              <div className="mb-3">
                <div className="text-xs font-medium text-black mb-2">Rounds activés :</div>
                {loserBracket.enabledRounds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {loserBracket.enabledRounds.map((round, index) => {
                      const roundLabels: Record<LoserBracketMatchType, string> = {
                        "loser-round-1": "Repêchage",
                        "loser-round-2": "Demi LB",
                        "loser-round-3": "7e place",
                        "loser-finale": "5e place"
                      };
                      return (
                        <span 
                          key={index} 
                          className="px-2 py-1 text-xs rounded font-medium bg-amber-200 text-black"
                        >
                          {roundLabels[round]}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucun round sélectionné</div>
                )}
              </div>

              {/* Équipes du loser bracket */}
              <div className="mb-3">
                <div className="text-xs font-medium text-black mb-2">Équipes (perdants) :</div>
                {loserBracket.teams.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {loserBracket.teams.slice(0, 8).map((team, index) => {
                      const isFromBracket = team.startsWith('L');
                      const isFromPool = team.includes('Poule');
                      return (
                        <span 
                          key={index} 
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            isFromBracket ? 'bg-orange-200 text-black' : 
                            isFromPool ? 'bg-purple-200 text-black' : 
                            'bg-amber-200 text-black'
                          }`}
                        >
                          {team}
                        </span>
                      );
                    })}
                    {loserBracket.teams.length > 8 && (
                      <span className="px-2 py-1 text-xs italic text-gray-500">
                        +{loserBracket.teams.length - 8}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Aucune équipe sélectionnée</div>
                )}
              </div>

              {/* Matchs générés */}
              <div>
                <div className="text-xs font-medium text-black mb-2">
                  Matchs : {loserBracket.matches.length}
                </div>
                {loserBracket.matches.length > 0 ? (
                  <div className="space-y-1">
                    {loserBracket.matches.slice(0, 3).map((match, index) => {
                      const matchTypeLabels: Record<LoserBracketMatchType, string> = {
                        "loser-round-1": "Repêchage",
                        "loser-round-2": "Demi LB",
                        "loser-round-3": "7e place",
                        "loser-finale": "5e place"
                      };
                      const matchLabel = match.loserBracketMatchType ? matchTypeLabels[match.loserBracketMatchType] : "";
                      return (
                        <div 
                          key={index} 
                          className="text-xs text-black flex flex-col p-1 rounded hover:bg-amber-50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoserBracketMatch(match);
                            setSelectedMatch(null);
                            setSelectedPool(null);
                            setSelectedBracket(null);
                            setSelectedLoserBracket(null);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span>{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                            <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(match.status)}`}>
                              {match.status}
                            </span>
                          </div>
                          {(match.winner_destination_match_id || match.loser_destination_match_id) && (
                            <div className="flex gap-2 mt-0.5">
                              {match.winner_destination_match_id && (
                                <span className="px-1 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Vainqueur → {match.winner_destination_match_id}</span>
                              )}
                              {match.loser_destination_match_id && (
                                <span className="px-1 py-0.5 rounded bg-red-100 text-red-800 font-semibold">Perdant → {match.loser_destination_match_id}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {loserBracket.matches.length > 3 && (
                      <div 
                        className="text-xs text-amber-600 italic cursor-pointer hover:text-amber-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoserBracket(loserBracket);
                          setSelectedMatch(null);
                          setSelectedPoolMatch(null);
                          setSelectedBracketMatch(null);
                          setSelectedLoserBracketMatch(null);
                        }}
                      >
                        +{loserBracket.matches.length - 3} autres matchs... (cliquez pour voir tous)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Configurez les rounds et équipes pour générer les matchs</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Panel de configuration à droite */}
        {selectedMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration du match</h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Équipes */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipe A</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  (() => {
                    const usedTeams = getUsedTeamsByPhase(matches, pools, brackets, loserBrackets, 'qualification', selectedMatch.id);
                    return (
                      <select
                        value={selectedMatch.teamA}
                        onChange={(e) => updateMatch({...selectedMatch, teamA: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      >
                        <option value="">Sélectionner une équipe</option>
                        {teams.map(team => {
                          const isUsed = usedTeams.pools.has(team.name) || 
                                        usedTeams.brackets.has(team.name) || 
                                        usedTeams.loserBrackets.has(team.name) ||
                                        (selectedMatch.teamB === team.name);
                          return (
                            <option key={team.id} value={team.name} disabled={isUsed}>
                              {team.name}{isUsed ? ' (déjà utilisé)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipe B</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  (() => {
                    const usedTeams = getUsedTeamsByPhase(matches, pools, brackets, loserBrackets, 'qualification', selectedMatch.id);
                    return (
                      <select
                        value={selectedMatch.teamB}
                        onChange={(e) => updateMatch({...selectedMatch, teamB: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      >
                        <option value="">Sélectionner une équipe</option>
                        {teams.map(team => {
                          const isUsed = usedTeams.pools.has(team.name) || 
                                        usedTeams.brackets.has(team.name) || 
                                        usedTeams.loserBrackets.has(team.name) ||
                                        (selectedMatch.teamA === team.name);
                          return (
                            <option key={team.id} value={team.name} disabled={isUsed}>
                              {team.name}{isUsed ? ' (déjà utilisé)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()
                )}
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedMatch.date ?? ""}
                    onChange={(e) => updateMatch({...selectedMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedMatch.time ?? ""}
                    onChange={(e) => updateMatch({...selectedMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  renderCourtSelect(selectedMatch, (courtName) => updateMatch({ ...selectedMatch, court: courtName }))
                )}
              </div>

              {/* Type de match */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Type de match</label>
                <select
                  value={selectedMatch.type}
                  onChange={(e) => updateMatch({...selectedMatch, type: e.target.value as MatchType})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="qualifications">Qualifications</option>
                  <option value="poule">Poule</option>
                  <option value="huitiemes">Huitièmes</option>
                  <option value="quarts">Quarts</option>
                  <option value="demi-finale">Demi-finale</option>
                  <option value="petite-finale">Petite finale</option>
                  <option value="finale">Finale</option>
                </select>
              </div>

              {/* Paramètres spécifiques aux qualifications */}
              {selectedMatch.type === "qualifications" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Nombre de matchs de qualifications
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={qualificationMatchesCount || 1}
                      onChange={(e) => {
                        const target = parseInt(e.target.value);
                        if (!isNaN(target)) {
                          adjustQualificationMatchesCount(target);
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Pour réduire le nombre, supprimez des matchs de qualifications directement sur le canevas.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Code vainqueur</label>
                    <input
                      type="text"
                      value={selectedMatch.winnerCode || ""}
                      onChange={(e) => updateMatch({ ...selectedMatch, winnerCode: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                    <p className="mt-1 text-xs text-gray-500">Exemple : WQ1, WQ2, ...</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Points vainqueur</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedMatch.winnerPoints ?? 0}
                        onChange={(e) =>
                          updateMatch({
                            ...selectedMatch,
                            winnerPoints: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Points perdant</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedMatch.loserPoints ?? 0}
                        onChange={(e) =>
                          updateMatch({
                            ...selectedMatch,
                            loserPoints: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                      />
                    </div>
                  </div>
                </>
              )}


              {/* Sélection de la destination du vainqueur/perdant (sans slot) */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#16a34a' }}>Destination Vainqueur</label>
                  <select
                    className="w-full p-2 border border-green-400 rounded-md focus:ring-green-500 focus:border-green-500 text-black bg-green-50"
                    value={selectedMatch.winner_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateMatch({
                        ...selectedMatch,
                        winner_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#dc2626' }}>Destination Perdant</label>
                  <select
                    className="w-full p-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500 text-black bg-red-50"
                    value={selectedMatch.loser_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateMatch({
                        ...selectedMatch,
                        loser_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Statut (lecture seule - géré par le backend) */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <div className={`w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-black ${getStatusColor(selectedMatch.status)}`}>
                  {selectedMatch.status}
                </div>
                <p className="mt-1 text-xs text-gray-500">Le statut est géré automatiquement par le système</p>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedMatch.duration ?? ""}
                  onChange={(e) => updateMatch({...selectedMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>

              {/* Scores (si terminé) */}
              {selectedMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score Équipe A</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.scoreA || ''}
                      onChange={(e) => updateMatch({...selectedMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score Équipe B</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedMatch.scoreB || ''}
                      onChange={(e) => updateMatch({...selectedMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => deleteMatch(selectedMatch.id)}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer le match
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration des poules */}
        {selectedPool && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration de la poule</h3>
                <button
                  onClick={() => setSelectedPool(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Nom de la poule */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nom de la poule</label>
                <input
                  type="text"
                  value={selectedPool.name}
                  onChange={(e) => updatePool({...selectedPool, name: e.target.value})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Nombre d'équipes qualifiées */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Qualifiés Phase Finale
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedPool.qualifiedToFinals ?? 2}
                    onChange={(e) => updatePool({...selectedPool, qualifiedToFinals: parseInt(e.target.value) || 0})}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Qualifiés Loser Bracket
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedPool.qualifiedToLoserBracket ?? 0}
                    onChange={(e) => updatePool({...selectedPool, qualifiedToLoserBracket: parseInt(e.target.value) || 0})}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Sélection des équipes */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipes participantes</label>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const usedTeams = getUsedTeamsByPhase(matches, pools, brackets, loserBrackets, 'pool', selectedPool.id);
                      
                      return (
                        <>
                          {/* Vainqueurs des qualifications */}
                          {(() => {
                            const qualifWinners = matches
                              .filter(m => m.type === "qualifications" && m.winnerCode)
                              .map(m => m.winnerCode as string)
                              .filter((code, index, self) => self.indexOf(code) === index)
                              .sort();
                            
                            if (qualifWinners.length === 0) return null;
                            
                            return (
                              <>
                                <div className="text-sm font-semibold text-black mt-2 mb-1">
                                  Vainqueurs des qualifications
                                </div>
                                {qualifWinners.map(code => {
                                  const isSelected = selectedPool.teams.includes(code);
                                  const isUsedElsewhere = usedTeams.brackets.has(code) || usedTeams.loserBrackets.has(code);
                                  return (
                                    <div key={code} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`winner-${code}`}
                                        checked={isSelected}
                                        disabled={isUsedElsewhere}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addTeamToPool(selectedPool.id, code);
                                          } else {
                                            removeTeamFromPool(selectedPool.id, code);
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <label 
                                        htmlFor={`winner-${code}`} 
                                        className={`text-sm font-medium ${isUsedElsewhere ? 'text-gray-400 line-through' : 'text-indigo-600'}`}
                                      >
                                        {code} {isUsedElsewhere && '(déjà utilisé)'}
                                      </label>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            );
                          })()}
                          
                          {/* Équipes de la base de données */}
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Équipes
                          </div>
                          {teams.map(team => {
                            const isSelected = selectedPool.teams.includes(team.name);
                            const isUsedElsewhere = usedTeams.qualifications.has(team.name) || 
                                                    usedTeams.brackets.has(team.name) || 
                                                    usedTeams.loserBrackets.has(team.name);
                            return (
                              <div key={team.id} className="flex items-center text-black">
                                <input
                                  type="checkbox"
                                  id={`team-${team.id}`}
                                  checked={isSelected}
                                  disabled={isUsedElsewhere}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addTeamToPool(selectedPool.id, team.name);
                                    } else {
                                      removeTeamFromPool(selectedPool.id, team.name);
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <label 
                                  htmlFor={`team-${team.id}`} 
                                  className={`text-sm ${isUsedElsewhere ? 'text-gray-400 line-through' : ''}`}
                                >
                                  {team.name} {isUsedElsewhere && '(déjà utilisé)'}
                                </label>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Aperçu des matchs générés */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Matchs générés ({selectedPool.matches.length})
                </label>
                {selectedPool.matches.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedPool.matches.map((match, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-purple-50 cursor-pointer transition-colors text-black"
                        onClick={() => {
                          setSelectedPoolMatch(match);
                          setSelectedPool(null);
                        }}
                      >
                        <span className="text-sm">{match.teamA} vs {match.teamB}</span>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                    Sélectionnez au moins 2 équipes pour générer les matchs
                  </div>
                )}
                {selectedPool.matches.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Cliquez sur un match pour le configurer individuellement
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setPools(pools.filter(p => p.id !== selectedPool.id));
                  setSelectedPool(null);
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer la poule
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration des brackets (Phase Finale) */}
        {selectedBracket && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration Phase Finale</h3>
                <button
                  onClick={() => setSelectedBracket(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Nom du bracket */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nom</label>
                <input
                  type="text"
                  value={selectedBracket.name}
                  onChange={(e) => updateBracket({...selectedBracket, name: e.target.value})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Types de matchs (Checkboxes) */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Types de matchs
                </label>
                <div className="space-y-2">
                  {[
                    { value: "quarts" as BracketMatchType, label: "Quarts de finale" },
                    { value: "demi" as BracketMatchType, label: "Demi-finales" },
                    { value: "petite-finale" as BracketMatchType, label: "Petite finale" },
                    { value: "finale" as BracketMatchType, label: "Finale" }
                  ].map(({ value, label }) => {
                    const isChecked = selectedBracket.enabledRounds.includes(value);
                    return (
                      <div key={value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`round-${value}`}
                          checked={isChecked}
                          onChange={(e) => {
                            let newRounds: BracketMatchType[];
                            if (e.target.checked) {
                              newRounds = [...selectedBracket.enabledRounds, value];
                            } else {
                              newRounds = selectedBracket.enabledRounds.filter(r => r !== value);
                            }
                            const updatedBracket = {
                              ...selectedBracket,
                              enabledRounds: newRounds
                            };
                            updateBracket(updatedBracket);
                            generateBracketMatches(updatedBracket);
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`round-${value}`} className="text-sm text-black">
                          {label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Configuration des perdants */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Destination des perdants
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="loser-to-bracket"
                    checked={selectedBracket.loserToLoserBracket}
                    onChange={(e) => {
                      const updatedBracket = {
                        ...selectedBracket,
                        loserToLoserBracket: e.target.checked
                      };
                      updateBracket(updatedBracket);
                      generateBracketMatches(updatedBracket);
                    }}
                    className="mr-2"
                  />
                  <label htmlFor="loser-to-bracket" className="text-sm text-black">
                    Envoyer au Loser Bracket
                  </label>
                </div>
                {!selectedBracket.loserToLoserBracket && (
                  <p className="mt-1 text-xs text-gray-500">
                    Les perdants reçoivent leurs points et s'arrêtent
                  </p>
                )}
              </div>

              {/* Note sur les points */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-800">
                  💡 Les points winner/loser sont configurables individuellement pour chaque match.
                  Cliquez sur un match généré pour définir ses points.
                </p>
              </div>

              {/* Sélection des équipes */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Équipes pour le premier tour
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Configurez les équipes manuellement pour le tour le plus élevé
                </p>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const usedTeams = getUsedTeamsByPhase(matches, pools, brackets, loserBrackets, 'bracket', selectedBracket.id);
                      
                      return (
                        <>
                          {/* Vainqueurs des qualifications */}
                          {(() => {
                            const qualifWinners = matches
                              .filter(m => m.type === "qualifications" && m.winnerCode)
                              .map(m => m.winnerCode as string)
                              .filter((code, index, self) => self.indexOf(code) === index)
                              .sort();
                            
                            if (qualifWinners.length === 0) return null;
                            
                            return (
                              <>
                                <div className="text-xs font-semibold text-black mt-2 mb-1">
                                  Vainqueurs des qualifications
                                </div>
                                {qualifWinners.map(code => {
                                  const isSelected = selectedBracket.teams.includes(code);
                                  const isUsedElsewhere = usedTeams.pools.has(code) || usedTeams.loserBrackets.has(code);
                                  return (
                                    <div key={code} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`bracket-winner-${code}`}
                                        checked={isSelected}
                                        disabled={isUsedElsewhere}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addTeamToBracket(selectedBracket.id, code);
                                          } else {
                                            removeTeamFromBracket(selectedBracket.id, code);
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <label 
                                        htmlFor={`bracket-winner-${code}`} 
                                        className={`text-sm font-medium ${isUsedElsewhere ? 'text-gray-400 line-through' : 'text-indigo-600'}`}
                                      >
                                        {code} {isUsedElsewhere && '(déjà utilisé)'}
                                      </label>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            );
                          })()}

                          {/* Qualifiés des poules */}
                          {(() => {
                            const poolQualifiers: string[] = [];
                            pools.forEach(pool => {
                              for (let i = 1; i <= (pool.qualifiedToFinals || 0); i++) {
                                poolQualifiers.push(`${pool.name}-${i}`);
                              }
                            });
                            
                            if (poolQualifiers.length === 0) return null;
                            
                            return (
                              <>
                                <div className="text-xs font-semibold text-black mt-2 mb-1">
                                  Qualifiés des poules
                                </div>
                                {poolQualifiers.map(code => {
                                  const isSelected = selectedBracket.teams.includes(code);
                                  const isUsedElsewhere = usedTeams.loserBrackets.has(code);
                                  return (
                                    <div key={code} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`bracket-pool-${code}`}
                                        checked={isSelected}
                                        disabled={isUsedElsewhere}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addTeamToBracket(selectedBracket.id, code);
                                          } else {
                                            removeTeamFromBracket(selectedBracket.id, code);
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <label 
                                        htmlFor={`bracket-pool-${code}`} 
                                        className={`text-sm font-medium ${isUsedElsewhere ? 'text-gray-400 line-through' : 'text-purple-600'}`}
                                      >
                                        {code} {isUsedElsewhere && '(déjà utilisé)'}
                                      </label>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            );
                          })()}
                          
                          {/* Équipes de la base de données */}
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Autres équipes
                          </div>
                          {teams.map(team => {
                            const isSelected = selectedBracket.teams.includes(team.name);
                            const isUsedElsewhere = usedTeams.qualifications.has(team.name) || 
                                                    usedTeams.pools.has(team.name) || 
                                                    usedTeams.loserBrackets.has(team.name);
                            return (
                              <div key={team.id} className="flex items-center text-black">
                                <input
                                  type="checkbox"
                                  id={`bracket-team-${team.id}`}
                                  checked={isSelected}
                                  disabled={isUsedElsewhere}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addTeamToBracket(selectedBracket.id, team.name);
                                    } else {
                                      removeTeamFromBracket(selectedBracket.id, team.name);
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <label 
                                  htmlFor={`bracket-team-${team.id}`} 
                                  className={`text-sm ${isUsedElsewhere ? 'text-gray-400 line-through' : ''}`}
                                >
                                  {team.name} {isUsedElsewhere && '(déjà utilisé)'}
                                </label>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Aperçu des matchs générés */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Matchs générés ({selectedBracket.matches.length})
                </label>
                {selectedBracket.matches.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedBracket.matches.map((match, index) => {
                      const matchTypeLabels: Record<BracketMatchType, string> = {
                        "quarts": "QF",
                        "demi": "SF",
                        "petite-finale": "PF",
                        "finale": "F"
                      };
                      const matchLabel = match.bracketMatchType ? matchTypeLabels[match.bracketMatchType] : "";
                      return (
                        <div 
                          key={index} 
                          className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-orange-50 cursor-pointer transition-colors text-black"
                          onClick={() => {
                            setSelectedBracketMatch(match);
                            setSelectedBracket(null);
                          }}
                        >
                          <span className="text-sm">{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                    Sélectionnez des rounds et des équipes pour générer les matchs
                  </div>
                )}
                {selectedBracket.matches.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Cliquez sur un match pour le configurer individuellement
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setBrackets(brackets.filter(b => b.id !== selectedBracket.id));
                  setSelectedBracket(null);
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer le bracket
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration des loser brackets */}
        {selectedLoserBracket && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Configuration Loser Bracket</h3>
                <button
                  onClick={() => setSelectedLoserBracket(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Nom du loser bracket */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nom</label>
                <input
                  type="text"
                  value={selectedLoserBracket.name}
                  onChange={(e) => updateLoserBracket({...selectedLoserBracket, name: e.target.value})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Types de matchs (Checkboxes) */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Rounds du Loser Bracket
                </label>
                <div className="space-y-2">
                  {[
                    { value: "loser-round-1" as LoserBracketMatchType, label: "Repêchage" },
                    { value: "loser-round-2" as LoserBracketMatchType, label: "Demi-finales LB" },
                    { value: "loser-round-3" as LoserBracketMatchType, label: "Match de la 7e place" },
                    { value: "loser-finale" as LoserBracketMatchType, label: "Match de la 5e place" }
                  ].map(({ value, label }) => {
                    const isChecked = selectedLoserBracket.enabledRounds.includes(value);
                    return (
                      <div key={value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`loser-round-${value}`}
                          checked={isChecked}
                          onChange={(e) => {
                            let newRounds: LoserBracketMatchType[];
                            if (e.target.checked) {
                              newRounds = [...selectedLoserBracket.enabledRounds, value];
                            } else {
                              newRounds = selectedLoserBracket.enabledRounds.filter(r => r !== value);
                            }
                            const updatedLoserBracket = {
                              ...selectedLoserBracket,
                              enabledRounds: newRounds
                            };
                            updateLoserBracket(updatedLoserBracket);
                            generateLoserBracketMatches(updatedLoserBracket);
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`loser-round-${value}`} className="text-sm text-black">
                          {label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Sélection des équipes (perdants) */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Équipes (perdants)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Sélectionnez les perdants qui participent au loser bracket
                </p>
                {loadingTeams ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des équipes...</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const usedTeams = getUsedTeamsByPhase(matches, pools, brackets, loserBrackets, 'loser-bracket', selectedLoserBracket.id);
                      
                      return (
                        <>
                          {/* Perdants des phases finales */}
                          {(() => {
                            const bracketLosers: string[] = [];
                            brackets.forEach(bracket => {
                              bracket.matches.forEach(match => {
                                if (match.loserCode) {
                                  bracketLosers.push(match.loserCode);
                                }
                              });
                            });
                            
                            if (bracketLosers.length === 0) return null;
                            
                            return (
                              <>
                                <div className="text-xs font-semibold text-black mt-2 mb-1">
                                  Perdants de la phase finale
                                </div>
                                {bracketLosers.map(code => {
                                  const isSelected = selectedLoserBracket.teams.includes(code);
                                  const isUsedElsewhere = usedTeams.qualifications.has(code) || 
                                                          usedTeams.pools.has(code) || 
                                                          usedTeams.brackets.has(code);
                                  return (
                                    <div key={code} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`lb-bracket-loser-${code}`}
                                        checked={isSelected}
                                        disabled={isUsedElsewhere}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addTeamToLoserBracket(selectedLoserBracket.id, code);
                                          } else {
                                            removeTeamFromLoserBracket(selectedLoserBracket.id, code);
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <label 
                                        htmlFor={`lb-bracket-loser-${code}`} 
                                        className={`text-sm font-medium ${isUsedElsewhere ? 'text-gray-400 line-through' : 'text-black'}`}
                                      >
                                        {code} {isUsedElsewhere && '(déjà utilisé)'}
                                      </label>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            );
                          })()}

                          {/* Perdants des poules */}
                          {(() => {
                            const poolLosers: string[] = [];
                            pools.forEach(pool => {
                              for (let i = (pool.qualifiedToFinals || 0) + (pool.qualifiedToLoserBracket || 0) + 1; i <= pool.teams.length; i++) {
                                poolLosers.push(`${pool.name}-${i}`);
                              }
                            });
                            
                            if (poolLosers.length === 0) return null;
                            
                            return (
                              <>
                                <div className="text-xs font-semibold text-black mt-2 mb-1">
                                  Autres équipes des poules
                                </div>
                                {poolLosers.map(code => {
                                  const isSelected = selectedLoserBracket.teams.includes(code);
                                  const isUsedElsewhere = usedTeams.qualifications.has(code) || 
                                                          usedTeams.brackets.has(code);
                                  return (
                                    <div key={code} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`lb-pool-loser-${code}`}
                                        checked={isSelected}
                                        disabled={isUsedElsewhere}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addTeamToLoserBracket(selectedLoserBracket.id, code);
                                          } else {
                                            removeTeamFromLoserBracket(selectedLoserBracket.id, code);
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <label 
                                        htmlFor={`lb-pool-loser-${code}`} 
                                        className={`text-sm font-medium ${isUsedElsewhere ? 'text-gray-400 line-through' : 'text-purple-600'}`}
                                      >
                                        {code} {isUsedElsewhere && '(déjà utilisé)'}
                                      </label>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-gray-200 my-2"></div>
                              </>
                            );
                          })()}
                          
                          {/* Équipes de la base de données */}
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            Autres équipes
                          </div>
                          {teams.map(team => {
                            const isSelected = selectedLoserBracket.teams.includes(team.name);
                            const isUsedElsewhere = usedTeams.qualifications.has(team.name) || 
                                                    usedTeams.pools.has(team.name) || 
                                                    usedTeams.brackets.has(team.name);
                            return (
                              <div key={team.id} className="flex items-center text-black">
                                <input
                                  type="checkbox"
                                  id={`lb-team-${team.id}`}
                                  checked={isSelected}
                                  disabled={isUsedElsewhere}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addTeamToLoserBracket(selectedLoserBracket.id, team.name);
                                    } else {
                                      removeTeamFromLoserBracket(selectedLoserBracket.id, team.name);
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <label 
                                  htmlFor={`lb-team-${team.id}`} 
                                  className={`text-sm ${isUsedElsewhere ? 'text-gray-400 line-through' : ''}`}
                                >
                                  {team.name} {isUsedElsewhere && '(déjà utilisé)'}
                                </label>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Aperçu des matchs générés */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Matchs générés ({selectedLoserBracket.matches.length})
                </label>
                {selectedLoserBracket.matches.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedLoserBracket.matches.map((match, index) => {
                      const matchTypeLabels: Record<LoserBracketMatchType, string> = {
                        "loser-round-1": "Repêchage",
                        "loser-round-2": "Demi LB",
                        "loser-round-3": "7e place",
                        "loser-finale": "5e place"
                      };
                      const matchLabel = match.loserBracketMatchType ? matchTypeLabels[match.loserBracketMatchType] : "";
                      return (
                        <div 
                          key={index} 
                          className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-amber-50 cursor-pointer transition-colors text-black"
                          onClick={() => {
                            setSelectedLoserBracketMatch(match);
                            setSelectedLoserBracket(null);
                          }}
                        >
                          <span className="text-sm">{matchLabel}: {match.teamA || "?"} vs {match.teamB || "?"}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                    Sélectionnez des rounds et des équipes pour générer les matchs
                  </div>
                )}
                {selectedLoserBracket.matches.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Cliquez sur un match pour le configurer individuellement
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setLoserBrackets(loserBrackets.filter(lb => lb.id !== selectedLoserBracket.id));
                  setSelectedLoserBracket(null);
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                Supprimer le loser bracket
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration d'un match de poule */}
        {selectedPoolMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Match de poule</h3>
                  <p className="text-sm text-purple-600">{selectedPoolMatch.teamA} vs {selectedPoolMatch.teamB}</p>
                </div>
                <button
                  onClick={() => setSelectedPoolMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedPoolMatch.date}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedPoolMatch.time}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-black"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  renderCourtSelect(selectedPoolMatch, (courtName) => updatePoolMatch({ ...selectedPoolMatch, court: courtName }))
                )}
                {/* Affichage d'un message si aucun terrain n'est disponible */}
                {!loadingCourts && courts.filter(court =>
                  isCourtAvailable(
                    court.name,
                    selectedPoolMatch.date,
                    selectedPoolMatch.time,
                    selectedPoolMatch.duration,
                    selectedPoolMatch.id
                  )
                ).length === 0 && (
                  <div className="text-xs text-red-600 mt-2">Aucun terrain disponible pour ce créneau</div>
                )}
              </div>

              {/* Statut (lecture seule - géré par le backend) */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <div className={`w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-black ${getStatusColor(selectedPoolMatch.status)}`}>
                  {selectedPoolMatch.status}
                </div>
                <p className="mt-1 text-xs text-gray-500">Le statut est géré automatiquement par le système</p>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedPoolMatch.duration}
                  onChange={(e) => updatePoolMatch({...selectedPoolMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Points vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points vainqueur
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedPoolMatch.winnerPoints ?? 0}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, winnerPoints: parseInt(e.target.value) || 0})}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points perdant
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedPoolMatch.loserPoints ?? 0}
                    onChange={(e) => updatePoolMatch({...selectedPoolMatch, loserPoints: parseInt(e.target.value) || 0})}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Destinations vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#16a34a' }}>Destination Vainqueur</label>
                  <select
                    className="w-full p-2 border border-green-400 rounded-md focus:ring-green-500 focus:border-green-500 text-black bg-green-50"
                    value={selectedPoolMatch.winner_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updatePoolMatch({
                        ...selectedPoolMatch,
                        winner_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedPoolMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#dc2626' }}>Destination Perdant</label>
                  <select
                    className="w-full p-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500 text-black bg-red-50"
                    value={selectedPoolMatch.loser_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updatePoolMatch({
                        ...selectedPoolMatch,
                        loser_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedPoolMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Scores (si terminé) */}
              {selectedPoolMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedPoolMatch.teamA}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedPoolMatch.scoreA || ''}
                      onChange={(e) => updatePoolMatch({...selectedPoolMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedPoolMatch.teamB}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedPoolMatch.scoreB || ''}
                      onChange={(e) => updatePoolMatch({...selectedPoolMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Informations sur la poule */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-800 mb-1">Match de poule</div>
                <div className="text-xs text-purple-600">
                  Ce match fait partie d'une poule et sera comptabilisé dans le classement général.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  const pool = pools.find(p => p.matches.some(m => m.id === selectedPoolMatch.id));
                  if (pool) {
                    setSelectedPool(pool);
                    setSelectedPoolMatch(null);
                  }
                }}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition"
              >
                Retour à la poule
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration d'un match de bracket */}
        {selectedBracketMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Match de Phase Finale</h3>
                  <p className="text-sm text-orange-600">
                    {selectedBracketMatch.bracketMatchType ? 
                      ({
                        "quarts": "Quart de finale",
                        "demi": "Demi-finale",
                        "petite-finale": "Petite finale",
                        "finale": "Finale"
                      }[selectedBracketMatch.bracketMatchType]) : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBracketMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Équipes (affichage seulement car générées automatiquement) */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipes</label>
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 rounded text-black">
                    <span className="text-xs text-gray-500">Équipe A:</span>
                    <div className="font-medium">{selectedBracketMatch.teamA || "À déterminer"}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded text-black">
                    <span className="text-xs text-gray-500">Équipe B:</span>
                    <div className="font-medium">{selectedBracketMatch.teamB || "À déterminer"}</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Les équipes sont déterminées automatiquement selon les résultats des matchs précédents
                </p>
              </div>

              {/* Codes et destinations */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs font-medium text-orange-800 mb-2">Progression</div>
                {selectedBracketMatch.winnerCode && (
                  <div className="text-xs text-black mb-1">
                    <span className="font-medium">Vainqueur ({selectedBracketMatch.winnerCode}):</span>{" "}
                    {selectedBracketMatch.winnerDestination === "LOSER_BRACKET" ? 
                      "Continue au Loser Bracket" : 
                      selectedBracketMatch.winnerDestination ? 
                        `Passe en ${selectedBracketMatch.winnerDestination}` : 
                        `Reçoit ${selectedBracketMatch.winnerPoints || 0} points`
                    }
                  </div>
                )}
                {selectedBracketMatch.loserCode && (
                  <div className="text-xs text-black">
                    <span className="font-medium">Perdant ({selectedBracketMatch.loserCode}):</span>{" "}
                    {selectedBracketMatch.loserDestination === "LOSER_BRACKET" ? 
                      "Va au Loser Bracket" : 
                      selectedBracketMatch.loserDestination === "PF" ? 
                        "Va en Petite Finale" :
                        `Reçoit ${selectedBracketMatch.loserPoints || 0} points`
                    }
                  </div>
                )}
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedBracketMatch.date}
                    onChange={(e) => updateBracketMatch({...selectedBracketMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedBracketMatch.time}
                    onChange={(e) => updateBracketMatch({...selectedBracketMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-black"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  renderCourtSelect(selectedBracketMatch, (courtName) => updateBracketMatch({ ...selectedBracketMatch, court: courtName }))
                )}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <div className={`w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-black ${getStatusColor(selectedBracketMatch.status)}`}>
                  {selectedBracketMatch.status}
                </div>
                <p className="mt-1 text-xs text-gray-500">Le statut est géré automatiquement par le système</p>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedBracketMatch.duration}
                  onChange={(e) => updateBracketMatch({...selectedBracketMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Points vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points vainqueur
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedBracketMatch.winnerPoints ?? 0}
                    onChange={(e) => updateBracketMatch({...selectedBracketMatch, winnerPoints: parseInt(e.target.value) || 0} as Match)}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points perdant
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedBracketMatch.loserPoints ?? 0}
                    onChange={(e) => updateBracketMatch({...selectedBracketMatch, loserPoints: parseInt(e.target.value) || 0} as Match)}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Destinations vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#16a34a' }}>Destination Vainqueur</label>
                  <select
                    className="w-full p-2 border border-green-400 rounded-md focus:ring-green-500 focus:border-green-500 text-black bg-green-50"
                    value={selectedBracketMatch.winner_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateBracketMatch({
                        ...selectedBracketMatch,
                        winner_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedBracketMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#dc2626' }}>Destination Perdant</label>
                  <select
                    className="w-full p-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500 text-black bg-red-50"
                    value={selectedBracketMatch.loser_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateBracketMatch({
                        ...selectedBracketMatch,
                        loser_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedBracketMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Scores (si terminé) */}
              {selectedBracketMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedBracketMatch.teamA}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedBracketMatch.scoreA || ''}
                      onChange={(e) => updateBracketMatch({...selectedBracketMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedBracketMatch.teamB}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedBracketMatch.scoreB || ''}
                      onChange={(e) => updateBracketMatch({...selectedBracketMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  const bracket = brackets.find(b => b.matches.some(m => m.id === selectedBracketMatch.id));
                  if (bracket) {
                    setSelectedBracket(bracket);
                    setSelectedBracketMatch(null);
                  }
                }}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition"
              >
                Retour au bracket
              </button>
            </div>
          </div>
        )}

        {/* Panel de configuration d'un match de loser bracket */}
        {selectedLoserBracketMatch && (
          <div className="w-80 bg-white border-l shadow-lg flex flex-col">
            <div className="p-4 border-b bg-amber-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Match de Loser Bracket</h3>
                  <p className="text-sm text-amber-600">
                    {selectedLoserBracketMatch.loserBracketMatchType ? 
                      ({
                        "loser-round-1": "Round 1",
                        "loser-round-2": "Round 2",
                        "loser-round-3": "Round 3",
                        "loser-finale": "Finale Loser Bracket"
                      }[selectedLoserBracketMatch.loserBracketMatchType]) : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLoserBracketMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Équipes (affichage seulement car générées automatiquement) */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Équipes</label>
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 rounded text-black">
                    <span className="text-xs text-gray-500">Équipe A:</span>
                    <div className="font-medium">{selectedLoserBracketMatch.teamA || "À déterminer"}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded text-black">
                    <span className="text-xs text-gray-500">Équipe B:</span>
                    <div className="font-medium">{selectedLoserBracketMatch.teamB || "À déterminer"}</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Les équipes sont des perdants d'autres phases
                </p>
              </div>

              {/* Codes et destinations */}
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-xs font-medium text-amber-800 mb-2">Progression</div>
                {selectedLoserBracketMatch.winnerCode && (
                  <div className="text-xs text-black mb-1">
                    <span className="font-medium">Vainqueur ({selectedLoserBracketMatch.winnerCode}):</span>{" "}
                    {selectedLoserBracketMatch.winnerDestination ? 
                      `Passe en ${selectedLoserBracketMatch.winnerDestination}` : 
                      `Reçoit ${selectedLoserBracketMatch.winnerPoints || 0} points`
                    }
                  </div>
                )}
                {selectedLoserBracketMatch.loserCode && (
                  <div className="text-xs text-black">
                    <span className="font-medium">Perdant ({selectedLoserBracketMatch.loserCode}):</span>{" "}
                    Reçoit {selectedLoserBracketMatch.loserPoints || 0} points et s'arrête
                  </div>
                )}
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedLoserBracketMatch.date}
                    onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Heure</label>
                  <input
                    type="time"
                    value={selectedLoserBracketMatch.time}
                    onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, time: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-black"
                  />
                </div>
              </div>

              {/* Terrain */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Terrain</label>
                {loadingCourts ? (
                  <div className="text-sm text-gray-500 p-2">Chargement des terrains...</div>
                ) : (
                  renderCourtSelect(selectedLoserBracketMatch, (courtName) => updateLoserBracketMatch({ ...selectedLoserBracketMatch, court: courtName }))
                )}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Statut</label>
                <div className={`w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-black ${getStatusColor(selectedLoserBracketMatch.status)}`}>
                  {selectedLoserBracketMatch.status}
                </div>
                <p className="mt-1 text-xs text-gray-500">Le statut est géré automatiquement par le système</p>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={selectedLoserBracketMatch.duration}
                  onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, duration: parseInt(e.target.value)})}
                  className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Points vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points vainqueur
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedLoserBracketMatch.winnerPoints ?? 0}
                    onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, winnerPoints: parseInt(e.target.value) || 0} as Match)}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Points perdant
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedLoserBracketMatch.loserPoints ?? 0}
                    onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, loserPoints: parseInt(e.target.value) || 0} as Match)}
                    className="w-full p-2 text-black border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Destinations vainqueur/perdant */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#16a34a' }}>Destination Vainqueur</label>
                  <select
                    className="w-full p-2 border border-green-400 rounded-md focus:ring-green-500 focus:border-green-500 text-black bg-green-50"
                    value={selectedLoserBracketMatch.winner_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateLoserBracketMatch({
                        ...selectedLoserBracketMatch,
                        winner_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedLoserBracketMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#dc2626' }}>Destination Perdant</label>
                  <select
                    className="w-full p-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500 text-black bg-red-50"
                    value={selectedLoserBracketMatch.loser_destination_match_id || ''}
                    onChange={e => {
                      const value = e.target.value || null;
                      updateLoserBracketMatch({
                        ...selectedLoserBracketMatch,
                        loser_destination_match_id: value,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
                    {[...matches, ...pools.flatMap(p=>p.matches), ...brackets.flatMap(b=>b.matches), ...loserBrackets.flatMap(lb=>lb.matches)]
                      .filter(m => m.id !== selectedLoserBracketMatch.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Scores (si terminé) */}
              {selectedLoserBracketMatch.status === "terminé" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedLoserBracketMatch.teamA}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedLoserBracketMatch.scoreA || ''}
                      onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, scoreA: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Score {selectedLoserBracketMatch.teamB}</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedLoserBracketMatch.scoreB || ''}
                      onChange={(e) => updateLoserBracketMatch({...selectedLoserBracketMatch, scoreB: parseInt(e.target.value) || 0})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  const loserBracket = loserBrackets.find(lb => lb.matches.some(m => m.id === selectedLoserBracketMatch.id));
                  if (loserBracket) {
                    setSelectedLoserBracket(loserBracket);
                    setSelectedLoserBracketMatch(null);
                  }
                }}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 transition"
              >
                Retour au loser bracket
              </button>
            </div>
          </div>
        )}

        {/* Palette de tuiles à droite */}
        <div className="w-60 bg-white border-l shadow-lg flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-900">Palette de tuiles</h3>
            <p className="text-xs text-gray-600 mt-1">Glissez pour ajouter une nouvelle phase</p>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Tuile Match de Poule */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "poule")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-purple-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-purple-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  Poule
                </span>
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">Équipe A</div>
                <div className="text-center text-xs my-1">VS</div>
                <div className="font-medium">Équipe B</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">90 min</div>
            </div>

            {/* Tuile Phase Qualifs */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "qualifications")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-indigo-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-indigo-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  Qualifs
                </span>
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">Équipe A</div>
                <div className="text-center text-xs my-1">VS</div>
                <div className="font-medium">Équipe B</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">90 min</div>
            </div>

            {/* Tuile Phase Finale */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "phase-finale")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-orange-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-orange-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                  Phase Finale
                </span>
                <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium text-xs">Bracket à élimination</div>
                <div className="text-xs text-gray-500 mt-1">QF • SF • F • PF</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Configuration complète</div>
            </div>

            {/* Tuile Loser Bracket */}
            <div
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, "loser-bracket")}
              onDragEnd={handlePaletteDragEnd}
              className="bg-white border-2 border-amber-200 rounded-lg p-4 cursor-grab hover:shadow-lg hover:border-amber-400 transition-all active:cursor-grabbing"
            >
              <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                Loser Bracket
              </span>
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              </div>
              <div className="text-sm text-gray-700">
              <div className="font-medium text-xs">Bracket perdants</div>
              <div className="text-xs text-gray-500 mt-1">LR1 • LR2 • LR3 • LF</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Repêchage</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}