# Sessions à venir et Métriques de Cache

## 📋 Vue d'ensemble

Ce module étend le système de scheduling pour anticiper les prochaines sessions et suivre les performances du cache de questions.

### Fonctionnalités principales

1. **Anticipation des sessions** : Identifier les sessions à venir dans une fenêtre temporelle
2. **Métriques de cache** : Suivre les taux de cache hit/miss
3. **Pré-génération intelligente** : Déclencher automatiquement la pré-génération avant les sessions
4. **API complète** : Endpoints REST pour interroger sessions et métriques

---

## 🔧 Fonctions du scheduler

### `getUpcomingSessionNotes(allNotes, intensity, lookahead)`

Récupère les notes des sessions à venir pour une intensité donnée.

**Paramètres :**

- `allNotes` (Array) : Toutes les notes disponibles
- `intensity` (string) : Intensité à analyser (`'intensive'`, `'moderate'`, `'chill'`)
- `lookahead` (number) : Durée d'anticipation en millisecondes (défaut: 24h)

**Retour :**

```javascript
{
  nextSession: Date,           // Date de la prochaine session
  notes: Array,                // Notes à réviser
  timeUntil: number,           // Temps restant en ms
  withinLookahead: boolean     // Si dans la fenêtre d'anticipation
}
```

**Exemple :**

```javascript
import * as sessionScheduler from "./lib/sessionScheduler.js";
import * as dataStore from "./lib/dataStore.js";

const notes = await dataStore.readNotes();
const lookahead = 24 * 60 * 60 * 1000; // 24h

const upcoming = sessionScheduler.getUpcomingSessionNotes(
	notes,
	"intensive",
	lookahead
);

console.log(`Prochaine session intensive dans ${upcoming.timeUntil}ms`);
console.log(`${upcoming.notes.length} notes à préparer`);
```

---

### `getAllUpcomingSessions(allNotes, lookahead)`

Récupère toutes les sessions à venir pour toutes les intensités.

**Paramètres :**

- `allNotes` (Array) : Toutes les notes disponibles
- `lookahead` (number) : Durée d'anticipation en millisecondes (défaut: 24h)

**Retour :**

```javascript
[
	{
		intensity: string,
		nextSession: Date,
		notes: Array,
		timeUntil: number,
		withinLookahead: boolean,
	},
	// ... autres sessions triées par proximité
];
```

**Exemple :**

```javascript
const upcoming = sessionScheduler.getAllUpcomingSessions(
	notes,
	2 * 60 * 60 * 1000
); // 2h

upcoming.forEach((session) => {
	if (session.withinLookahead) {
		console.log(`⚠️ Session ${session.intensity} dans ${session.timeUntil}ms`);
	}
});
```

---

## 📊 Métriques de cache

### Fonctions de tracking

#### `recordCacheHit()`

Enregistre un cache hit (question trouvée en cache).

#### `recordCacheMiss()`

Enregistre un cache miss (question non trouvée en cache).

#### `recordGeneration()`

Enregistre une nouvelle génération de question.

#### `getCacheMetrics()`

Récupère les métriques de performance du cache.

**Retour :**

```javascript
{
  hits: number,           // Nombre de cache hits
  misses: number,         // Nombre de cache misses
  generations: number,    // Nombre de générations
  totalRequests: number,  // Total de requêtes
  hitRate: number        // Taux de hit en pourcentage
}
```

#### `resetCacheMetrics()`

Réinitialise les compteurs de métriques.

**Exemple d'utilisation :**

```javascript
import * as questionCache from "./lib/questionCache.js";

// Lors d'une récupération de question
const cached = await questionCache.getCachedQuestion(noteId);
if (cached) {
	questionCache.recordCacheHit();
} else {
	questionCache.recordCacheMiss();
	const { question, model } = await ai.generateQuestion(note);
	questionCache.recordGeneration();
	await questionCache.cacheQuestion(noteId, question, model);
}

// Afficher les métriques
const metrics = questionCache.getCacheMetrics();
console.log(`Taux de cache hit: ${metrics.hitRate}%`);
```

---

## 🌐 Endpoints API

### `GET /api/upcoming-sessions`

