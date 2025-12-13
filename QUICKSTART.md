# 🚀 Guide de démarrage - Mind Stimulator avec IA

## ⚡ Démarrage rapide (5 minutes)

### Étape 1 : Installer Ollama

```bash
# Sur Linux
curl -fsSL https://ollama.com/install.sh | sh

# Vérifier l'installation
ollama --version
```

### Étape 2 : Télécharger les modèles

```bash
# Modèle léger (obligatoire) - ~1.5 GB
ollama pull gemma2:2b

# Modèle code (optionnel) - ~2 GB
ollama pull qwen2.5-coder:3b
```

### Étape 3 : Démarrer le backend

```bash
cd backend
node server.js
```

Sortie attendue :

```
Server is running on http://localhost:5000
```

### Étape 4 : Démarrer le frontend

```bash
# À la racine du projet
pnpm dev
```

Sortie attendue :

```
VITE ready in 200 ms
➜  Local:   http://localhost:5173/
```

### Étape 5 : Tester !

1. Ouvre [http://localhost:5173](http://localhost:5173)
2. Clique sur **"Tester une notification"** (bouton violet)
3. Crée une note avec le formulaire
4. Va sur [Révisions](http://localhost:5173/pages/review.html)
5. Active le toggle **"Interrogations"**
6. Réponds aux questions !

---

## 🎯 Flux d'utilisation complet

### 1. Créer une note

1. Choisis le type d'IA :
   - **Programmation** (claudeCode) → Utilise `qwen2.5-coder:3b`
   - **Autre** (gemma3) → Utilise `gemma2:2b`
2. Entre un titre (optionnel)
3. Entre une description (obligatoire)
4. Choisis l'intensité :
   - **Chill** : Révision toutes les semaines
   - **Moderate** : Révision quotidienne
   - **Intensive** : Révision toutes les 6 heures
5. Clique sur **"Noter"**

### 2. Répondre aux questions

1. Va sur **Révisions**
2. Active le toggle **"Interrogations"**
3. L'IA génère une question basée sur ta note
4. Actions disponibles :
   - **Répondre** : Entre ta réponse et envoie
   - **Indice** : Demande un indice à l'IA
   - **Je ne sais pas** : Marque comme incorrect
   - **Contexte** : Affiche la note originale
   - **Fermer** : Skip cette révision
5. L'IA évalue ta réponse et donne un feedback
6. Le scheduler ajuste automatiquement la fréquence

### 3. Comprendre le scheduling

#### Si réponse correcte ✅

- Intervalle multiplié par **1.5**
- Maximum : 365 jours
- Note réapparaît moins souvent

#### Si réponse incorrecte ❌

- Intervalle réduit à **60%** du précédent
- Minimum : 50% de l'intervalle de base
- Note réapparaît plus souvent

**Exemple (intensité "moderate") :**

```
Réponse 1 : ✅ → Prochaine dans 1.5 jours
Réponse 2 : ✅ → Prochaine dans 2.25 jours
Réponse 3 : ❌ → Prochaine dans 1.35 jours
Réponse 4 : ✅ → Prochaine dans 2 jours
```

---

## 🧪 Tests des fonctionnalités IA

### Test 1 : Génération de question

```bash
# Crée d'abord une note
curl -X POST http://localhost:5000/api/generate-note \
  -H "Content-Type: application/json" \
  -d '{
    "aiTags": ["claudeCode"],
    "title": "JavaScript - Return",
    "description": "Les fonctions JavaScript renvoient undefined par défaut si aucun return explicite.",
    "intensity": "moderate"
  }'

# Génère une question (remplace 1234 par l'ID de ta note)
curl http://localhost:5000/api/generate-question/1234
```

Réponse attendue :

```json
{
	"question": "Que renvoie une fonction JavaScript si elle n'a pas de return ?",
	"model": "qwen2.5-coder:3b"
}
```

### Test 2 : Évaluation de réponse

```bash
curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": 1234,
    "question": "Que renvoie une fonction JavaScript par défaut ?",
    "userAnswer": "Elle renvoie undefined"
  }'
```

Réponse attendue :

```json
{
	"isCorrect": true,
	"feedback": "CORRECT\nExcellente réponse ! Vous avez bien identifié le comportement par défaut."
}
```

### Test 3 : Génération d'indice

```bash
curl http://localhost:5000/api/hint/1234
```

Réponse attendue :

```json
{
	"hint": "Pensez à ce qui se passe quand une fonction ne contient pas le mot-clé 'return'."
}
```

---

## 🐛 Dépannage

### Problème : "Connection refused" à Ollama

**Cause :** Ollama n'est pas démarré

**Solution :**

```bash
# Démarrer Ollama
ollama serve

# Dans un autre terminal, vérifier
curl http://localhost:11434/api/version
```

### Problème : "Model not found"

**Cause :** Le modèle n'est pas téléchargé

**Solution :**

```bash
# Lister les modèles installés
ollama list

# Télécharger le modèle manquant
ollama pull gemma2:2b
ollama pull qwen2.5-coder:3b
```

### Problème : Timeout lors de la génération

**Cause :** Le modèle est lent ou surchargé

**Solutions possibles :**

1. Augmenter le timeout dans [ai.js](backend/lib/ai.js#L6) :

```javascript
const OLLAMA_TIMEOUT = 60000; // 60 secondes au lieu de 30
```

2. Utiliser un modèle plus léger :

```javascript
const MODELS = {
	lightweight: "gemma2:2b",
	code: "gemma2:2b", // Au lieu de qwen2.5-coder:3b
};
```

### Problème : Notes dues n'apparaissent pas

**Vérifications :**

1. Toggle "Interrogations" activé ?
2. Notes avec `nextReviewAt` dans le passé ?
3. Backend en cours d'exécution ?

**Vérifier les notes dues :**

```bash
curl http://localhost:5000/api/due-notes
```

### Problème : Évaluation toujours incorrecte

**Cause possible :** Prompt trop strict ou réponse mal formatée

**Solution temporaire :**
L'évaluation utilise un fallback basique (longueur > 10 caractères) en cas d'erreur IA.

**Debug :**

```bash
# Consulter les logs du backend
# Les erreurs IA apparaissent dans la console
```

---

## 📊 Fichiers de données

### notes.json

Stocke toutes tes notes :

```json
[
	{
		"id": 1234567890,
		"aiTags": ["claudeCode"],
		"title": "JavaScript",
		"description": "Les fonctions renvoient undefined par défaut",
		"intensity": "moderate",
		"createdAt": "2025-12-13T10:00:00.000Z",
		"reviewCount": 3,
		"lastReviewed": "2025-12-13T12:00:00.000Z",
		"lastInterval": 129600000,
		"nextReviewAt": "2025-12-14T18:00:00.000Z"
	}
]
```

### config.json

Stocke la configuration :

```json
{
	"interrogationsEnabled": true
}
```

---

## 🎨 Interface utilisateur

### Page principale (index.html)

- Formulaire de création de notes
- Prévisualisation de carte
- **Nouveau :** Bouton de test des notifications

### Page Révisions (pages/review.html)

- Affichage des questions générées par IA
- Champ de réponse
- Boutons d'action (Indice, Je ne sais pas, Contexte)
- Feedback avec évaluation IA
- Statistiques en temps réel

### Page Notes (pages/notes.html)

- Liste de toutes les notes
- Édition/Suppression _(à venir)_
- Filtrage par intensité _(à venir)_

---

## 🔒 Sécurité

### Bonnes pratiques appliquées

✅ **Tous les appels IA depuis le backend uniquement**
✅ **Timeout sur toutes les requêtes Ollama**
✅ **Fallbacks en cas d'erreur IA**
✅ **Validation des entrées utilisateur**
✅ **Escape HTML dans les feedbacks**
✅ **Pas de dump de prompts complets en logs**

### Données locales

- ✅ Aucune donnée envoyée à des services externes
- ✅ Tout reste sur ta machine (Ollama local)
- ✅ Fichiers JSON simples et lisibles

---

## 📈 Prochaines étapes

### Fonctionnalités suggérées

1. **Page de statistiques**

   - Taux de réussite global
   - Notes les plus difficiles
   - Progression dans le temps

2. **Gestion avancée des notes**

   - Liste complète avec filtres
   - Édition en place
   - Import/Export

3. **Tests automatisés**

   - Tests unitaires pour les fonctions IA
   - Tests d'intégration des routes API
   - Tests end-to-end

4. **Optimisations**
   - Mise en cache des questions générées
   - Retry automatique en cas d'échec
   - Métriques de performance

---

## 📚 Documentation complète

- [BILAN.md](BILAN.md) - État actuel du projet
- [IA_INTEGRATION.md](IA_INTEGRATION.md) - Documentation technique IA
- [AGENTS.md](AGENTS.md) - Objectifs et règles du projet
- [README.md](README.md) - Architecture générale

---

## 💡 Conseils d'utilisation

### Pour un apprentissage efficace

1. **Commence avec "moderate"** pour tester le système
2. **Active "intensive"** pour les concepts difficiles
3. **Utilise "chill"** pour les rappels occasionnels
4. **Demande des indices** plutôt que de marquer "Je ne sais pas"
5. **Consulte le contexte** avant de répondre si hésitation

### Pour économiser les ressources

1. **Utilise le modèle léger** par défaut (gemma2:2b)
2. **Réserve le modèle code** aux vraies notes de programmation
3. **Ferme Ollama** quand tu n'utilises pas l'app
4. **Nettoie les notes obsolètes** régulièrement

---

**Bon apprentissage ! 🎓**
