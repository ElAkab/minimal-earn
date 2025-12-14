# Système de Pré-génération de Questions

## 📋 Vue d'ensemble

Le système de pré-génération permet de créer les questions en arrière-plan **avant** les sessions de révision, améliorant l'expérience utilisateur en éliminant les temps d'attente lors de la consultation des cartes mémo.

## 🎯 Objectifs

- **Réduire la latence** : Questions prêtes avant que l'utilisateur ne les consulte
- **Optimiser les ressources IA** : Génération anticipée pendant les périodes creuses
- **Améliorer l'UX** : Expérience fluide sans attente
- **Cache intelligent** : Réutilise les questions valides existantes

## 📁 Architecture

### Fichiers

- `backend/lib/preGenerator.js` : Module principal de pré-génération
- `backend/lib/preGenerator.test.js` : Tests unitaires
- `backend/routes/routeHandlers.js` : Endpoints API

### Dépendances

- `sessionScheduler.js` : Identification des notes prioritaires
- `questionCache.js` : Vérification et stockage du cache
- `ai.js` : Génération des questions via IA
- `dataStore.js` : Accès aux notes

## 🔧 Configuration

### Variables d'environnement

```bash
# Activer/désactiver la pré-génération (défaut: true)
PREGENERATE_ENABLED=true

# Timeout par question en ms (défaut: 30000)
PREGENERATE_TIMEOUT=30000
```

### Configuration par défaut

```javascript
{
  intensities: ['intensive', 'moderate', 'chill'], // Ordre de priorité
  questionTimeout: 30000,                          // 30 secondes par question
  maxQuestionsPerRun: 20,                          // Limite par exécution
  enabled: true                                    // Actif par défaut
}
```

## 📚 API du module

### `preGenerateForUpcomingSessions(options?)`

Fonction principale qui pré-génère les questions pour les prochaines sessions.

**Paramètres :**

```javascript
{
  intensities: ['intensive', 'moderate'], // Intensités à traiter (optionnel)
  maxQuestions: 10                        // Limite de questions (optionnel)
}
```

**Retour :**

```javascript
{
  enabled: true,
  summary: {
    total: 15,        // Total de notes traitées
    cached: 8,        // Questions déjà en cache
    generated: 5,     // Questions nouvellement générées
    failed: 2,        // Échecs de génération
    skipped: 0        // Notes ignorées
  },
  results: [
    {
      noteId: 123,
      status: 'generated',  // 'cached' | 'generated' | 'failed'
      question: '...',
      model: 'gpt-oss',
      duration: 1234        // ms (si généré)
    },
    // ...
  ],
  duration: 5678,           // Durée totale en ms
  timestamp: '2025-12-14T...'
}
```

**Exemple :**

```javascript
import * as preGenerator from "./lib/preGenerator.js";

// Pré-générer toutes les intensités
const report = await preGenerator.preGenerateForUpcomingSessions();
console.log(`${report.summary.generated} questions générées`);

// Pré-générer uniquement l'intensive
const intensiveReport = await preGenerator.preGenerateForUpcomingSessions({
	intensities: ["intensive"],
	maxQuestions: 5,
});
```

### `getPreGeneratorConfig()`

Récupère la configuration actuelle du pré-générateur.

**Retour :**

```javascript
{
  intensities: ['intensive', 'moderate', 'chill'],
  questionTimeout: 30000,
  maxQuestionsPerRun: 20,
  enabled: true
}
```

### `updatePreGeneratorConfig(newConfig)`

Met à jour la configuration du pré-générateur.

**Paramètres :**

```javascript
{
  intensities: ['intensive'],  // Optionnel
  questionTimeout: 60000,      // Optionnel
  maxQuestionsPerRun: 50,      // Optionnel
  enabled: true                // Optionnel
}
```

**Exemple :**

```javascript
preGenerator.updatePreGeneratorConfig({
	maxQuestionsPerRun: 50,
	questionTimeout: 60000,
});
```