Récupère les sessions à venir avec statut du cache.

**Query Parameters :**

- `lookahead` (number, optionnel) : Durée en heures (défaut: 24)

**Réponse :**

```json
{
	"lookaheadHours": 24,
	"totalSessions": 2,
	"sessions": [
		{
			"intensity": "intensive",
			"nextSession": "2025-12-14T14:00:00.000Z",
			"timeUntil": 7200000,
			"withinLookahead": true,
			"notes": [
				{
					"id": 123,
					"title": "JavaScript",
					"questionCached": true
				}
			],
			"cacheStatus": {
				"total": 5,
				"cached": 3,
				"missing": 2,
				"percentage": "60.00"
			}
		}
	]
}
```

**Exemple :**

```bash
# Sessions dans les 24h prochaines
curl http://localhost:3456/api/upcoming-sessions

# Sessions dans les 6h prochaines
curl http://localhost:3456/api/upcoming-sessions?lookahead=6
```

---

### `GET /api/current-session` (amélioré)

Récupère la session active avec vérification du cache et pré-génération automatique.

**Nouvelles fonctionnalités :**

- Vérifie si la question de la note prioritaire est en cache
- Déclenche automatiquement la pré-génération si sessions imminentes (2h)
- Retourne `questionCached` pour indiquer si la question est prête

**Réponse enrichie :**

```json
{
	"enabled": true,
	"sessionActive": true,
	"activeIntensity": "intensive",
	"priorityNote": { "id": 123, "title": "..." },
	"questionCached": true,
	"nextSessions": {
		"chill": "2025-12-15T10:00:00.000Z",
		"moderate": "2025-12-14T09:00:00.000Z",
		"intensive": "2025-12-14T14:00:00.000Z"
	}
}
```

**Comportement automatique :**

- Si une session est dans moins de 2h ET n'a pas de questions en cache
- ⇒ Déclenche `preGenerateForUpcomingSessions()` en arrière-plan
- ⇒ Ne bloque pas la réponse HTTP

---

### `GET /api/cache-metrics`

Récupère les métriques de cache (hit/miss) et statistiques.

**Réponse :**

```json
{
	"metrics": {
		"hits": 45,
		"misses": 12,
		"generations": 12,
		"totalRequests": 57,
		"hitRate": 78.95
	},
	"stats": {
		"totalEntries": 10,
		"expiredEntries": 2,
		"validEntries": 8,
		"ttlDays": 7
	},
	"timestamp": "2025-12-14T12:00:00.000Z"
}
```

**Exemple :**

```bash
curl http://localhost:3456/api/cache-metrics
```

---

### `POST /api/cache-metrics/reset`

Réinitialise les compteurs de métriques (hits, misses, generations).

**Réponse :**

```json
{
	"message": "Métriques réinitialisées",
	"metrics": {
		"hits": 0,
		"misses": 0,
		"generations": 0,
		"totalRequests": 0,
		"hitRate": 0
	}
}
```

**Exemple :**

```bash
curl -X POST http://localhost:3456/api/cache-metrics/reset
```

---

## 🧪 Tests

### Script de test local

```bash
cd backend/lib
node test-upcoming-sessions.js
```

Ce script teste :

1. Sessions à venir (24h lookahead)
2. Sessions par intensité (48h lookahead)
3. Métriques de cache actuelles
4. Détection de sessions imminentes (2h)

### Test via API

```bash
# 1. Vérifier les sessions à venir
curl http://localhost:3456/api/upcoming-sessions

# 2. Consulter les métriques
curl http://localhost:3456/api/cache-metrics

# 3. Obtenir la session active (avec pré-génération auto)
curl http://localhost:3456/api/current-session

# 4. Réinitialiser les métriques
curl -X POST http://localhost:3456/api/cache-metrics/reset
```

---

## 📈 Cas d'usage

### 1. Dashboard de monitoring

Afficher les prochaines sessions et l'état de préparation :

```javascript
async function displayDashboard() {
	const response = await fetch("/api/upcoming-sessions?lookahead=48");
	const { sessions } = await response.json();

	sessions.forEach((session) => {
		console.log(
			`${session.intensity}: ${session.cacheStatus.percentage}% prêt`
		);
		if (session.cacheStatus.percentage < 50) {
			console.warn("⚠️ Déclencher pré-génération recommandé");
		}
	});
}
```

