# 📚 Mind Stimulator

> Application d'apprentissage par cartes mémo interactives avec IA locale (Ollama)

[![Tests](https://img.shields.io/badge/tests-16%2F16-success)](./DOCUMENTATION.md#-tests)
[![Ollama](https://img.shields.io/badge/Ollama-3%20models-blue)](./DOCUMENTATION.md#-intégration-ia)

---

## 🎯 Concept

Mind Stimulator est une application d'apprentissage qui combine :
- **Cartes mémo interactives** (comme Anki)
- **IA locale** (Ollama) pour générer questions et évaluer réponses
- **Révision espacée** adaptative selon tes performances

Un **"toast"** = une **carte d'interrogation interactive** qui :
- Apparaît selon l'algorithme de révision espacée
- Contient une question générée par l'IA
- Permet de répondre, demander un indice, ou indiquer qu'on ne sait pas
- S'adapte à tes résultats

---

## 🚀 Démarrage rapide (5 minutes)

### 1. Installer Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gpt-oss            # Modèle principal (~12GB)
ollama pull hir0rameel/qwen-claude  # Modèle code (~5GB)
ollama serve                   # Laisse tourner
```

### 2. Installer et démarrer
```bash
pnpm install
cd backend && pnpm install && pnpm start  # Terminal 1
# Retour à la racine
pnpm dev                                  # Terminal 2
```

### 3. Tester
Ouvre **http://localhost:5173** et clique sur **"🧪 Tester l'IA"**

✅ Tu devrais voir : "Question générée avec succès en X.XXs"

---

## 📖 Documentation complète

👉 **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Guide complet (16 KB)

**Contenu :**
- 🏗️ Architecture détaillée
- 🤖 Intégration IA (Ollama)
- ⚙️ Configuration et variables d'environnement
- 🧪 Tests unitaires (16 tests)
- 🐛 Dépannage complet
- 📝 API Reference
- 🔧 Résolution timeout Ollama

---

## 🎯 Fonctionnalités

### ✅ Implémenté
- ✅ Création de notes avec métadonnées
- ✅ Génération de questions par IA (Ollama)
- ✅ Évaluation automatique des réponses
- ✅ Génération d'indices intelligents
- ✅ Gestion des notes (CRUD)
- ✅ Algorithme de révision espacée
- ✅ Sélection automatique du modèle IA
- ✅ Tests unitaires (16/16 passés)
- ✅ Gestion robuste des erreurs
- ✅ Logs détaillés (backend + frontend)

### 🚧 En cours / Prévu
- 🚧 Page de révision interactive
- 🚧 Notifications toast automatiques
- 🚧 Statistiques détaillées
- 🚧 Export/import Markdown

---

## 🛠️ Stack technique

**Frontend :** Vite + TailwindCSS 4 + Flowbite + Vanilla JS  
**Backend :** Node.js + Express + Ollama SDK  
**IA :** Ollama (gpt-oss 20B, qwen-claude 8B, gemma3 4B)  
**Tests :** Vitest (16 tests unitaires)  
**Storage :** JSON file-based

---

## 🧪 Tests

```bash
pnpm test --run        # Tous les tests
cd backend && pnpm test --run  # Tests backend uniquement
```

**Résultats actuels :**
- ✅ 9/9 tests IA (`ai.test.js`)
- ✅ 7/7 tests utilitaires (`utils.test.js`)
- ✅ Tests DataStore validés

---

## 🐛 Problèmes courants

### "Ollama timeout"
✅ **Résolu** : Le timeout est désactivé par défaut (les gros modèles prennent 60-120s)

[Voir détails dans DOCUMENTATION.md](./DOCUMENTATION.md#problème--ollama-timeout)

### Le serveur ne démarre pas
```bash
lsof -i :5000          # Vérifier le port
kill -9 <PID>          # Tuer le processus
cd backend && pnpm start  # Redémarrer
```

---

## 📁 Structure

```
minimal-earn/
├── backend/           # Serveur Express + IA
│   ├── lib/          # Modules (ai, dataStore, scheduler)
│   ├── routes/       # API endpoints
│   └── data/         # Stockage JSON
├── src/              # Frontend (Vite)
│   ├── main.js       # Page d'accueil
│   ├── notes.js      # Gestion notes
│   └── config.js     # Configuration
├── index.html        # Page principale
└── DOCUMENTATION.md  # Guide complet
```

---

## 🎓 Apprendre avec ce projet

Ce projet est conçu comme **support d'apprentissage** :
- 📝 Code commenté et structuré
- 🧪 Tests unitaires comme exemples
- 📚 Documentation détaillée
- 🔍 Logs explicites partout
- ✅ Bonnes pratiques appliquées

---

## 🤝 Commandes utiles

```bash
# Développement
pnpm dev              # Frontend (Vite)
cd backend && pnpm start  # Backend (avec watch)

# Tests
pnpm test --run       # Lancer tous les tests
./test-api.sh         # Test intégration API

# Ollama
ollama list           # Modèles installés
ollama pull <model>   # Télécharger un modèle
ollama serve          # Démarrer le serveur

# Vérifications
curl http://localhost:5000/api/config  # Backend OK ?
curl http://localhost:11434/api/tags   # Ollama OK ?
```

---

## 📄 Licence

Projet personnel d'apprentissage - Usage libre

---

**📖 Consulte [DOCUMENTATION.md](./DOCUMENTATION.md) pour le guide complet !**
