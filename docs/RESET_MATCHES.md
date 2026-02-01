# Réinitialisation des Matchs de Tournoi

## Vue d'ensemble
La réinitialisation des matchs est maintenant gérée entièrement par le backend via une API endpoint dédié, sans dépendre du localStorage.

## Endpoint API

### POST `/tournaments/{tournament_id}/reset-matches`
Réinitialise tous les statuts et scores des matchs d'un tournoi.

**Paramètres:**
- `tournament_id` (path): ID du tournoi

**Réponse:**
```json
{
  "success": true,
  "data": {
    "tournament_id": 1,
    "reset_matches": 42
  },
  "message": "Tournament matches reset successfully"
}
```

## Utilisation dans l'interface

### Page de Configuration
Un bouton **Réinitialiser** a été ajouté dans la barre d'outils de la page de configuration:
- Situé à côté du bouton "Enregistrer"
- Icône: cadenas avec flèche circulaire (reset)
- Couleur: rouge pour indiquer une action destructive

```typescript
onClick={handleResetMatches}
// Appelle POST /tournaments/{id}/reset-matches
```

### Page de Visualisation
Le bouton "Réinitialiser tous les matchs" du menu a été mis à jour:
- Utilise maintenant l'API au lieu du localStorage
- Recharge automatiquement la page après réinitialisation

```typescript
const handleResetAllMatches = () => {
  fetch(`http://localhost:8000/tournaments/${params.id}/reset-matches`, {
    method: "POST",
  })
    .then(res => res.json())
    .then(data => {
      window.location.reload();
    })
}
```

## Comportement

1. **Avant réinitialisation**: Confirmation utilisateur avec dialogue
2. **Pendant**: Appel API
3. **Après**: Message de succès et rechargement automatique

## Erreurs gérées

- `Tournament {id} not found`: Le tournoi n'existe pas dans la base de données
- Autres erreurs API: Affichage du message d'erreur à l'utilisateur

## Avantages

✅ Pas de dépendance au localStorage
✅ Données synchronisées avec la base de données
✅ Réinitialisation atomique (tous les matchs à la fois)
✅ Auditabilité: Les changements sont dans la base de données