## 🌐 Endpoints API

### `POST /api/pre-generate`

Déclenche manuellement la pré-génération.

**Body (optionnel) :**

```json
{
	"intensities": ["intensive", "moderate"],
	"maxQuestions": 10
}
```

**Réponse :**

```json
{
  "message": "Pré-génération terminée",
  "report": {
    "enabled": true,
    "summary": {
      "total": 10,
      "cached": 5,
      "generated": 3,
      "failed": 2,
      "skipped": 0
    },
    "results": [...],
    "duration": 5678,
    "timestamp": "2025-12-14T..."
  }
}
```

**Exemple curl :**

```bash
# Déclencher la pré-génération complète
curl -X POST http://localhost:3456/api/pre-generate

# Déclencher pour intensités spécifiques
curl -X POST http://localhost:3456/api/pre-generate \
  -H "Content-Type: application/json" \
  -d '{"intensities": ["intensive"], "maxQuestions": 5}'
```

### `GET /api/pre-generate/config`

Récupère la configuration actuelle.

**Réponse :**

```json
{
	"intensities": ["intensive", "moderate", "chill"],
	"questionTimeout": 30000,
	"maxQuestionsPerRun": 20,
	"enabled": true
}
```

### `PUT /api/pre-generate/config`

Met à jour la configuration.

**Body :**

```json
{
	"maxQuestionsPerRun": 50,
	"questionTimeout": 60000,
	"enabled": true
}
```

**Réponse :**

```json
{
	"message": "Configuration mise à jour",
	"config": {
		"intensities": ["intensive", "moderate", "chill"],
		"questionTimeout": 60000,
		"maxQuestionsPerRun": 50,
		"enabled": true
	}
}
```

## 🔄 Processus de pré-génération

### Workflow

```
1. Vérifier si activé (PREGENERATE_ENABLED)
   ↓
2. Charger toutes les notes (dataStore.readNotes())
   ↓
3. Pour chaque intensité (par priorité) :
   │
   ├─→ Identifier les notes de session (sessionScheduler.getSessionNotes())
   │   ↓
   ├─→ Pour chaque note :
   │   │
   │   ├─→ Vérifier le cache (questionCache.getCachedQuestion())
   │   │   ├─→ Si en cache : status = 'cached'
   │   │   └─→ Si absent :
   │   │       ├─→ Générer avec timeout (ai.generateQuestion())
   │   │       ├─→ Déterminer modèle (ai.pickModelForTask())
   │   │       ├─→ Mettre en cache (questionCache.cacheQuestion())
   │   │       └─→ status = 'generated' ou 'failed'
   │   │
   │   └─→ Enregistrer résultat
   │
   └─→ Vérifier limite maxQuestions
       ↓
4. Calculer statistiques globales
   ↓
5. Nettoyer cache expiré (async)
   ↓
6. Retourner rapport détaillé
```

### Gestion des erreurs

Le système gère les erreurs à plusieurs niveaux :

1. **Timeout par question** (30s par défaut)

   - Empêche le blocage sur une question lente
   - Status = 'failed' avec message d'erreur

2. **Erreur IA**

   - Capture les erreurs d'Ollama
   - Continue avec les notes suivantes

3. **Erreur globale**
   - Capture les erreurs critiques
   - Retourne un rapport avec `error` field

## 📊 Logs

Le système produit des logs détaillés pour le suivi :

```
🚀 [PRE-GEN] Démarrage de la pré-génération...
📚 [PRE-GEN] 25 note(s) chargée(s)
📋 [PRE-GEN] Traitement intensité "intensive" : 10 note(s)
✅ [PRE-GEN] Note 123 déjà en cache (modèle: gpt-oss)
🤖 [PRE-GEN] Génération pour note 456 (JavaScript)...
✅ [PRE-GEN] Question générée et mise en cache pour note 456 (1234ms)
❌ [PRE-GEN] Échec génération note 789: Timeout après 30000ms
✅ [PRE-GEN] Pré-génération terminée:
   📊 Total: 10
   💾 En cache: 5
   ✨ Générées: 3
   ❌ Échecs: 2
   ⏱️ Durée: 12.34s
```

