// Utilitaire pour filtrer les terrains disponibles à une date/heure donnée
type Court = { id: string; name: string };
type Schedule = { court_id: number | string; scheduled_datetime: string };

export function getAvailableCourts(
  courts: Court[],
  schedules: Schedule[],
  selectedDateTime: string
): (Court & { isOccupied: boolean })[] {
  if (!selectedDateTime) return courts.map(court => ({ ...court, isOccupied: false }));
  // On considère qu'un terrain est occupé si un match est planifié à la même date/heure
  return courts.map(court => {
    const isOccupied = schedules.some(
      sch => (sch.court_id?.toString?.() ?? sch.court_id + "") === court.id && sch.scheduled_datetime === selectedDateTime
    );
    return { ...court, isOccupied };
  });
}
