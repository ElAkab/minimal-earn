# 📦 Guide d'installation de l'extension Mind Stimulator

## 🎯 Qu'est-ce que c'est ?

Une extension Chrome/Firefox qui affiche tes **flashCards de révision** sur n'importe quel site web (YouTube, Gmail, Wikipedia...).

---

## ✅ Prérequis

1. **Backend Express en marche** sur `http://localhost:3000`

   ```bash
   cd backend
   node server.js
   ```

2. **Créer des notes de test** (si ta DB est vide)
   ```bash
   curl http://localhost:3000/api/create-test-notes
   ```

---

## 🚀 Installation dans Chrome

### Étape 1 : Ouvrir la page des extensions

1. Ouvre Chrome
2. Va à l'adresse : `chrome://extensions/`
3. Active le **"Mode développeur"** (interrupteur en haut à droite)

### Étape 2 : Charger l'extension

1. Clique sur **"Charger l'extension non empaquetée"**
2. Sélectionne le dossier `extension/` de ton projet
3. L'extension apparaît dans la liste ! 🎉

### Étape 3 : Épingler l'extension

1. Clique sur l'icône **puzzle** 🧩 dans la barre d'outils
2. Trouve "Mind Stimulator"
3. Clique sur l'**épingle** 📌 pour la garder visible

---

## 🎮 Comment l'utiliser ?

### Interface popup (clique sur l'icône)

```
┌─────────────────────────────┐
│   🧠 Mind Stimulator        │
├─────────────────────────────┤
│   ⏸️ Désactivé              │
├─────────────────────────────┤
│  [Activer les FlashCards]   │ ← Active l'intervalle 15s
│  [📝 Afficher maintenant]   │ ← Force l'affichage immédiat
└─────────────────────────────┘
```

### Actions disponibles :

1. **Activer les FlashCards**

   - Une flashCard apparaît **toutes les 15 secondes**
   - Uniquement sur l'onglet actif
   - Fonctionne en arrière-plan

2. **Afficher maintenant**
   - Force l'apparition immédiate d'une carte
   - Utile pour tester rapidement

---

## 🔍 Débogage (Console Développeur)

### Console du background (service worker)

1. Va à `chrome://extensions/`
2. Trouve "Mind Stimulator"
3. Clique sur **"Inspecter les vues : service worker"**
4. Logs visibles :
   ```
   ⚡ [Background] Extension installée
   🔄 [Background] Nouveau statut : activé
   ⏰ [Background] Alarme créée (intervalle: 15s)
   🔔 [Background] Alarme déclenchée
   📚 [Background] 3 note(s) récupérée(s)
   📤 [Background] Envoi vers onglet 123 : "Capitale France"
   ```

### Console de la page web (content-script)

1. Ouvre n'importe quel site (ex: google.com)
2. Ouvre la console (F12)
3. Logs visibles :
   ```
   ⚡ [Content] Mind Stimulator content-script chargé
   📨 [Content] Message reçu : SHOW_FLASHCARD
   🎯 [Content] Affichage de la flashCard : Capitale France
   ✅ [Content] FlashCard affichée
   ```

---

## 🧪 Test rapide (checklist)

- [ ] Backend Express tourne sur port 3000
- [ ] Créer des notes de test via `/api/create-test-notes`
- [ ] Extension chargée dans Chrome
- [ ] Cliquer sur l'icône → Popup s'ouvre
- [ ] Cliquer "Activer les FlashCards"
- [ ] Attendre 15 secondes
- [ ] Une flashCard apparaît en bas à droite ! 🎉

---

## 🐛 Problèmes courants

### La flashCard n'apparaît pas

1. **Vérifier que le backend tourne**

   ```bash
   curl http://localhost:3000/api/notes/review?intensity=2
   # Doit retourner des notes
   ```

2. **Vérifier la console background**

   - Erreur CORS ? → Ajoute `"host_permissions"` dans manifest.json
   - `Aucune note à réviser` ? → Crée des notes de test

3. **Recharger l'extension**
   - Va à `chrome://extensions/`
   - Clique sur l'icône **↻ Recharger**

### L'intervalle ne se déclenche pas

- Vérifier que l'extension est **activée** (popup)
- Console background : `⏰ [Background] Alarme créée`
- Attendre 15 secondes minimum

---

## 🔧 Modifier l'intervalle

Dans `extension/background.js`, ligne 16 :

```javascript
const INTERVAL_MINUTES = 0.25; // 15 secondes

// Exemples :
// 0.5 = 30 secondes
// 1 = 1 minute
// 5 = 5 minutes
```

Après modification :

1. Recharger l'extension (`chrome://extensions/`)
2. Désactiver puis réactiver dans le popup

---

## 📂 Structure des fichiers

```
extension/
├── manifest.json       # Configuration de l'extension
├── background.js       # Service worker (alarmes, API)
├── content-script.js   # Injecté dans les pages (affiche les flashCards)
├── popup.html          # Interface du popup
├── popup.js            # Logique du popup
└── INSTALLATION.md     # Ce fichier
```

---

## 🎓 Explication technique

### Flow de communication :

```
1. User clique "Activer" dans popup.html
   ↓
2. popup.js envoie message → background.js
   ↓
3. background.js crée une alarme (toutes les 15s)
   ↓
4. Alarme déclenche → fetch vers API backend
   ↓
5. Récupère une note → envoie vers content-script.js
   ↓
6. content-script.js affiche la flashCard dans la page
```

### Pourquoi "content-script" ?

- Les **background scripts** ne peuvent pas manipuler le DOM des pages web
- Les **content-scripts** sont injectés dans chaque page pour afficher l'UI
- Communication via `chrome.runtime.sendMessage()`

---

## 🚀 Prochaines étapes

Une fois l'extension testée :

1. ✅ Connecter au vrai scheduler SM-2
2. ✅ Ajouter des stats dans le popup
3. ✅ Intégrer l'IA pour générer les questions
4. ✅ Gérer les réponses utilisateur (correct/incorrect)

---

**Bon apprentissage ! 🧠✨**
