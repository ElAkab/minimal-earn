# 🚀 Nouvelle Architecture - Guide de Migration

## 📋 Vue d'ensemble

Cette refonte introduit une architecture **modulaire**, **maintenable** et **extensible** pour le système de révisions.

### Principaux changements

1. **Séparation Notes / Révisions**

   - Notes dans `backend/data/notes.json` (structure initiale)
   - Révisions dans `backend/data/reviews.json` (nouvelles données)

2. **Smart Scheduler**

   - Basé sur `difficulty_rating` (1-5) au lieu de calculs complexes
   - Ajustement dynamique selon les performances
   - Configuration simple et extensible

3. **Stratégie IA Hybride**

   - IA externe rapide par défaut (OpenRouter, OpenAI, etc.)
   - Ollama local en fallback
   - Configuration via variables d'environnement

4. **Job Queue**
   - Traitement asynchrone des tâches IA
   - Évite la surcharge CPU
   - Priorités configurables

---

## 📁 Nouveaux Fichiers

### Backend - Data Layer

| Fichier                      | Description                               |
| ---------------------------- | ----------------------------------------- |
| `backend/data/reviews.json`  | Stockage des révisions séparées des notes |
| `backend/lib/reviewStore.js` | CRUD pour les révisions + statistiques    |

### Backend - Scheduling

| Fichier                         | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `backend/lib/smartScheduler.js` | Nouveau scheduler basé sur difficulty_rating |

### Backend - IA

| Fichier                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| `backend/lib/aiService.js` | Service IA centralisé avec stratégie hybride |
| `backend/lib/aiQueue.js`   | Job Queue pour tâches IA asynchrones         |
| `backend/lib/aiWorker.js`  | Worker connectant Queue + AI Service         |

### Backend - API

| Fichier                       | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `backend/routes/newRoutes.js` | Nouvelles routes v2 utilisant le nouveau système |

---

## 🔄 Migration Progressive

### Étape 1 : Installation (sans casser l'existant)

Tous les nouveaux fichiers coexistent avec les anciens. **Aucune modification destructive**.

### Étape 2 : Configuration

Créer un fichier `.env` à la racine du projet :

```bash
# Provider IA par défaut (ollama ou openrouter)
AI_PROVIDER=ollama

# API Keys (optionnel, seulement si AI_PROVIDER != ollama)
OPENROUTER_API_KEY=your_key_here

# Timeout Ollama (ms)
OLLAMA_TIMEOUT=30000
```

### Étape 3 : Démarrage du Worker IA

Ajouter dans `backend/server.js` :

```javascript
import { startAIWorker } from "./lib/aiWorker.js";

// Démarrer le worker IA au démarrage du serveur
startAIWorker();
```

### Étape 4 : Monter les nouvelles routes

Ajouter dans `backend/server.js` :

```javascript
import newRoutes from "./routes/newRoutes.js";

// Monter les nouvelles routes v2
app.use("/api/v2", newRoutes);
```

### Étape 5 : Tester la nouvelle API

```bash
# Démarrer une session
curl -X POST http://localhost:5000/api/v2/session/start \
  -H "Content-Type: application/json" \
  -d '{"intensity": "moderate"}'

# Récupérer une question
curl "http://localhost:5000/api/v2/session/session_123/next?noteId=1"

# Soumettre une réponse
curl -X POST http://localhost:5000/api/v2/session/submit \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session_123",
    "note_id": 1,
    "question": "Quelle est la capitale ?",
    "user_response": "Paris",
    "response_time": 15
  }'
```

---

## 🎯 Structure d'une Révision

```json
{
	"id": 1702834567890,
	"session_id": "session_1702834567890",
	"note_id": 123,
	"ia_question": "Quelle est la capitale de la France ?",
	"ia_model": "gpt-oss",
	"user_response": "Paris",
	"ia_evaluation": true,
	"ia_feedback": "CORRECT - Réponse exacte",
	"difficulty_rating": 4,
	"response_time": 15,
	"next_review_date": "2025-12-16T10:00:00.000Z",
	"reviewed_at": "2025-12-15T10:00:00.000Z",
	"created_at": "2025-12-15T10:00:00.000Z"
}
```

### Champs clés

- **difficulty_rating** (1-5) : Clé du scheduler

  - 1 = Très difficile → réviser très souvent
  - 5 = Très facile → réviser rarement

- **next_review_date** : Calculée automatiquement par le smart scheduler

- **session_id** : Permet de grouper les révisions pour l'analytique

---

## 🧠 Smart Scheduler - Logique

### Calcul de l'intervalle

```
Intervalle = Base × Difficulté × Progression
```

- **Base** : Défini par l'intensité (chill=24h, moderate=12h, intensive=8h)
- **Difficulté** : Multiplicateur selon difficulty_rating
  - Rating 1 : ×0.5 (réviser 2× plus souvent)
  - Rating 3 : ×1.0 (normal)
  - Rating 5 : ×3.0 (réviser 3× moins souvent)
- **Progression** : ×1.5 après chaque réussite (max 5 succès)

### Exemple

```javascript
// Note "moderate" (12h) avec difficulty_rating = 2, première révision réussie
Intervalle = 12h × 0.75 × 1.5 = 13.5h

// Même note après 3 succès
Intervalle = 12h × 0.75 × (1.5^3) = 30.4h
```

---

