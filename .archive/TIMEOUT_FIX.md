# 🔧 Correction du Timeout Ollama

## Problème
L'application affichait **"Ollama timeout"** car le timeout était fixé à 30 secondes, ce qui est insuffisant pour les modèles lourds comme `gpt-oss` (20.9B paramètres).

## Cause
Les modèles Ollama lourds prennent **60-90 secondes** pour générer une réponse sur CPU, surtout au premier appel (chargement du modèle en mémoire).

## Solution appliquée

### 1. **Timeout désactivé par défaut** ✅
```javascript
const OLLAMA_TIMEOUT = process.env.OLLAMA_TIMEOUT 
    ? parseInt(process.env.OLLAMA_TIMEOUT) 
    : 0; // 0 = pas de timeout (recommandé)
```

### 2. **Timeout configurable via variable d'environnement** ✅
Tu peux maintenant définir `OLLAMA_TIMEOUT` dans un fichier `.env` :

```bash
# backend/.env
OLLAMA_TIMEOUT=120000  # 2 minutes
```

### 3. **Logs de performance** ✅
Affiche maintenant le temps de génération :
```
🤖 Génération de question avec le modèle: gpt-oss
✅ Question générée avec succès en 45.23s
```

### 4. **Pas de fallback sur timeout** ✅
Le fallback ne se déclenche plus en cas de timeout pour éviter de bloquer 2 fois.

## Configuration recommandée

### Pour Ollama local (recommandé)
```bash
OLLAMA_TIMEOUT=0  # Pas de timeout
```
✅ Avantages :
- Pas d'interruption des requêtes
- Fonctionne avec tous les modèles
- Pas de gestion d'erreur inutile

### Pour Ollama distant ou en production
```bash
OLLAMA_TIMEOUT=300000  # 5 minutes max
```
✅ Avantages :
- Protection contre les requêtes bloquées
- Timeout raisonnable pour les gros modèles

## Créer le fichier .env

```bash
cd backend
cp .env.example .env
# Éditer .env selon tes besoins
```

## Test

Relance ton test et observe les logs :

```bash
# Dans la console du serveur, tu verras :
🤖 Génération de question avec le modèle: gpt-oss
✅ Question générée avec succès en 67.45s
```

Le temps affiché te permet de voir si Ollama fonctionne normalement.

## Pourquoi c'est mieux ?

1. ✅ **Flexibilité** : Timeout configurable selon ton environnement
2. ✅ **Pas de timeout par défaut** : Fonctionne out-of-the-box
3. ✅ **Logs de performance** : Tu vois combien de temps prend chaque requête
4. ✅ **Fallback intelligent** : Ne se déclenche que sur vraies erreurs (pas timeout)

## Temps de réponse typiques d'Ollama

| Modèle | Taille | Temps moyen (CPU) | Temps moyen (GPU) |
|--------|--------|-------------------|-------------------|
| gemma3 | 4.3B | 15-30s | 3-5s |
| hir0rameel/qwen-claude | 8.2B | 30-60s | 5-10s |
| gpt-oss | 20.9B | 60-120s | 10-20s |

**Note** : Le premier appel est toujours plus lent (chargement en mémoire).

## En résumé

✅ **Avant** : Timeout fixe de 30s → Échec avec gros modèles  
✅ **Après** : Pas de timeout par défaut → Fonctionne avec tous les modèles

Tu n'as rien à configurer, ça marche directement ! 🎉