## 🧪 Tests

Exécuter les tests unitaires :

```bash
cd backend
pnpm test preGenerator
```

**Tests inclus :**

- Pré-génération avec/sans cache
- Gestion des erreurs et timeouts
- Respect des limites (maxQuestions)
- Traitement multi-intensités
- Configuration dynamique

## 🚀 Cas d'usage

### 1. Pré-génération nocturne (cron)

```javascript
// Exécuter tous les jours à 2h du matin
// cron: 0 2 * * *

import * as preGenerator from "./backend/lib/preGenerator.js";

async function nightlyPreGeneration() {
	console.log("🌙 Pré-génération nocturne...");
	const report = await preGenerator.preGenerateForUpcomingSessions();
	console.log(`✅ ${report.summary.generated} questions préparées`);
}

nightlyPreGeneration();
```

### 2. Pré-génération avant session

```javascript
// Exécuter 30 minutes avant chaque session

import * as sessionScheduler from "./backend/lib/sessionScheduler.js";
import * as preGenerator from "./backend/lib/preGenerator.js";

async function preGenerateBeforeSession(intensity) {
	const nextSession = sessionScheduler.getNextSessionTime(intensity);
	const minutesToSession = (nextSession - new Date()) / 60000;

	if (minutesToSession <= 30) {
		await preGenerator.preGenerateForUpcomingSessions({
			intensities: [intensity],
			maxQuestions: 10,
		});
	}
}
```

### 3. Pré-génération déclenchée par utilisateur

```javascript
// Frontend : bouton "Préparer les questions"

async function prepareQuestions() {
	const response = await fetch("/api/pre-generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			intensities: ["intensive"],
			maxQuestions: 5,
		}),
	});

	const result = await response.json();
	console.log(`${result.report.summary.generated} questions prêtes !`);
}
```

## 🔮 Phase 2 : Améliorations futures

### Planifié

- ✅ Cache persistant (implémenté via `questionCache.js`)
- 🔄 Scheduler automatique (cron intégré)
- 📊 Métriques de performance (temps de génération, taux de cache hit)
- 🎯 Prédiction intelligente (ML pour anticiper les notes prioritaires)
- ⚡ File d'attente avec priorités
- 🔄 Régénération automatique des questions expirées
- 📱 Notifications push avant les sessions

### En cours

Le cache persistant est **déjà implémenté** via `questionCache.js` :

- Stockage dans `backend/data/questionCache.json`
- TTL configurable (7 jours par défaut)
- Vérification automatique d'expiration
- Intégration complète avec le pré-générateur

## 📈 Performance

### Métriques typiques

- **Questions en cache** : ~0ms (instantané)
- **Questions générées** : ~1-5s (modèle léger), ~10-30s (modèle lourd)
- **Timeout** : 30s par question
- **Throughput** : ~20 questions/minute (modèle léger)

### Optimisations

1. **Cache intelligent** : Réutilise les questions valides
2. **Timeout agressif** : Évite le blocage sur questions lentes
3. **Traitement séquentiel** : Évite la surcharge IA
4. **Nettoyage asynchrone** : N'impacte pas la performance

## ⚠️ Limitations connues

1. **Traitement séquentiel** : Une question à la fois (évite la surcharge)
2. **Pas de parallélisation** : Simplifie la logique et évite les race conditions
3. **Timeout global** : Pas de limite de temps totale (uniquement par question)
4. **Pas de retry** : Les échecs ne sont pas retentés automatiquement

Ces limitations sont intentionnelles pour garder le système simple et fiable.
