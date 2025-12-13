# 📚 Explication technique – GUI & logique

## 🎯 Concept clé : le “Toast” = Carte d’interrogation

Dans ce projet, un **toast** n’est pas une simple notification :
c’est une **carte d’interrogation interactive** qui :

- apparaît de manière "surprise",
- reste affichée jusqu’à interaction,
- contient une question générée par l’IA,
- permet de répondre, demander un indice, ou indiquer qu’on ne sait pas.

---

# 🎨 Interface utilisateur (GUI) – Logique complète

## 📝 Page 1 : `index.html` — Création de notes

### Layout

```
┌─────────────────────────────────────────────┐
│ Header (Logo + Navigation + Toggle)        │
├───────────────────┬─────────────────────────┤
│ Formulaire (50%)  │ Prévisualisation (50%)  │
│                   │                          │
│ [Prog | Autre]    │  ┌─────────────────┐    │
│ Titre: [____]     │  │ Carte exemple   │    │
│ Desc:  [____]     │  │                 │    │
│ Priorité: [v]     │  │ Question...     │    │
│ [Noter]           │  │ [Répondre]      │    │
│                   │  └─────────────────┘    │
└───────────────────┴─────────────────────────┘
```

### Workflow

- Choix du modèle IA (`claudeCode` ou `gemma3`)
- Saisie du titre + description
- Choix de l’intensité (`chill`, `moderate`, `intensive`)
- Clic sur **Noter**
- La note est envoyée au backend et sauvegardée

---

## 🗂️ Page 2 : `pages/notes.html` — Gestion des notes

### Layout

```
┌─────────────────────────────────────────────┐
│ Header (Navigation + Toggle)               │
├─────────────────────────────────────────────┤
│ Filtres: [Tous] [claudeCode] [gemma3]     │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ Note 1  │ │ Note 2  │ │ Note 3  │       │
│ │ [Edit]  │ │ [Edit]  │ │ [Edit]  │       │
│ │ [Del]   │ │ [Del]   │ │ [Del]   │       │
│ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────┘
```

### Fonctionnalités

- Affichage en grille
- Filtrage par modèle IA
- Édition via modal
- Suppression avec confirmation

---

## 🔁 Page 3 : `pages/review.html` — Révisions

### État 1 : Interrogations désactivées

```
┌─────────────────────────────────────────────┐
│ ⚠️  Interrogations désactivées              │
│ Active le toggle pour commencer.            │
└─────────────────────────────────────────────┘
```

### État 2 : Aucune révision à faire

```
┌─────────────────────────────────────────────┐
│ 🎉 Aucune révision pour le moment !        │
│ Reviens plus tard.                          │
└─────────────────────────────────────────────┘
```

### État 3 : Carte de révision active

```
┌─────────────────────────────────────────────┐
│ [X]                     [moderate] [prog]   │
│                                             │
│ 📝 Titre de la note                         │
│                                             │
│ ❓ Question générée par l'IA :              │
│ "Quelle est la différence entre..."        │
│                                             │
│ ┌─────────────────────────────────┐        │
│ │ Ta réponse...                   │ [Send] │
│ └─────────────────────────────────┘        │
│                                             │
│ [Je sais pas] [Indice] [Contexte]          │
│                                             │
│ Stats: ✅ 5 | ❌ 2 | Restantes: 3          │
└─────────────────────────────────────────────┘
```

### Workflow

- Chargement des notes dont `nextReviewAt ≤ maintenant`
- Affichage de la carte actuelle
- Actions possibles :

  - **Répondre** → évaluation + feedback + carte suivante
  - **Je sais pas** → incorrect + carte suivante
  - **Indice** → contexte court
  - **Contexte** → texte complet
  - **Fermer** (`X`) → passe à la suivante

---

# 🧠 Algorithme de révision espacée

### Intervalle initial selon intensité

```
Chill      : 7 jours
Moderate   : 1 jour
Intensive  : 6 heures
```

### Adaptation après révision

```
Correct   (✅) : intervalle × 1.5   (max : 1 an)
Incorrect (❌) : intervalle × 0.6   (min : 50% du base)
```

### Exemple (mode Moderate)

- J0 : création → +1 jour
- J1 : révision ✅ → 1 × 1.5 = 1.5 j
- J2.5 : révision ✅ → 1.5 × 1.5 = 2.25 j
- J4.75 : révision ❌ → 2.25 × 0.6 = 1.35 j
- J6.1 : révision ✅ → 1.35 × 1.5 = 2 j

➡️ Les notes maîtrisées s’espacent.
➡️ Les plus difficiles reviennent plus souvent.

---

# 🔗 Flux de données complet

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  index.html          notes.html        review.html    │
│      │                   │                  │          │
│      ├─ main.js          ├─ notes.js       ├─ review.js
│      └─ config.js        └─ config.js      └─ config.js
│                                                      │
│                     toast.js (partagé)               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST API
                       │
┌──────────────────────▼──────────────────────────────┐
│                    BACKEND                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  server.js  →  routeHandlers.js                      │
│                       │                              │
│                       ├─→ dataStore.js               │
│                       ├─→ scheduler.js               │
│                       └─→ ai.js                      │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       │ File System
                       │
┌──────────────────────▼──────────────────────────────┐
│                     DATA                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  backend/data/notes.json    (toutes les notes)       │
│  backend/data/config.json   (toggle + settings)      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# 🎯 Points forts du projet

- ✔️ Architecture claire (frontend / backend / data)
- ✔️ Modularité
- ✔️ API REST propre
- ✔️ Algorithme de révision espacée
- ✔️ UI pensée pour l’usage réel (toggle, feedback, stats)
- ✔️ Stockage JSON simple à débugger

---

# 🔮 Prochaines étapes suggérées

- Intégrer Ollama pour la vraie génération + évaluation
- Génération automatique de questions
- Page de statistiques avancées
- Export / import en Markdown
- Mode hors-ligne via Service Worker

---

# 📝 Résumé simplifié

Ton projet en **3 phrases** :

1. Tu crées des notes avec un niveau d’intensité.
2. L’application te pose des questions à intervalles réguliers.
3. Tes réponses ajustent la fréquence des futures révisions.

➡️ C’est comme **Anki**, mais **local**, **simple**, **personnalisé**, et **boosté par une IA locale**. 🚀
