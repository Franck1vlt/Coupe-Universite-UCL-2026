# Sécurité des Mots de Passe

## Mesures de Sécurité Implémentées

### 1. Hashage avec Bcrypt

Les mots de passe ne sont **jamais stockés en clair** dans la base de données. On utilise l'algorithme **bcrypt** qui est spécialement conçu pour les mots de passe:

```python
import bcrypt

# Hashage
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Vérification
bcrypt.checkpw(password.encode('utf-8'), hashed)
```

**Pourquoi bcrypt ?**
- **Sel automatique**: Chaque hash inclut un sel unique, donc deux utilisateurs avec le même mot de passe auront des hashes différents
- **Facteur de coût**: Le paramètre `rounds=12` rend le calcul intentionnellement lent (~250ms), ce qui rend les attaques par force brute très difficiles
- **Résistant aux attaques**: Même si un attaquant obtient la base de données, il ne peut pas retrouver les mots de passe originaux

### 2. Authentification JWT

- Les tokens JWT sont signés avec une clé secrète (`SECRET_KEY` dans `.env`)
- Les tokens expirent après 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`)
- L'algorithme HS256 est utilisé pour la signature

### 3. Protection des Endpoints

Tous les endpoints de gestion des utilisateurs (`/users/*`) sont protégés:
- **Authentification requise**: Token JWT valide obligatoire
- **Autorisation admin**: Seuls les administrateurs peuvent accéder à ces endpoints
- **Validation des données**: Les schémas Pydantic valident toutes les entrées

### 4. Protection contre la Suppression

L'administrateur principal a le flag `is_deletable=False` qui empêche sa suppression, garantissant qu'il y aura toujours un accès admin au système.

### 5. Mots de Passe Temporaires

Quand un admin génère un mot de passe temporaire:
- Le mot de passe est retourné **une seule fois** dans la réponse API
- Seul un **flag** (`temp_password = "1"`) est stocké en DB, pas le mot de passe
- L'utilisateur doit changer son mot de passe à la prochaine connexion

---

## Bonnes Pratiques à Suivre

### En Production

1. **Changez la SECRET_KEY**
   ```env
   SECRET_KEY=une-cle-secrete-tres-longue-et-aleatoire-de-64-caracteres-minimum
   ```
   Générez une clé aléatoire: `openssl rand -hex 32`

2. **Utilisez HTTPS**
   - Toutes les communications doivent être chiffrées
   - Configurez un certificat SSL/TLS

3. **Changez le mot de passe admin par défaut**
   ```sql
   -- Après le premier démarrage, changez le mot de passe admin
   -- Utilisez le script hash_password.py pour générer un nouveau hash
   UPDATE User SET hashed_password = '<nouveau_hash>' WHERE username = 'admin';
   ```

4. **Limitez les accès à la base de données**
   - Utilisez un utilisateur DB avec des permissions limitées
   - Ne stockez jamais la DB dans un répertoire accessible publiquement

5. **Configurez les CORS correctement**
   - En production, limitez `CORS_ORIGINS` aux domaines autorisés

---

## Commandes SQL de Migration

### Ajouter les colonnes de mot de passe

```sql
-- Backup d'abord!
-- cp data/coupe_ucl_2026.db data/coupe_ucl_2026.db.backup

ALTER TABLE User ADD COLUMN hashed_password VARCHAR(255);
ALTER TABLE User ADD COLUMN temp_password VARCHAR(100);
ALTER TABLE User ADD COLUMN is_deletable BOOLEAN DEFAULT 1;
```

### Créer l'admin avec mot de passe "admin"

```sql
INSERT INTO User (email, username, full_name, role, hashed_password, is_active, is_deletable, created_at, updated_at)
VALUES (
    'admin@coupe-ucl.be',
    'admin',
    'Administrateur Principal',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4Y5Z1V.g5mwNjHZq',
    1,
    0,
    datetime('now'),
    datetime('now')
);
```

### Générer un hash personnalisé

```bash
cd Backend
python scripts/hash_password.py mon_mot_de_passe_securise
```

---

## Endpoints de Gestion des Utilisateurs

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/users` | GET | Liste tous les utilisateurs |
| `/users` | POST | Créer un utilisateur |
| `/users/{id}` | GET | Récupérer un utilisateur |
| `/users/{id}` | PUT | Modifier un utilisateur |
| `/users/{id}/password` | PUT | Changer le mot de passe |
| `/users/{id}/reset-password` | POST | Générer mot de passe temporaire |
| `/users/{id}` | DELETE | Supprimer un utilisateur |

**Tous ces endpoints nécessitent un token JWT d'administrateur.**
