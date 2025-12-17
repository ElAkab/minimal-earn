# Guide de test GUI

Ce document explique comment tester l'interface graphique de l'application de cartes mémo.

## 🎯 Prérequis

- Serveurs démarrés :
  - Backend Express : `http://localhost:3000`
  - Frontend Vite : `http://127.0.0.1:5173/`

## 🧪 Workflow de test

### 1. Créer des notes de test

**Via cURL :**

```bash
curl http://localhost:3000/api/create-test-notes
```

Cette commande crée automatiquement des notes avec des dates de révision passées, ce qui permet de tester immédiatement le système de révision.

**Via l'interface :**

- Aller sur [http://127.0.0.1:5173/notes](http://127.0.0.1:5173/notes)
- Utiliser le formulaire pour créer des notes manuellement

### 2. Tester l'auto-review

**Comportement attendu :**

- Une flashcard apparaît automatiquement **toutes les 15 secondes**
- La carte affiche une note dont `nextReviewDate <= now` et `intensity = 2`
- Le timer se met en pause quand une carte est affichée
- Le timer reprend quand la carte est fermée

**Comment tester :**

1. Aller sur [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
2. Observer la console JavaScript : `🎯 [AutoReview] Affichage d'une carte aléatoire...`
3. Vérifier qu'une carte apparaît automatiquement
4. Fermer la carte → attendre 15s → vérifier qu'une nouvelle carte apparaît

**Si aucune carte n'apparaît :**

- Console affiche : `ℹ️ [AutoReview] Aucune note à réviser`
- Créer des notes de test avec `/api/create-test-notes`
- Vérifier que des notes existent avec `nextReviewDate` dans le passé

### 3. Tester la suppression de notes

**Supprimer une note individuelle :**

1. Aller sur [http://127.0.0.1:5173/notes](http://127.0.0.1:5173/notes)
2. Cliquer sur le bouton **X** en haut à droite d'une carte
3. Confirmer dans la boîte de dialogue
4. La carte disparaît immédiatement de l'interface

**Via cURL :**

```bash
# Supprimer la note avec l'ID 1
curl -X DELETE http://localhost:3000/api/notes/1
```

**Réponses API :**

- `200 OK` : `{"message": "Note supprimée avec succès"}`
- `404 Not Found` : `{"error": "Note introuvable"}`

### 4. Réinitialiser les IDs de la base

**Quand utiliser :**

- Après avoir supprimé toutes les notes
- Pour repartir avec des IDs propres (1, 2, 3...)

**Comment :**

```bash
curl -X POST http://localhost:3000/api/reset-ids
```

**Effet :**

- Supprime toutes les notes
- Réinitialise le compteur auto-increment à 1
- La prochaine note créée aura l'ID 1

### 5. Tester le scheduler

**Vérifier les notes à réviser :**

```bash
# Notes de niveau "Sérieux" (intensity=2)
curl "http://localhost:3000/api/notes/review?intensity=2"

# Notes de niveau "Chill" (intensity=1)
curl "http://localhost:3000/api/notes/review?intensity=1"

# Notes de niveau "Nécessaire" (intensity=3)
curl "http://localhost:3000/api/notes/review?intensity=3"
```

**Réponse JSON :**

```json
{
	"count": 2,
	"notes": [
		{
			"id": 1,
			"title": "Test note",
			"content": "Contenu de la note",
			"intensity": 2,
			"color": "amber",
			"nextReviewDate": "2024-12-15T10:00:00.000Z",
			"easeFactor": 2.5,
			"currentInterval": 1
		}
	]
}
```

## 📊 Routes API disponibles

| Méthode  | Endpoint                        | Description                           |
| -------- | ------------------------------- | ------------------------------------- |
| `GET`    | `/api/notes`                    | Récupère toutes les notes             |
| `GET`    | `/api/notes/review?intensity=X` | Notes à réviser (X = 1, 2, 3)         |
| `POST`   | `/api/notes`                    | Crée une nouvelle note                |
| `DELETE` | `/api/notes/:id`                | Supprime une note spécifique          |
| `DELETE` | `/api/notes`                    | Supprime toutes les notes             |
| `POST`   | `/api/reset-ids`                | Supprime tout et réinitialise les IDs |
| `GET`    | `/api/create-test-notes`        | Crée des notes de test                |

## 🐛 Debugging

**Voir les logs du scheduler :**

```javascript
// Dans la console du navigateur (F12)
// Les logs montrent :
// - 🎯 Affichage de cartes
// - ⏸️ Pause de l'intervalle
// - 🔄 Relance de l'intervalle
// - ℹ️ Aucune note disponible
```

**Vérifier l'état de la DB :**

```bash
# Afficher toutes les notes
curl http://localhost:3000/api/notes

# Compter les notes à réviser
curl "http://localhost:3000/api/notes/review?intensity=2" | jq '.count'
```

**Console backend (terminal Express) :**

```
📚 2 notes à réviser (intensité 2)
✅ Note créée avec l'ID: 4
🗑️ Note 1 supprimée
```

## 💡 Conseils de test

1. **Toujours commencer par créer des notes de test** avec `/api/create-test-notes`
2. **Ouvrir la console JavaScript (F12)** pour voir les logs en temps réel
3. **Tester l'auto-review** en laissant la page ouverte au moins 30 secondes
4. **Vérifier la persistance** en rafraîchissant la page après une suppression
5. **Tester les edge cases** : aucune note, toutes les notes déjà révisées, etc.

## 🎨 Interface pages

- **Index** : [http://127.0.0.1:5173/](http://127.0.0.1:5173/) - Auto-review avec flashcards
- **Notes** : [http://127.0.0.1:5173/notes](http://127.0.0.1:5173/notes) - Liste et gestion des notes

## 🔧 Commandes utiles

```bash
# Démarrer le backend (depuis /backend)
cd backend && node server.js

# Démarrer le frontend (depuis la racine)
npm run dev

# Créer 3 notes de test
curl http://localhost:3000/api/create-test-notes

# Réinitialiser complètement
curl -X POST http://localhost:3000/api/reset-ids
```
