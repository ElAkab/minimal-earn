# Système de Cache de Questions

## 📋 Vue d'ensemble

Le système de cache de questions permet d'optimiser les performances de l'application en évitant de régénérer des questions déjà créées par l'IA. Les questions sont stockées avec une durée de vie (TTL) configurable.

## 🎯 Objectifs

- **Réduire la charge IA** : Éviter de solliciter Ollama pour des questions déjà générées
- **Améliorer les temps de réponse** : Réponses instantanées pour les questions en cache
- **Persistance** : Le cache survit aux redémarrages du serveur
- **Gestion automatique** : Expiration et nettoyage automatiques

## 📁 Architecture

### Fichiers

- `backend/data/questionCache.json` : Stockage persistant du cache
- `backend/lib/questionCache.js` : Module de gestion du cache
- `backend/lib/questionCache.test.js` : Tests unitaires

### Structure du cache

```json
{
	"noteId": {
		"question": "Quelle est la capitale de la France ?",
		"model": "gpt-oss",
		"generatedAt": "2025-12-14T10:30:00.000Z",
		"expiresAt": "2025-12-21T10:30:00.000Z",
		"_expiresAtTimestamp": 1734779400000
	}
}
```

## 🔧 Configuration

### TTL (Time To Live)

Par défaut, les questions sont en cache pendant **7 jours**. Configurable via variable d'environnement :

```bash
# Dans .env ou au démarrage
export QUESTION_CACHE_TTL=604800000  # 7 jours en millisecondes
```

Exemples de valeurs :

- 1 jour : `86400000`
- 3 jours : `259200000`
- 7 jours : `604800000` (défaut)
- 14 jours : `1209600000`

## 📚 API du module

### `cacheQuestion(noteId, question, model, ttl?)`

Met en cache une question générée.

```javascript
import * as questionCache from "./lib/questionCache.js";

await questionCache.cacheQuestion(
	123, // ID de la note
	"Quelle est la capitale ?", // Question générée
	"gpt-oss", // Modèle utilisé
	7 * 24 * 60 * 60 * 1000 // TTL optionnel (7 jours)
);
```

### `getCachedQuestion(noteId)`

Récupère une question en cache (retourne `null` si expirée ou inexistante).

```javascript
const cached = await questionCache.getCachedQuestion(123);

if (cached) {
	console.log(cached.question); // "Quelle est la capitale ?"
	console.log(cached.model); // "gpt-oss"
	console.log(cached.generatedAt); // "2025-12-14T10:30:00.000Z"
}
```

### `invalidateCache(noteId)`

Invalide le cache pour une note spécifique.

```javascript
const invalidated = await questionCache.invalidateCache(123);
// true si le cache a été supprimé, false si aucun cache n'existait
```

### `cleanExpiredCache()`

Nettoie toutes les entrées de cache expirées.

```javascript
const removedCount = await questionCache.cleanExpiredCache();
console.log(`${removedCount} questions expirées supprimées`);
```

### `getCacheStats()`

Obtient les statistiques du cache.

```javascript
const stats = await questionCache.getCacheStats();
console.log(stats);
// {
//   totalEntries: 10,
//   validEntries: 8,
//   expiredEntries: 2,
//   ttlDays: 7
// }
```

## 🌐 Endpoints API

### `GET /generate-question/:id`

Génère une question pour une note (utilise le cache si disponible).

**Réponse :**

```json
{
	"question": "Quelle est la capitale de la France ?",
	"model": "gpt-oss",
	"cached": true,
	"generatedAt": "2025-12-14T10:30:00.000Z"
}
```

### `DELETE /question-cache/:id`

Invalide le cache pour une note spécifique.

```bash
curl -X DELETE http://localhost:3456/api/question-cache/123
```

**Réponse :**

```json
{
	"message": "Cache invalidé pour note 123"
}
```

### `POST /question-cache/clean`

Nettoie toutes les entrées expirées.

```bash
curl -X POST http://localhost:3456/api/question-cache/clean
```

**Réponse :**

```json
{
	"message": "3 entrée(s) de cache expirée(s) supprimée(s)",
	"removedCount": 3
}
```

### `GET /question-cache/stats`

Obtient les statistiques du cache.

```bash
curl http://localhost:3456/api/question-cache/stats
```

**Réponse :**

```json
{
	"totalEntries": 15,
	"validEntries": 12,
	"expiredEntries": 3,
	"ttlDays": 7
}
```

## 🔄 Invalidation automatique

Le cache est automatiquement invalidé dans les cas suivants :

### Modification d'une note

Lorsque le **titre** ou la **description** d'une note est modifié via `PUT /notes/:id`, le cache est automatiquement invalidé car la question pourrait être différente.

```javascript
// Dans routeHandlers.js
if (title !== undefined || description !== undefined) {
	await questionCache.invalidateCache(id);
}
```

### Suppression d'une note

Lorsqu'une note est supprimée via `DELETE /notes/:id`, son cache est également supprimé.

```javascript
// Dans routeHandlers.js
await questionCache.invalidateCache(id);
```

### Expiration

Les questions en cache expirent automatiquement après le TTL configuré. Lors de la récupération via `getCachedQuestion()`, les entrées expirées sont automatiquement supprimées.

## 🧪 Tests

Les tests unitaires couvrent tous les cas d'usage :

```bash
cd backend
pnpm test questionCache
```

**Tests inclus :**

- Mise en cache et récupération
- Expiration du cache
- Invalidation manuelle
- Nettoyage des entrées expirées
- Statistiques du cache
- Workflow complet d'intégration

## 📊 Logs

Le système de cache produit des logs détaillés :

```
⚙️ Configuration du cache de questions: TTL = 7 jours
✅ Question mise en cache pour note 123 (expire: 2025-12-21T10:30:00.000Z)
🎯 Question trouvée en cache pour note 123 (modèle: gpt-oss)
🗑️ Cache invalidé pour note 123
⏰ Question en cache expirée pour note 456
```

## 🚀 Avantages

1. **Performance** : Réponses instantanées pour les questions en cache
2. **Économie de ressources** : Moins de sollicitation d'Ollama
3. **Fiabilité** : Cache persistant (survit aux redémarrages)
4. **Flexibilité** : TTL configurable selon les besoins
5. **Automatisation** : Gestion transparente de l'expiration et du nettoyage

## 🔮 Évolutions futures

- **Cache distribué** : Support de Redis pour les déploiements multi-instances
- **Préchargement** : Génération anticipée de questions pour les notes prioritaires
- **Stratégies d'éviction** : LRU (Least Recently Used) en cas de cache plein
- **Compression** : Compression des questions longues pour économiser l'espace
- **Métriques** : Taux de hit/miss du cache pour optimisation