## ⚙️ Configuration Extensible

### Scheduler

```javascript
import { updateSchedulerConfig } from "./backend/lib/smartScheduler.js";

// Modifier les intervalles de base
updateSchedulerConfig({
	baseIntervals: {
		chill: 48, // 2 jours au lieu de 1
		moderate: 18, // 18h au lieu de 12h
	},
});
```

### Provider IA

```javascript
import { setAIProvider } from "./backend/lib/aiService.js";

// Changer de provider à la volée
setAIProvider("openrouter"); // ou "ollama"
```

---

## 📊 Nouvelle Page Statistiques

Les révisions permettent des statistiques riches :

```javascript
// Stats par note
GET /api/v2/notes/123/stats
{
  "total": 15,
  "correct": 12,
  "incorrect": 3,
  "successRate": 80,
  "averageDifficulty": "3.4",
  "lastReviewed": "2025-12-15T..."
}

// Stats globales
GET /api/v2/stats/global
{
  "total": 156,
  "correct": 142,
  "incorrect": 14,
  "successRate": 91.03,
  "averageDifficulty": "3.8",
  "totalNotes": 45
}
```

---

## 🔮 Futures Fonctionnalités

### Page Paramètres (préparée mais non implémentée)

L'architecture est prête pour :

- **Choix du provider IA** (Ollama local vs IA externe)
- **Personnalisation du scheduler** (intervalles, multiplicateurs)
- **Sélection de séries de notes** (par tag, par intensité)
- **Configuration des notifications** (fréquence, type)
- **Historique détaillé** des sessions

Toutes les fonctions de configuration existent déjà dans les modules :

- `smartScheduler.updateSchedulerConfig()`
- `aiService.setAIProvider()`
- etc.

---

## 🧪 Tests

### Tester le scheduler

```javascript
import * as scheduler from "./backend/lib/smartScheduler.js";

const result = scheduler.getSchedulingSummary({
	intensity: "moderate",
	difficultyRating: 3,
	reviewCount: 2,
	wasCorrect: true,
});

console.log(result);
// {
//   intervalHours: "27.00",
//   intervalDays: "1.12",
//   nextReviewDate: "2025-12-16T13:00:00.000Z",
//   ...
// }
```

### Tester la queue

```javascript
import { aiQueue, PRIORITIES } from "./backend/lib/aiQueue.js";

// Ajouter un job
const result = await aiQueue.add("test-job", { data: "test" }, PRIORITIES.HIGH);

// Stats
console.log(aiQueue.getStats());
```

---

## 🚨 Points d'Attention

### 1. Compatibilité Ollama

Si vous utilisez Ollama en local :

- Assurez-vous qu'Ollama est démarré : `ollama serve`
- Les modèles doivent être téléchargés : `ollama pull gpt-oss`

### 2. API Keys Externes

Pour utiliser OpenRouter ou autres :

- Créer un compte sur https://openrouter.ai
- Obtenir une API key
- L'ajouter dans `.env` : `OPENROUTER_API_KEY=sk-...`
- Changer le provider : `AI_PROVIDER=openrouter`

### 3. Performance

- La queue traite **1 job à la fois** (évite la surcharge)
- Les jobs avec priorité haute passent devant
- Les timeouts sont configurables par provider

---

## 📖 Documentation des Modules

Chaque fichier est **abondamment commenté** avec :

- Description du module
- Philosophie et cas d'usage
- JSDoc pour toutes les fonctions
- Exemples d'utilisation

Lire les commentaires dans :

- `backend/lib/reviewStore.js` → Gestion des révisions
- `backend/lib/smartScheduler.js` → Logique de scheduling
- `backend/lib/aiService.js` → Stratégie IA hybride
- `backend/lib/aiQueue.js` → Job Queue asynchrone
- `backend/routes/newRoutes.js` → API v2

---

## 🎓 Philosophie Pédagogique

Cette architecture privilégie :

1. **Clarté** : Chaque module a une responsabilité unique
2. **Modularité** : Facile d'ajouter de nouveaux providers IA ou schedulers
3. **Testabilité** : Toutes les fonctions sont pures et testables
4. **Extensibilité** : Prêt pour une page Paramètres sans refonte
5. **Simplicité** : Pas de sur-ingénierie, juste ce qui est nécessaire

---

## 🤝 Cohabitation Ancien/Nouveau

Les deux systèmes coexistent :

| Système     | Routes      | Fichiers                                              |
| ----------- | ----------- | ----------------------------------------------------- |
| **Ancien**  | `/api/*`    | `scheduler.js`, `ai.js` (legacy)                      |
| **Nouveau** | `/api/v2/*` | `smartScheduler.js`, `aiService.js`, `reviewStore.js` |

**Migration recommandée** :

1. Tester v2 en parallèle
2. Migrer progressivement le frontend
3. Désactiver les anciennes routes une fois v2 stable

---

## ✅ Checklist de Migration

- [ ] Fichier `.env` créé avec configuration IA
- [ ] Worker IA démarré dans `server.js`
- [ ] Routes v2 montées sur `/api/v2`
- [ ] Tests des endpoints v2
- [ ] Frontend adapté pour utiliser `/api/v2`
- [ ] Vérification des statistiques
- [ ] Documentation lue et comprise

---

**Prêt à démarrer ? Commence par l'Étape 1 ! 🚀**
