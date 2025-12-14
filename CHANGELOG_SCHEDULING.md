# 🎯 Améliorations du système de scheduling

## ✅ Fonctionnalités implémentées

### 1. **Anticipation des sessions** ([sessionScheduler.js](backend/lib/sessionScheduler.js))

#### Nouvelles fonctions

##### `getUpcomingSessionNotes(allNotes, intensity, lookahead)`

- Identifie les notes des prochaines sessions pour une intensité donnée
- Paramètre `lookahead` pour définir la fenêtre d'anticipation (défaut: 24h)
- Retourne : `{ nextSession, notes, timeUntil, withinLookahead }`

##### `getAllUpcomingSessions(allNotes, lookahead)`

- Récupère toutes les sessions à venir (toutes intensités)
- Trie par proximité (sessions les plus proches en premier)
- Utile pour planification globale et pré-génération intelligente

**Exemple d'utilisation :**

```javascript
const upcoming = sessionScheduler.getAllUpcomingSessions(
	notes,
	24 * 60 * 60 * 1000
);
upcoming.forEach((session) => {
	console.log(
		`${session.intensity}: ${session.notes.length} notes dans ${session.timeUntil}ms`
	);
});
```

---

### 2. **Métriques de cache** ([questionCache.js](backend/lib/questionCache.js))

#### Fonctions de tracking

- `recordCacheHit()` : Enregistre un hit (question trouvée en cache)
- `recordCacheMiss()` : Enregistre un miss (question non trouvée)
- `recordGeneration()` : Enregistre une génération de question
- `getCacheMetrics()` : Récupère les statistiques hit/miss
- `resetCacheMetrics()` : Réinitialise les compteurs

**Métriques retournées :**

```javascript
{
  hits: 45,              // Nombre de cache hits
  misses: 12,            // Nombre de cache misses
  generations: 12,       // Générations effectuées
  totalRequests: 57,     // Total de requêtes
  hitRate: 78.95         // Taux de hit en %
}
```

**Intégration automatique :**
Le handler `GET /api/generate-question/:id` enregistre maintenant automatiquement :

- Cache hit quand question trouvée en cache
- Cache miss + generation quand nouvelle question générée

---

### 3. **Endpoints API** ([routeHandlers.js](backend/routes/routeHandlers.js))

#### `GET /api/upcoming-sessions`

Récupère les sessions à venir avec statut de préparation du cache.

**Query params :**

- `lookahead` (heures, défaut: 24)

**Réponse enrichie :**

```json
{
  "lookaheadHours": 24,
  "totalSessions": 2,
  "sessions": [
    {
      "intensity": "intensive",
      "nextSession": "2025-12-14T14:00:00Z",
      "timeUntil": 7200000,
      "withinLookahead": true,
      "notes": [...],
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

**Usage :**

```bash
curl http://localhost:3456/api/upcoming-sessions?lookahead=6
```

---

#### `GET /api/current-session` (amélioré ⭐)

**Nouvelles fonctionnalités :**

1. ✅ Vérifie si la question de la note prioritaire est déjà en cache
2. ✅ Retourne `questionCached: true/false` dans la réponse
3. ✅ **Pré-génération automatique** : Si une session est dans moins de 2h, déclenche `preGenerateForUpcomingSessions()` en arrière-plan

**Réponse enrichie :**

```json
{
  "enabled": true,
  "sessionActive": true,
  "activeIntensity": "intensive",
  "priorityNote": { "id": 123 },
  "questionCached": true,  // ← NOUVEAU
  "nextSessions": { ... }
}
```

**Avantage :**

- Frontend sait si la question est prête instantanément
- Pré-génération automatique = meilleure UX sans intervention manuelle

---

#### `GET /api/cache-metrics`

Récupère les métriques de performance du cache.

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
	"timestamp": "2025-12-14T12:00:00Z"
}
```

---

#### `POST /api/cache-metrics/reset`

Réinitialise les compteurs de métriques.

```bash
curl -X POST http://localhost:3456/api/cache-metrics/reset
```

---

## 📊 Schéma de fonctionnement

### Workflow de pré-génération intelligente

```
1. Utilisateur ouvre l'app
   ↓
2. Frontend appelle GET /api/current-session
   ↓
3. Backend vérifie session active + cache
   ↓
4. Backend détecte session dans < 2h → Pré-génération automatique (async)
   ↓
5. Frontend reçoit { questionCached: true/false }
   ↓
6. Si questionCached=false → Afficher loader
   Si questionCached=true → Afficher question instantanément
```

### Tracking des métriques

```
Chaque appel à GET /api/generate-question/:id
   ↓
Question en cache?
   ├─ Oui → recordCacheHit()
   └─ Non → recordCacheMiss() + generateQuestion() + recordGeneration()
   ↓
Métriques mises à jour en temps réel
   ↓
Consultables via GET /api/cache-metrics
```

