# 📄 Architecture de la page Notes

Ce document explique le rôle de chaque fichier impliqué dans le fonctionnement de la page **Notes** ([`pages/notes.html`](../pages/notes.html)).

---

## 🎯 Vue d'ensemble

La page Notes affiche toutes les notes créées par l'utilisateur sous forme de cartes interactives. L'architecture suit un pattern **événementiel modulaire** où chaque composant est indépendant et communique via des **CustomEvents**.

```
notes.html
    ↓ charge
notes.js (orchestrateur)
    ↓ utilise
loadNotes.js → noteCard.js → expandedCard.js
    ↓ utilise
constants.js (données partagées)
```

---

## 📁 Fichiers principaux

### 1️⃣ **[`pages/notes.html`](../pages/notes.html)** - Point d'entrée

**Rôle :** Structure HTML de la page Notes

**Contenu clé :**

- Header avec navigation
- Section `#notes-field` (conteneur des cartes)
- Chargement du script [`src/notes.js`](../src/notes.js)

**Responsabilité :**

- Définir la mise en page (grid responsive)
- Charger le script d'orchestration

---

### 2️⃣ **[`src/notes.js`](../src/notes.js)** - Orchestrateur principal

**Rôle :** Coordonne tous les événements et composants de la page Notes

**Fonctions clés :**

```javascript
displayNotes(); // Charge et affiche toutes les notes
handleExpandCard(); // Ouvre une carte en modal agrandi
handleStartReview(); // Lance une session de révision
```

**Événements écoutés :**

- `"expandNoteCard"` → Affiche la carte agrandie
- `"startReview"` → Lance la révision avec flashCard
- `"DOMContentLoaded"` → Charge les notes au démarrage

**Responsabilité :**

- **Orchestrer** les interactions entre composants
- **Ne pas** gérer l'UI directement (délégué aux composants)

---

### 3️⃣ **[`src/utils/loadNotes.js`](../src/utils/loadNotes.js)** - Récupération des données

**Rôle :** Fetch les notes depuis l'API backend

**Fonction :**

```javascript
loadNotes() → Promise<Note[]>
```

**API appelée :**

- `GET http://localhost:3000/api/notes`

**Retour :**

```javascript
[
	{
		id: 1,
		title: "...",
		content: "...",
		intensity: 1,
		color: "blue",
		nextReviewDate: "2024-12-17T...",
		easeFactor: 2.5,
		currentInterval: 0,
	},
];
```

**Responsabilité :**

- Gérer la communication avec le backend
- Gérer les erreurs réseau
- Retourner un tableau vide en cas d'échec

---

### 4️⃣ **[`src/utils/noteCard.js`](../src/utils/noteCard.js)** - Composant carte compacte

**Rôle :** Crée l'élément DOM d'une carte de note individuelle

**Fonction principale :**

```javascript
createNoteCard(note) → HTMLElement
```

**UI générée :**

- Badge d'intensité (Chill/Sérieux/Nécessaire)
- Titre de la note
- Aperçu du contenu (tronqué)
- Checkbox (pour marquer comme révisée)
- Bouton "Read more"

**Événements émis :**

- `"expandNoteCard"` (clic sur "Read more")

**Responsabilité :**

- Créer l'HTML de la carte
- Attacher les événements (checkbox, bouton)
- **Ne pas** gérer la logique métier (délégué via événements)

---

### 5️⃣ **[`src/utils/expandedCard.js`](../src/utils/expandedCard.js)** - Composant carte agrandie

**Rôle :** Affiche une note en mode modal (plein écran)

**Fonction principale :**

```javascript
showExpandedCard(note) → void
```

**UI générée :**

- Modal avec backdrop blur
- Titre et intensité complets
- Contenu intégral de la note
- Métadonnées (date création, prochaine révision)
- Boutons d'action :
  - 🎯 "Commencer la révision"
  - ✏️ "Modifier"

**Événements émis :**

- `"startReview"` (clic sur "Commencer la révision")
- `"editNote"` (clic sur "Modifier")

**Interactions supportées :**

- Fermer avec **X**
- Fermer avec **Échap**
- Fermer en cliquant sur le **fond**

**Responsabilité :**

- Afficher la note en détail
- Gérer les animations (fadeIn/fadeOut)
- Émettre des événements pour les actions

---

### 6️⃣ **[`src/utils/constants.js`](../src/utils/constants.js)** - Données partagées

