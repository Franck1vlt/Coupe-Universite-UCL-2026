# Utilise une image Python officielle
FROM python:3.11-slim

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers de dépendances
COPY requirements.txt .

# Installe les dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copie le reste du code de l'application
COPY . .

# Expose le port utilisé par l'app (ici 8000)
EXPOSE 8000

# Commande de lancement (adapte selon ton entrypoint)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]