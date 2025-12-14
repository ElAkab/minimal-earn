# ⚡ Commandes rapides - Mind Stimulator

## 🚀 Démarrage

### Installation initiale (une fois)

```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger les modèles IA
ollama pull gemma2:2b
ollama pull qwen2.5-coder:3b
```

### Démarrage quotidien

```bash
# Terminal 1 : Backend
cd backend
node server.js

# Terminal 2 : Frontend
cd ..
pnpm dev
```

**Puis ouvre :** http://localhost:5173

---

## 🧪 Tests rapides

### Vérifier Ollama

```bash
curl http://localhost:11434/api/version
```

### Tester l'API backend

```bash
# Liste des notes
curl http://localhost:5000/api/notes

# Notes dues
curl http://localhost:5000/api/due-notes

# Configuration
curl http://localhost:5000/api/config
```

### Créer une note de test

```bash
curl -X POST http://localhost:5000/api/generate-note \
  -H "Content-Type: application/json" \
  -d '{
    "aiTags": ["claudeCode"],
    "title": "Test JavaScript",
    "description": "Les fonctions renvoient undefined par défaut",
    "intensity": "moderate"
  }'
```

---

## 📁 Fichiers de données

```bash
# Notes stockées
cat backend/data/notes.json | jq

# Configuration
cat backend/data/config.json | jq
```

---

## 🐛 Dépannage express

### Problème : Port 5000 déjà utilisé

```bash
# Trouver le processus
lsof -i :5000

# Tuer le processus
kill -9 <PID>
```

### Problème : Ollama pas démarré

```bash
# Démarrer Ollama
ollama serve
```

### Problème : Modèle manquant

```bash
# Lister les modèles installés
ollama list

# Télécharger un modèle
ollama pull gemma2:2b
```

---

## 📖 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Guide complet
- [IA_INTEGRATION.md](IA_INTEGRATION.md) - Doc technique IA
- [IA_COMPLETE.md](IA_COMPLETE.md) - Résumé implémentation
- [BILAN.md](BILAN.md) - État du projet
- [AGENTS.md](AGENTS.md) - Objectifs du projet

---

## 🎯 Flux d'utilisation rapide

1. **Créer une note** → index.html
2. **Répondre aux questions** → pages/review.html
3. **Voir toutes les notes** → pages/notes.html

---

## 🔧 Développement

### Structure importante

```
backend/
  lib/
    ai.js          ← Logique IA (modèles, génération, évaluation)
    scheduler.js   ← Algorithme de révision espacée
    dataStore.js   ← Lecture/écriture fichiers JSON
  routes/
    routeHandlers.js ← Routes API
  data/
    notes.json     ← Stockage des notes
    config.json    ← Configuration

src/
  main.js        ← Page principale (création notes)
  review.js      ← Page révisions (interrogations)
  config.js      ← Gestion configuration
  toast.js       ← Système de notifications
```

### Fichiers clés IA

- [backend/lib/ai.js](backend/lib/ai.js) - Toute la logique IA
- [backend/routes/routeHandlers.js](backend/routes/routeHandlers.js) - Routes API IA
- [src/review.js](src/review.js) - Intégration frontend

---

## ⚙️ Configuration des modèles

Éditer `backend/lib/ai.js` ligne 8-12 :

```javascript
const MODELS = {
	lightweight: "gemma2:2b", // Modèle par défaut
	code: "qwen2.5-coder:3b", // Modèle code
	fallback: "gemma2:2b", // Secours
};
```

---

## 📊 Statistiques actuelles

**Progression projet : ~85%**

```
✅ Saisie notes
✅ Stockage local
✅ Scheduling adaptatif
✅ Affichage cartes
✅ Notifications
✅ API complète
✅ Intégration IA
✅ Génération questions
✅ Évaluation réponses
✅ Génération indices
⚠️  Gestion notes (40%)
❌ Statistiques (0%)
⚠️  Tests (20%)
```

---

## 🎓 Ressources

- [Ollama Docs](https://ollama.com/docs)
- [Gemma2 Model](https://ollama.com/library/gemma2)
- [Qwen2.5-Coder Model](https://ollama.com/library/qwen2.5-coder)

---

**Bon apprentissage ! 🚀**
