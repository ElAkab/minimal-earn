# 🤖 Intégration IA - Documentation Technique

## 🎯 Stratégie d'intégration

L'intégration IA suit une approche **modulaire, économe et stratégique** :

- ✅ Séparation stricte des rôles (génération vs évaluation)
- ✅ Priorité aux modèles légers
- ✅ Sélection intelligente selon le contenu
- ✅ Centralisé dans `backend/lib/ai.js`
- ✅ Aucun appel IA depuis le frontend

---

## 📦 Modèles utilisés

### Configuration actuelle

```javascript
const MODELS = {
	lightweight: "gemma2:2b", // Modèle léger généraliste (par défaut)
	code: "qwen2.5-coder:3b", // Modèle pour la programmation
	fallback: "gemma2:2b", // Secours en cas d'erreur
};
```

### Critères de sélection

La fonction `pickModel(note)` choisit automatiquement le modèle selon :

1. **Tags IA** : Si `claudeCode` dans `note.aiTags` → modèle code
2. **Mots-clés** : Si détection de termes de programmation → modèle code
3. **Par défaut** : Modèle léger généraliste

**Mots-clés détectés :**
`function`, `variable`, `class`, `method`, `code`, `programming`, `javascript`, `python`, `java`, `const`, `let`, `var`, `return`, `import`, `export`

---

## 🔧 Fonctions disponibles

### 1. **Génération de question** ✅

