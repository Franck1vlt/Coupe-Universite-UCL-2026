
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useTournamentEntities } from "../../../../hooks/useTournamentEntities";
import { useTeams } from "../../../../hooks/useTeams";
import { useCourts } from "../../../../hooks/useCourts";
import TournamentPanel from "../../../../components/TournamentPanel";
import TournamentTiles from "./TournamentTiles";
import { generatePoolMatches, generateBracketMatches, generateLoserBracketMatches, isCourtAvailable } from "../../../../hooks/useTournamentHelpers";


export default function TournamentConfigurationPage() {
	const router = useRouter();
	const tournamentEntities = useTournamentEntities();
	const { pools, brackets, loserBrackets, matches, selectedMatch, selectedPool, selectedBracket, selectedLoserBracket, selectedPoolMatch, selectedBracketMatch, selectedLoserBracketMatch, setSelectedMatch, setSelectedPool, setSelectedBracket, setSelectedLoserBracket, setSelectedPoolMatch, setSelectedBracketMatch, setSelectedLoserBracketMatch, draggedMatch, setDraggedMatch } = tournamentEntities;
	const { teams, loading: loadingTeams } = useTeams();
	const { courts } = useCourts();

	// Panel latéral : fermeture
	const handleClosePanel = () => {
		setSelectedMatch(null);
		setSelectedPool(null);
		setSelectedBracket(null);
		setSelectedLoserBracket(null);
		setSelectedPoolMatch(null);
		setSelectedBracketMatch(null);
		setSelectedLoserBracketMatch(null);
	};

	// Ajout de return pour chaque branche conditionnelle si besoin
	if (!tournamentEntities) return <div>Chargement des entités du tournoi...</div>;
	if (!teams) return <div>Chargement des équipes...</div>;
	if (!courts) return <div>Chargement des terrains...</div>;

	return (
		<main style={{ height: "100vh", width: "100vw", background: "linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)", overflow: "hidden" }}>
			<div style={{ display: "flex", alignItems: "center", padding: "1rem 2rem 0 2rem" }}>
				<button onClick={() => router.back()} style={{ marginRight: "1rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "#e0e7ff", border: "none", cursor: "pointer" }}>Retour</button>
				<h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Configuration du tournoi</h1>
			</div>
			<div style={{ display: "flex", height: "calc(100vh - 3rem)" }}>
				{/* Canevas des tuiles et fond */}
				<div style={{ flex: 1, position: "relative", padding: "2rem", overflow: "auto" }}>
					<div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
						<button disabled={!selectedPool} onClick={() => selectedPool && tournamentEntities.updatePool({ ...selectedPool, matches: generatePoolMatches(selectedPool) })}>Générer les matchs de la poule</button>
						<button disabled={!selectedBracket} onClick={() => selectedBracket && tournamentEntities.updateBracket({ ...selectedBracket, matches: generateBracketMatches(selectedBracket) })}>Générer les matchs du bracket</button>
						<button disabled={!selectedLoserBracket} onClick={() => selectedLoserBracket && tournamentEntities.updateLoserBracket({ ...selectedLoserBracket, matches: generateLoserBracketMatches(selectedLoserBracket) })}>Générer les matchs du loser bracket</button>
					</div>
					<div style={{ marginBottom: "1rem" }}>
						<h2>Terrains disponibles</h2>
						<ul>
							{courts.map(court => (
								<li key={court.id}>
									{court.name} {selectedMatch && isCourtAvailable(court.name, selectedMatch.date ?? "", selectedMatch.time ?? "", selectedMatch.duration ?? 90, matches, pools, brackets, loserBrackets, selectedMatch.id) ? "(disponible)" : "(occupé)"}
								</li>
							))}
						</ul>
					</div>
					{/* Zone d'affichage des tuiles */}
					<div style={{ position: "relative", minHeight: "600px", background: "#fff", borderRadius: "1rem", boxShadow: "0 2px 16px #e0e7ff", padding: "2rem" }}>
						<TournamentTiles
							matches={matches}
							pools={pools}
							brackets={brackets}
							loserBrackets={loserBrackets}
							selectedMatch={selectedMatch}
							selectedPool={selectedPool}
							selectedBracket={selectedBracket}
							selectedLoserBracket={selectedLoserBracket}
							setSelectedMatch={setSelectedMatch}
							setSelectedPool={setSelectedPool}
							setSelectedBracket={setSelectedBracket}
							setSelectedLoserBracket={setSelectedLoserBracket}
							setDraggedMatch={setDraggedMatch}
						/>
					</div>
				</div>
				{/* Panel latéral à droite */}
				<div style={{ width: "400px", minWidth: "320px", background: "#fff", borderLeft: "2px solid #e0e7ff", boxShadow: "-2px 0 16px #e0e7ff", height: "100%", position: "relative", zIndex: 10 }}>
					<TournamentPanel
						selectedMatch={selectedMatch}
						selectedPool={selectedPool}
						selectedBracket={selectedBracket}
						selectedLoserBracket={selectedLoserBracket}
						selectedPoolMatch={selectedPoolMatch}
						selectedBracketMatch={selectedBracketMatch}
						selectedLoserBracketMatch={selectedLoserBracketMatch}
						loadingTeams={loadingTeams}
						teams={teams.map(team => team.name)}
						onClose={handleClosePanel}
						updateMatch={tournamentEntities.updateMatch}
						updatePool={tournamentEntities.updatePool}
						updateBracket={tournamentEntities.updateBracket}
						updateLoserBracket={tournamentEntities.updateLoserBracket}
					/>
				</div>
			</div>
		</main>
	);
}