---

## 🧪 Tests

### Script de test local

```bash
cd backend/lib
node test-upcoming-sessions.js
```

**Ce script teste :**

1. Sessions à venir (lookahead 24h)
2. Sessions par intensité (lookahead 48h)
3. Métriques de cache actuelles
4. Détection de sessions imminentes (2h)

### Tests API

```bash
# 1. Sessions à venir
curl http://localhost:3456/api/upcoming-sessions

# 2. Session active (avec pré-génération auto)
curl http://localhost:3456/api/current-session

# 3. Métriques de cache
curl http://localhost:3456/api/cache-metrics

# 4. Réinitialiser métriques
curl -X POST http://localhost:3456/api/cache-metrics/reset
```

---

## 📈 Avantages

### Pour l'utilisateur

- ✅ Questions prêtes instantanément (grâce au cache)
- ✅ Pas d'attente lors des sessions actives
- ✅ Pré-génération automatique avant les sessions

### Pour le développeur

- ✅ Visibilité sur la santé du cache (hit rate)
- ✅ Identification des sessions mal préparées
- ✅ Optimisation basée sur les données réelles
- ✅ Code modulaire et extensible

### Pour la performance

- ✅ Réduction des appels IA pendant les sessions
- ✅ Utilisation optimale des ressources (pré-génération async)
- ✅ Monitoring en temps réel de l'efficacité

---

## 🎯 Cas d'usage

### 1. Dashboard de monitoring

```javascript
async function showDashboard() {
	const { sessions } = await fetch("/api/upcoming-sessions?lookahead=24").then(
		(r) => r.json()
	);
	const { metrics } = await fetch("/api/cache-metrics").then((r) => r.json());

	console.log(`Cache hit rate: ${metrics.hitRate}%`);
	sessions.forEach((s) => {
		console.log(`${s.intensity}: ${s.cacheStatus.percentage}% prêt`);
	});
}
```

### 2. Optimisation proactive

```javascript
async function ensureReadyForSession() {
	const { sessions } = await fetch("/api/upcoming-sessions?lookahead=2").then(
		(r) => r.json()
	);

	for (const session of sessions) {
		if (session.cacheStatus.missing > 0) {
			await fetch("/api/pre-generate", {
				method: "POST",
				body: JSON.stringify({ intensities: [session.intensity] }),
			});
		}
	}
}
```

### 3. Alertes intelligentes

```javascript
async function checkHealth() {
	const { metrics } = await fetch("/api/cache-metrics").then((r) => r.json());

	if (metrics.hitRate < 70) {
		console.warn("⚠️ Taux de cache hit faible, augmenter pré-génération");
	}
}
```

---

## 📝 Fichiers modifiés

| Fichier                                                                        | Modifications                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [backend/lib/sessionScheduler.js](backend/lib/sessionScheduler.js)             | + `getUpcomingSessionNotes()`, `getAllUpcomingSessions()` |
| [backend/lib/questionCache.js](backend/lib/questionCache.js)                   | + Métriques hit/miss (5 nouvelles fonctions)              |
| [backend/routes/routeHandlers.js](backend/routes/routeHandlers.js)             | + 3 endpoints, amélioration `/current-session`            |
| [backend/lib/test-upcoming-sessions.js](backend/lib/test-upcoming-sessions.js) | ✨ Script de test complet                                 |
| [backend/lib/UPCOMING_SESSIONS.md](backend/lib/UPCOMING_SESSIONS.md)           | 📚 Documentation complète                                 |

---

## 🚀 Prochaines étapes (optionnel)

### Phase 2 : Persistance des métriques

- Stocker historique dans `backend/data/cache-metrics.json`
- Graphiques de tendance dans le temps
- Statistiques hebdomadaires/mensuelles

### Phase 3 : Interface utilisateur

- Dashboard avec métriques en temps réel
- Timeline des prochaines sessions
- Bouton "Préparer sessions maintenant"

### Phase 4 : Intelligence artificielle

- ML pour prédire sessions les plus probables
- Auto-tuning du lookahead selon patterns
- Recommandations automatiques de pré-génération

---

## ✅ Checklist de validation

- [x] Fonctions scheduler implémentées et testées
- [x] Métriques de cache opérationnelles
- [x] Endpoints API créés et documentés
- [x] Intégration automatique dans `/current-session`
- [x] Script de test fourni
- [x] Documentation complète
- [x] Aucune erreur de compilation
- [x] Code commenté et lisible

---

**Résultat :** Système de scheduling et cache considérablement amélioré, prêt pour utilisation en production ! 🎉