### 2. Optimisation de la pré-génération

Déclencher intelligemment selon les sessions imminentes :

```javascript
async function smartPreGenerate() {
	const response = await fetch("/api/upcoming-sessions?lookahead=2");
	const { sessions } = await response.json();

	for (const session of sessions) {
		if (session.cacheStatus.missing > 0) {
			await fetch("/api/pre-generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					intensities: [session.intensity],
					maxQuestions: session.cacheStatus.missing,
				}),
			});
		}
	}
}
```

### 3. Analyse de performance

Suivre l'efficacité du cache :

```javascript
async function analyzePerformance() {
	const response = await fetch("/api/cache-metrics");
	const { metrics, stats } = await response.json();

	console.log(`Cache hit rate: ${metrics.hitRate}%`);
	console.log(`Valid entries: ${stats.validEntries}/${stats.totalEntries}`);

	if (metrics.hitRate < 70) {
		console.warn("Taux de hit faible, augmenter la pré-génération");
	}
}
```

---

## 🎯 Recommandations

### Configuration du lookahead

- **2h** : Pour pré-génération juste-à-temps avant sessions
- **6h** : Pour anticipation modérée avec marge de sécurité
- **24h** : Pour vue d'ensemble et planification quotidienne
- **48h** : Pour analyse long-terme et tendances

### Seuils d'alerte

- `hitRate < 70%` : Augmenter fréquence de pré-génération
- `cacheStatus.percentage < 50%` : Session mal préparée, pré-générer maintenant
- `timeUntil < 2h` : Session imminente, vérifier cache obligatoire

### Stratégie de pré-génération

1. **Continue** : Pré-générer toutes les nuits (cron)
2. **Réactive** : Sur `/current-session`, si session dans < 2h
3. **Manuelle** : Dashboard avec bouton "Préparer sessions"

---

## 🔄 Intégration avec le workflow existant

Le système s'intègre naturellement avec :

- ✅ **questionCache.js** : Tracking automatique des hits/misses
- ✅ **preGenerator.js** : Utilise `getAllUpcomingSessions()` pour cibler
- ✅ **routeHandlers.js** : Endpoints exposés sous `/api`
- ✅ **sessionScheduler.js** : Extension sans modification des fonctions existantes

Aucune modification breaking, uniquement des ajouts.

---

## 📝 Notes importantes

### Métriques en mémoire

Les métriques hit/miss sont stockées **en mémoire** et réinitialisées au redémarrage du serveur. Pour une persistance, implémenter un stockage dans `backend/data/cache-metrics.json`.

### Performance

- `getAllUpcomingSessions()` : O(n) où n = nombre de notes
- `getCacheMetrics()` : O(1) (lecture de compteurs)
- `getCacheStats()` : O(m) où m = nombre d'entrées en cache

### Limitations

- Lookahead max recommandé : 7 jours (au-delà, peu pertinent)
- Métriques limitées à la session courante du serveur
- Cache metrics non historisés (seulement état actuel)

---

## 🚀 Évolutions futures

### Phase 2 (optionnel)

- **Persistance des métriques** : Historique dans fichier JSON
- **Alertes proactives** : Webhook/notification si taux hit < seuil
- **ML prediction** : Prédire les sessions les plus probables selon l'utilisateur
- **Auto-tuning** : Ajuster lookahead selon patterns d'usage

### Intégration frontend

- Dashboard temps réel avec métriques
- Graphiques de tendance hit/miss rate
- Timeline des prochaines sessions avec préparation %
- Bouton manuel "Pré-générer maintenant"

---

## ✅ Checklist de déploiement

- [x] Fonctions scheduler ajoutées
- [x] Métriques de cache implémentées
- [x] Endpoints API créés
- [x] Tests locaux disponibles
- [x] Documentation complète
- [ ] Tests d'intégration (optionnel)
- [ ] Monitoring en production (optionnel)

---

**Auteur:** Système de pré-génération et monitoring  
**Date:** 14 décembre 2025  
**Version:** 1.0.0