**Fichier :** [ai.js](backend/lib/ai.js#L52-L75)

```javascript
await generateQuestion(note);
```

**Comportement :**

- Sélectionne automatiquement le modèle approprié
- Génère une question courte et précise
- Prompt optimisé pour éviter les bavardages
- Fallback sur `buildPrompt()` en cas d'erreur

**API Route :**

```http
GET /api/generate-question/:id
```

**Réponse :**

```json
{
	"question": "Que signifie le terme 'Pointeur' en programmation ?",
	"model": "qwen2.5-coder:3b"
}
```

---

### 2. **Évaluation de réponse** ✅

**Fichier :** [ai.js](backend/lib/ai.js#L77-L114)

```javascript
await evaluateAnswer(question, userAnswer, correctContext);
```

**Comportement :**

- Utilise toujours le modèle léger (tâche simple)
- Prompt strict : `CORRECT` ou `INCORRECT` + explication courte
- Maximum 2 lignes de réponse
- Fallback sur évaluation basique en cas d'erreur

**API Route :**

```http
POST /api/evaluate-answer
Content-Type: application/json

{
  "noteId": 1234,
  "question": "Question posée",
  "userAnswer": "Réponse de l'utilisateur"
}
```

**Réponse :**

```json
{
	"isCorrect": true,
	"feedback": "CORRECT\nVotre réponse démontre une bonne compréhension du concept."
}
```

---

### 3. **Génération d'indice** ✅

**Fichier :** [ai.js](backend/lib/ai.js#L116-L136)

```javascript
await generateHint(note);
```

**Comportement :**

- Utilise le modèle léger
- Génère un indice court (1 phrase)
- Fallback sur message générique en cas d'erreur

**API Route :**

```http
GET /api/hint/:id
```

**Réponse :**

```json
{
	"hint": "Pensez à la manière dont JavaScript gère l'absence de valeur de retour."
}
```

---

## 🔒 Sécurité & Performance

### Timeout

Tous les appels Ollama ont un **timeout de 30 secondes** :

```javascript
const OLLAMA_TIMEOUT = 30000; // 30 secondes
```

### Gestion d'erreur

Chaque fonction IA a un **fallback** en cas d'erreur :

| Fonction              | Fallback                                              |
| --------------------- | ----------------------------------------------------- |
| `generateQuestion`    | Retourne `buildPrompt(note)` (prompt template)       |
| `evaluateAnswer`      | Évaluation basique (longueur > 10 caractères)         |
| `generateHint`        | Message générique "Relisez le contexte"               |

### Centralisation

**✅ Tous les appels Ollama** sont centralisés dans `backend/lib/ai.js`

**❌ Aucun appel** depuis le frontend (sécurité + performance)

---

## 📊 Flux d'utilisation

### 1. **Génération de question**

```
Note créée (frontend)
     ↓
POST /api/generate-note
     ↓
Stockage dans notes.json
     ↓
Scheduler calcule nextReviewAt
     ↓
Frontend charge les notes dues
     ↓
GET /api/generate-question/:id  ← Appel IA ici
     ↓
Affichage dans review.html
```

### 2. **Évaluation de réponse**

```
Utilisateur répond
     ↓
POST /api/evaluate-answer  ← Appel IA ici
     ↓
{ isCorrect, feedback }
     ↓
POST /api/review-note (enregistre résultat)
     ↓
Scheduler adapte nextReviewAt
     ↓
Affichage du feedback
```

### 3. **Demande d'indice**

```
Clic sur "Indice"
     ↓
GET /api/hint/:id  ← Appel IA ici
     ↓
Affichage en toast + contexte
```

---

## 🧪 Comment tester

### Prérequis

1. **Ollama installé et en cours d'exécution** :

```bash
# Vérifier que Ollama tourne
curl http://localhost:11434/api/version

# Si pas installé :
# curl -fsSL https://ollama.com/install.sh | sh
```

2. **Télécharger les modèles** :

```bash
# Modèle léger généraliste
ollama pull gemma2:2b

# Modèle code (optionnel)
ollama pull qwen2.5-coder:3b
```

### Test complet

1. **Créer une note** :

```bash
curl -X POST http://localhost:5000/api/generate-note \
  -H "Content-Type: application/json" \
  -d '{
    "aiTags": ["claudeCode"],
    "title": "JavaScript",
    "description": "Les fonctions renvoient undefined par défaut",
    "intensity": "moderate"
  }'
```

2. **Générer une question** :

```bash
curl http://localhost:5000/api/generate-question/1234
```

3. **Évaluer une réponse** :

```bash
curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": 1234,
    "question": "Que renvoient les fonctions JavaScript par défaut ?",
    "userAnswer": "undefined"
  }'
```

4. **Demander un indice** :

```bash
curl http://localhost:5000/api/hint/1234
```

---

## 🎨 Interface utilisateur

### Modifications dans review.js

1. **Chargement de la question** ([review.js](src/review.js#L95-L112))

```javascript
// Ancien : récupère un prompt template
const response = await fetch(`${API_URL}/prompt/${currentNote.id}`);

// Nouveau : génère une vraie question IA
const response = await fetch(
	`${API_URL}/generate-question/${currentNote.id}`
);
```

2. **Évaluation de la réponse** ([review.js](src/review.js#L165-L202))

```javascript
// Ancien : simulation basique
const isCorrect = answer.length > 10;

// Nouveau : évaluation IA complète
const response = await fetch(`${API_URL}/evaluate-answer`, {
	method: "POST",
	body: JSON.stringify({ noteId, question, userAnswer }),
});
const evaluation = await response.json();
```

3. **Génération d'indice** ([review.js](src/review.js#L215-L227))

```javascript
// Ancien : message statique
showToast("Indice : Relisez le contexte", "info");

// Nouveau : indice généré par IA
const response = await fetch(`${API_URL}/hint/${currentNote.id}`);
const data = await response.json();
showToast(`💡 Indice : ${data.hint}`, "info");
```

---

## ⚡ Optimisations futures

### Court terme

- [ ] Mise en cache des questions générées (éviter regénération)
- [ ] Retry automatique en cas d'échec Ollama
- [ ] Métriques de performance (temps de réponse IA)

### Moyen terme

- [ ] Support de modèles multiples par catégorie
- [ ] Ajustement automatique du modèle selon performance
- [ ] Système de prompt templating plus avancé

### Long terme

- [ ] Fine-tuning personnalisé selon style d'apprentissage
- [ ] Analyse de progression pour ajuster difficulté
- [ ] Génération de statistiques d'efficacité IA

---

## 📝 Logs et debugging

### Activer les logs détaillés

Les logs Ollama sont sobres par défaut. Pour debug :

```javascript
// Dans ai.js, ajouter après fetchOllama()
console.log("IA Request:", { model, promptLength: prompt.length });
console.log("IA Response:", { responseLength: response.length });
```

### Logs actuels

```javascript
console.error("Error generating question:", error);
console.error("Error evaluating answer:", error);
console.error("Error generating hint:", error);
```

---

## 🔧 Configuration personnalisée

### Changer les modèles

Éditer [ai.js](backend/lib/ai.js#L5-L12) :

```javascript
const MODELS = {
	lightweight: "gemma2:2b", // Remplacer par ton modèle préféré
	code: "qwen2.5-coder:3b",
	fallback: "gemma2:2b",
};
```

### Ajuster le timeout

```javascript
const OLLAMA_TIMEOUT = 30000; // Augmenter si modèles lents
```

### Personnaliser les prompts

Les prompts sont dans les fonctions respectives :

- `generateQuestion()` - [ligne 58-66](backend/lib/ai.js#L58-L66)
- `evaluateAnswer()` - [ligne 89-97](backend/lib/ai.js#L89-L97)
- `generateHint()` - [ligne 124-129](backend/lib/ai.js#L124-L129)

---

## ✅ Checklist de production

Avant de passer en "production" :

- [x] Tous les appels IA ont un timeout
- [x] Tous les appels IA ont un fallback
- [x] Gestion d'erreur robuste
- [x] Logs d'erreur (pas de dump de prompt complet)
- [x] Aucun appel IA depuis le frontend
- [x] Sélection intelligente de modèle
- [ ] Tests automatisés pour chaque fonction IA
- [ ] Monitoring du temps de réponse Ollama
- [ ] Documentation utilisateur final

---

## 🎓 Apprentissage

### Concepts mis en pratique

- **Architecture modulaire** : Séparation claire des responsabilités
- **Gestion d'erreur** : Fallbacks gracieux
- **Performance** : Timeout, choix de modèles légers
- **Sécurité** : Validation, pas d'appels directs depuis frontend
- **Extensibilité** : Ajout facile de nouveaux modèles

### Points d'amélioration possibles

1. **Tests unitaires** pour les fonctions IA
2. **Mise en cache** des questions générées
3. **Métriques** de performance et qualité
4. **A/B testing** de différents prompts

---

**Implémentation terminée ! 🎉**

Le système est maintenant prêt à utiliser une vraie IA locale pour générer des questions, évaluer les réponses et fournir des indices intelligents.