**Rôle :** Centralise toutes les constantes de l'application

**Exports principaux :**

```javascript
// Mappings
INTENSITY_MAP; // "Chill" → 1
INTENSITY_TEXT_MAP; // 1 → "Chill"
COLOR_CLASSES; // "blue" → "text-blue-500"
INTENSITY_COLOR_MAP; // 1 → "blue"

// Fonctions utilitaires
getIntensityLabel(1); // → "Chill"
getIntensityColor(1); // → "blue"
getColorClass("blue"); // → "text-blue-500"
```

**Responsabilité :**

- **Source unique de vérité** pour les intensités et couleurs
- Éviter la duplication de code
- Faciliter les modifications globales

---

## 🔄 Flux d'interaction

### **Chargement de la page**

```
1. notes.html charge
2. notes.js s'exécute (DOMContentLoaded)
3. displayNotes() appelle loadNotes()
4. loadNotes() fetch l'API backend
5. Pour chaque note : createNoteCard()
6. Affichage des cartes dans #notes-field
```

### **Clic sur "Read more"**

```
1. noteCard émet "expandNoteCard"
2. notes.js capte l'événement
3. notes.js appelle showExpandedCard()
4. expandedCard affiche le modal
```

### **Lancement d'une révision**

```
1. expandedCard émet "startReview"
2. notes.js capte l'événement
3. notes.js appelle flashCard()
4. flashCard affiche la session de révision
```

---

## 📊 Diagramme de dépendances

```
notes.html
    ↓
notes.js ────────────┐
    ├─ loadNotes.js  │
    ├─ noteCard.js ──┼─→ constants.js
    ├─ expandedCard.js ┘
    └─ flashCard.js
```

**Aucun import circulaire** → architecture propre ✅

---

## 🎨 Conventions de nommage

| Type                     | Convention | Exemple            |
| ------------------------ | ---------- | ------------------ |
| **Fichiers composants**  | camelCase  | `noteCard.js`      |
| **Fichiers utilitaires** | camelCase  | `loadNotes.js`     |
| **Fonctions publiques**  | camelCase  | `createNoteCard()` |
| **Événements**           | camelCase  | `"expandNoteCard"` |
| **IDs HTML**             | kebab-case | `#notes-field`     |
| **Classes CSS**          | kebab-case | `.bg-neutral-900`  |

---

## 🚀 Pour ajouter une fonctionnalité

### **Exemple : Ajouter un bouton "Supprimer"**

1. **Modifier [`noteCard.js`](../src/utils/noteCard.js)** : Ajouter le bouton dans le HTML
2. **Émettre un événement** : `"deleteNote"` avec `{ noteId }`
3. **Dans [`notes.js`](../src/notes.js)** : Écouter `"deleteNote"` et appeler l'API
4. **Recharger les notes** : Appeler `displayNotes()` après suppression

**Avantage de cette architecture :**

- Pas besoin de toucher [`loadNotes.js`](../src/utils/loadNotes.js) ou [`expandedCard.js`](../src/utils/expandedCard.js)
- Ajout isolé et testable
- Cohérent avec le pattern événementiel existant

---

## 🧪 Tests recommandés

```javascript
// Test de loadNotes()
describe("loadNotes", () => {
	it("devrait retourner un tableau de notes", async () => {
		const notes = await loadNotes();
		expect(Array.isArray(notes)).toBe(true);
	});
});

// Test de createNoteCard()
describe("createNoteCard", () => {
	it("devrait créer un élément HTML valide", () => {
		const note = { id: 1, title: "Test", content: "...", intensity: 1 };
		const card = createNoteCard(note);
		expect(card).toBeInstanceOf(HTMLElement);
	});
});

// Test d'événement
describe("Événements", () => {
	it("devrait émettre expandNoteCard au clic sur Read more", () => {
		const handler = jest.fn();
		window.addEventListener("expandNoteCard", handler);

		// Simuler clic sur bouton
		const button = document.querySelector("#read-more-1");
		button.click();

		expect(handler).toHaveBeenCalled();
	});
});
```

---

## 📚 Ressources

- **[AGENTS.md](../AGENTS.md)** : Règles générales du projet
- **[src/utils/constants.js](../src/utils/constants.js)** : Documentation des constantes
- **[backend/server.js](../backend/server.js)** : Routes API utilisées

---

**Dernière mise à jour :** 17 décembre 2024
