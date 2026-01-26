"use client";

import { useParams } from "next/navigation";
import SplitScreenClient from "./SplitScreenClient";

/**
 * Page Split-Screen Spectateur
 * Affiche 2 ou 4 matchs en temps réel du même tournoi
 */
export default function SplitScreenPage() {
    const params = useParams();
    const tournamentId = params.id as string;

    return <SplitScreenClient tournamentId={tournamentId} />;
}
