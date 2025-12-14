# 📚 Mind Stimulator - Documentation Complète

> Application d'apprentissage par cartes mémo interactives avec IA locale (Ollama)

**Dernière mise à jour** : 13 décembre 2025

---

## 📑 Table des matières

1. [🎯 Vue d'ensemble](#-vue-densemble)
2. [🚀 Démarrage rapide](#-démarrage-rapide)
3. [🏗️ Architecture](#️-architecture)
4. [🤖 Intégration IA](#-intégration-ia)
5. [⚙️ Configuration](#️-configuration)
6. [🧪 Tests](#-tests)
7. [🐛 Dépannage](#-dépannage)
8. [📝 API Reference](#-api-reference)

---

## 🎯 Vue d'ensemble

### Concept

Mind Stimulator est une application d'apprentissage qui combine :
- **Cartes mémo interactives** (flash cards)
- **IA locale** (Ollama) pour générer questions et évaluer réponses
- **Révision espacée** adaptative selon tes performances

### Objectifs du projet

1. 📝 **Créer des notes** structurées avec métadonnées
2. 🤖 **Générer des questions** via IA locale
3. ✅ **Évaluer les réponses** automatiquement
4. 📊 **Adapter la fréquence** de révision selon les résultats
5. 🎓 **Apprendre efficacement** avec un système personnalisé

### Fonctionnement

```
Note créée → IA génère question → Utilisateur répond
    ↓              ↓                    ↓
Stockage      Évaluation IA         Feedback
    ↓              ↓                    ↓
Scheduler adapte la fréquence de révision
```

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** 18+ et **pnpm**
- **Ollama** installé et en cours d'exécution

### Installation (5 minutes)

#### 1. Installer Ollama

```bash
# Sur Linux
curl -fsSL https://ollama.com/install.sh | sh

# Vérifier l'installation
ollama --version
```

#### 2. Télécharger les modèles IA

```bash
# Modèle léger (recommandé) - ~12 GB
ollama pull gpt-oss

# Modèle pour la programmation - ~5 GB
ollama pull hir0rameel/qwen-claude

# Modèle de secours - ~3 GB
ollama pull gemma3
```

#### 3. Démarrer Ollama

```bash
ollama serve
# Laisse ce terminal ouvert
```

#### 4. Installer les dépendances

```bash
# À la racine du projet
pnpm install

# Backend
cd backend
pnpm install
```

#### 5. Démarrer l'application

```bash
# Terminal 1 : Backend (depuis /backend)
pnpm start
# ➜ http://localhost:5000

# Terminal 2 : Frontend (depuis la racine)
pnpm dev
# ➜ http://localhost:5173
```

### Premier test

1. Ouvre **http://localhost:5173**
2. Clique sur **"🧪 Tester l'IA"**
3. Observe les logs dans :
   - **Console navigateur** (F12)
   - **Terminal backend**

✅ Si tu vois "Question générée avec succès en X.XXs" → Tout fonctionne !

---

## 🏗️ Architecture

### Structure des fichiers

```
minimal-earn/
├── backend/
│   ├── data/                    # Stockage JSON
│   │   ├── notes.json           # Toutes les notes
│   │   └── config.json          # Configuration
│   ├── lib/
│   │   ├── ai.js                # 🤖 Intégration Ollama
│   │   ├── ai.test.js           # Tests IA
│   │   ├── dataStore.js         # Lecture/écriture JSON
│   │   ├── dataStore.test.js    # Tests dataStore
│   │   └── scheduler.js         # Algorithme révision espacée
│   ├── routes/
│   │   └── routeHandlers.js     # Routes API Express
│   ├── server.js                # Serveur Express
│   ├── package.json
│   └── .env.example             # Variables d'environnement
├── src/
│   ├── main.js                  # Page d'accueil (création notes)
│   ├── notes.js                 # Page gestion des notes
│   ├── toast.js                 # Système notifications
│   ├── config.js                # Configuration partagée
│   └── utils.test.js            # Tests utilitaires
├── pages/
│   ├── notes.html               # Gestion des notes
│   └── review.html              # Page révisions (à venir)
├── index.html                   # Page d'accueil
├── package.json
├── vite.config.js
└── DOCUMENTATION.md             # Ce fichier
```

### Technologies

**Frontend :**
- Vite (build tool)
- TailwindCSS 4 (styling)
- Flowbite (composants UI)
- JavaScript vanilla (pas de framework)

**Backend :**
- Node.js + Express
- Ollama SDK officiel
- File-based storage (JSON)

**IA :**
- Ollama (serveur local)
- Modèles : gpt-oss, hir0rameel/qwen-claude, gemma3

**Tests :**
- Vitest (tests unitaires)

---

## 🤖 Intégration IA

### Modèles disponibles

| Modèle | Taille | Usage | Temps CPU | Temps GPU |
|--------|--------|-------|-----------|-----------|
| **gpt-oss** | 20.9B | Léger général | 60-120s | 10-20s |
| **hir0rameel/qwen-claude** | 8.2B | Code/prog | 30-60s | 5-10s |
| **gemma3** | 4.3B | Secours | 15-30s | 3-5s |

### Sélection automatique du modèle

Le système choisit le modèle selon le contenu :

```javascript
// Si aiTags contient "hir0rameel/qwen-claude" → modèle code
// Si description contient mots-clés code → modèle code
// Sinon → modèle léger (gpt-oss)
```

**Mots-clés code détectés :**
`function`, `variable`, `class`, `method`, `javascript`, `python`, `const`, `let`, `return`, `import`, etc.

### Fonctions IA (`backend/lib/ai.js`)

#### 1. `generateQuestion(note)`

Génère une question à partir d'une note.

```javascript
const question = await generateQuestion({
    title: "JavaScript Functions",
    description: "Les fonctions retournent 'undefined' par défaut",
    aiTags: ["hir0rameel/qwen-claude"]
});
// → "Quelle est la valeur de retour par défaut d'une fonction JavaScript ?"
```

**Caractéristiques :**
- ✅ Timeout désactivé par défaut (configurable)
- ✅ Fallback automatique vers `gpt-oss`
- ✅ Question par défaut en cas d'échec
- ✅ Logs de performance

#### 2. `evaluateAnswer(question, userAnswer, context)`

Évalue la réponse de l'utilisateur.

```javascript
const result = await evaluateAnswer(
    "Quelle est la valeur de retour par défaut ?",
    "undefined",
    "Les fonctions retournent 'undefined' par défaut"
);
// → { isCorrect: true, feedback: "CORRECT ! Bien joué..." }
```

#### 3. `generateHint(note)`

Génère un indice pour aider l'utilisateur.

```javascript
const hint = await generateHint(note);
// → "Pensez à ce qui se passe sans instruction return..."
```

### Gestion des timeouts

**Par défaut : Pas de timeout** (recommandé pour Ollama local)

Pour configurer un timeout :

```bash
# backend/.env
OLLAMA_TIMEOUT=120000  # 2 minutes
```

Valeurs suggérées :
- `0` : Pas de timeout (recommandé local)
- `120000` : 2 minutes (sécurité)
- `300000` : 5 minutes (très gros modèles)

### Gestion des erreurs

Le système implémente une stratégie robuste :

1. **Tentative avec modèle principal**
2. Si échec (hors timeout) → **Fallback vers gpt-oss**
3. Si tout échoue → **Question par défaut** (`buildPrompt`)

Logs détaillés à chaque étape :
```
🤖 Génération de question avec le modèle: hir0rameel/qwen-claude
✅ Question générée avec succès en 45.23s
```

---

## ⚙️ Configuration

### Variables d'environnement

Créer `backend/.env` (optionnel) :

```bash
# Timeout Ollama (0 = pas de timeout)
OLLAMA_TIMEOUT=0

# Port du serveur backend
PORT=5000
```

### Configuration app (`backend/data/config.json`)

```json
{
  "interrogationsEnabled": true
}
```

Modifiable via :
- Toggle dans l'interface (index.html)
- API : `POST /api/config`

### Intensité de révision

Lors de la création d'une note :

| Intensité | Intervalle initial | Usage |
|-----------|-------------------|-------|
| **chill** | 7 jours | Sujets maîtrisés |
| **moderate** | 1 jour | Usage par défaut |
| **intensive** | 6 heures | Apprentissage actif |

### Algorithme de révision espacée

**Adaptation selon résultats :**

```
Réponse correcte   (✅) : intervalle × 1.5  (max: 1 an)
Réponse incorrecte (❌) : intervalle × 0.6  (min: 50% du base)
```

**Exemple (mode Moderate) :**

```
J0    : création → +1 jour
J1    : révision ✅ → 1 × 1.5 = 1.5 jour
J2.5  : révision ✅ → 1.5 × 1.5 = 2.25 jours
J4.75 : révision ❌ → 2.25 × 0.6 = 1.35 jour
J6.1  : révision ✅ → 1.35 × 1.5 = 2 jours
```

➡️ Les notes maîtrisées s'espacent naturellement.  
➡️ Les difficultés reviennent plus fréquemment.

---

## 🧪 Tests

### Lancer les tests

```bash
# Tous les tests
pnpm test --run

# Tests backend uniquement
cd backend && pnpm test --run

# Tests avec watch mode
pnpm test

# Tests avec couverture
pnpm test -- --coverage
```

### Tests disponibles

#### 1. Tests IA (`backend/lib/ai.test.js`)

✅ 9 tests - Temps: 6ms

**Tests `pickModel()` :**
- Sélection modèle code si tag présent
- Détection mots-clés programmation
- Modèle léger par défaut
- Gestion notes sans titre
- Insensibilité à la casse

**Tests `buildPrompt()` :**
- Inclusion du titre
- Fonctionnement sans titre
- Chaîne non vide garantie
- Instructions examinateur présentes

#### 2. Tests DataStore (`backend/lib/dataStore.test.js`)

Tests de validation des types et format JSON.

#### 3. Tests Utilitaires (`src/utils.test.js`)

✅ 7 tests - Temps: 40ms

**Tests `escapeHtml()` :**
- Échappement caractères HTML dangereux
- Protection XSS
- Gestion guillemets

**Tests `formatDate()` :**
- Formatage dates ISO
- Gestion valeurs nulles
- Dates invalides

### Test manuel de l'API

```bash
# Script de test intégré
./test-api.sh

# Ou manuellement :
curl http://localhost:5000/api/config
curl http://localhost:5000/api/notes
```

---

## 🐛 Dépannage

### Problème : "Ollama timeout"

**Cause :** Modèle lourd prend plus de temps que prévu (normal sur CPU)

**Solution :**
1. Le timeout est désactivé par défaut depuis la dernière mise à jour
2. Si tu vois encore l'erreur, vérifie que le serveur a bien redémarré
3. Observe les logs : "✅ Question générée avec succès en X.XXs"

**Si vraiment nécessaire :**
```bash
# backend/.env
OLLAMA_TIMEOUT=0  # Désactive le timeout
```

### Problème : "Failed to generate question"

**Vérifications :**

1. **Ollama tourne-t-il ?**
```bash
curl http://localhost:11434/api/tags
# Doit retourner la liste des modèles
```

2. **Les modèles sont-ils téléchargés ?**
```bash
ollama list
# Doit afficher gpt-oss, hir0rameel/qwen-claude, gemma3
```

3. **Logs du serveur backend**
Cherche les lignes avec 🤖, ✅, ❌ pour identifier l'étape qui échoue

### Problème : Le serveur backend ne démarre pas

```bash
# Vérifier le port
lsof -i :5000

# Tuer le processus si nécessaire
kill -9 <PID>

# Redémarrer
cd backend && pnpm start
```

### Problème : Les notes ne s'affichent pas

1. Vérifier que `backend/data/notes.json` existe
2. Vérifier les logs de la console navigateur (F12)
3. Tester l'API :
```bash
curl http://localhost:5000/api/notes
```

### Problème : Tests échouent

```bash
# Réinstaller les dépendances
rm -rf node_modules
pnpm install

# Backend
cd backend
rm -rf node_modules
pnpm install

# Relancer les tests
pnpm test --run
```

### Logs détaillés

**Backend** : Console où tu as lancé `pnpm start`
- 🤖 Appels IA
- ✅ Succès
- ❌ Erreurs avec stack traces
- 📝 Requêtes API

**Frontend** : Console navigateur (F12 → Console)
- 🚀 Démarrages
- 📤 Requêtes HTTP
- 💡 Informations
- ❌ Erreurs détaillées

---

## 📝 API Reference

### Base URL

```
http://localhost:5000/api
```

### Endpoints

#### Notes

**Créer une note**
```http
POST /api/generate-note
Content-Type: application/json

{
  "title": "JavaScript Basics",
  "description": "Les fonctions retournent undefined...",
  "aiTags": ["hir0rameel/qwen-claude"],
  "intensity": "moderate"
}

Response: { message: "Note saved successfully", note: {...} }
```

**Lister toutes les notes**
```http
GET /api/notes

Response: { notes: [{...}, {...}] }
```

**Supprimer une note**
```http
DELETE /api/notes/:id

Response: { message: "Note deleted successfully" }
```

**Modifier une note**
```http
PUT /api/notes/:id
Content-Type: application/json

{
  "title": "Nouveau titre",
  "description": "Nouvelle description",
  "intensity": "intensive"
}

Response: { message: "Note updated successfully", note: {...} }
```

#### IA

**Générer une question**
```http
GET /api/generate-question/:id

Response: {
  question: "Quelle est la valeur par défaut...",
  model: "hir0rameel/qwen-claude"
}
```

**Évaluer une réponse**
```http
POST /api/evaluate-answer
Content-Type: application/json

{
  "noteId": 1234,
  "question": "Quelle est...",
  "userAnswer": "undefined"
}

Response: {
  isCorrect: true,
  feedback: "CORRECT ! Bien joué..."
}
```

**Générer un indice**
```http
GET /api/hint/:id

Response: { hint: "Pensez à ce qui se passe sans return..." }
```

#### Configuration

**Lire la config**
```http
GET /api/config

Response: { interrogationsEnabled: true }
```

**Mettre à jour la config**
```http
POST /api/config
Content-Type: application/json

{ "interrogationsEnabled": false }

Response: { interrogationsEnabled: false }
```

#### Révisions

**Notes à réviser**
```http
GET /api/due-notes

Response: {
  enabled: true,
  due: [{...}, {...}]
}
```

**Enregistrer une révision**
```http
POST /api/review-note
Content-Type: application/json

{
  "id": 1234,
  "correct": true
}

Response: {
  message: "Review recorded",
  note: {...}
}
```

---

## 📊 Structure d'une note

```json
{
  "id": 1234567890,
  "title": "Titre de la note",
  "description": "Contenu détaillé...",
  "aiTags": ["hir0rameel/qwen-claude"],
  "intensity": "moderate",
  "createdAt": "2025-12-13T10:30:00.000Z",
  "reviewCount": 5,
  "lastReviewed": "2025-12-13T11:00:00.000Z",
  "lastInterval": 86400000,
  "nextReviewAt": "2025-12-14T11:00:00.000Z"
}
```

### Champs

- `id` : Timestamp de création (unique)
- `title` : Titre court (optionnel)
- `description` : Contenu de la note (requis)
- `aiTags` : Modèles IA associés
- `intensity` : "chill", "moderate", ou "intensive"
- `createdAt` : Date de création (ISO 8601)
- `reviewCount` : Nombre de révisions effectuées
- `lastReviewed` : Dernière révision (ISO 8601)
- `lastInterval` : Dernier intervalle en ms
- `nextReviewAt` : Prochaine révision (ISO 8601)

---

## 🎯 Workflow complet

### 1. Création d'une note

```
Utilisateur remplit formulaire (index.html)
    ↓
main.js envoie POST /api/generate-note
    ↓
routeHandlers.js crée note avec metadata
    ↓
dataStore.js sauvegarde dans notes.json
    ↓
scheduler.js calcule nextReviewAt selon intensity
```

### 2. Génération de question

```
Frontend demande GET /api/generate-question/:id
    ↓
routeHandlers.js charge la note
    ↓
ai.js sélectionne le modèle approprié (pickModel)
    ↓
ai.js appelle Ollama avec prompt formaté
    ↓
Ollama génère la question (60-120s sur CPU)
    ↓
Retour de la question au frontend
```

### 3. Évaluation de réponse

```
Utilisateur soumet réponse
    ↓
Frontend POST /api/evaluate-answer
    ↓
ai.js appelle Ollama pour évaluation
    ↓
Ollama analyse et détermine correct/incorrect
    ↓
Retour feedback au frontend
    ↓
Frontend POST /api/review-note (si validation)
    ↓
scheduler.js recalcule nextReviewAt selon résultat
    ↓
dataStore.js met à jour notes.json
```

---

## 🚀 Prochaines étapes

### Fonctionnalités à implémenter

- [ ] Page de révision complète (`pages/review.html`)
- [ ] Système de notifications toast automatiques
- [ ] Page de statistiques détaillées
- [ ] Export/import des notes (Markdown, JSON)
- [ ] Mode hors-ligne (Service Worker)
- [ ] Support d'Electron (notifications desktop)
- [ ] Système de tags personnalisés
- [ ] Recherche dans les notes
- [ ] Graphiques de progression

### Optimisations possibles

- [ ] Cache des questions déjà générées
- [ ] Streaming des réponses Ollama
- [ ] Pre-génération des questions en arrière-plan
- [ ] Compression des données
- [ ] Migration vers SQLite (si beaucoup de notes)

---

## 🤝 Pour aller plus loin

### Apprendre davantage

**Ollama :**
- [Documentation officielle](https://github.com/ollama/ollama)
- [Liste des modèles](https://ollama.com/library)
- [API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

**Révision espacée :**
- [Algorithme SM-2](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm)
- [Anki](https://apps.ankiweb.net/)

**Tests :**
- [Vitest](https://vitest.dev/)
- [Testing best practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 📄 Licence

Projet personnel d'apprentissage - Usage libre

---

**Bon apprentissage ! 🎓**
