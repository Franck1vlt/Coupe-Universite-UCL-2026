"use client";

import SplitScreenClient from "../tournaments/[id]/split-screen/SplitScreenClient";

/**
 * Page Split-Screen globale — accessible depuis "Choisir un sport".
 * Affiche les matchs en cours de tous les tournois, sans filtrage par sport.
 */
export default function GlobalSplitScreenPage() {
    return <SplitScreenClient />;
}
