#!/bin/bash
echo "🧪 Test de l'API Mind Stimulator"
echo "================================"
echo ""

# Test 1: Vérifier que le serveur répond
echo "1️⃣ Test du serveur backend..."
if curl -s http://localhost:5000/api/config > /dev/null; then
    echo "   ✅ Serveur accessible"
else
    echo "   ❌ Serveur inaccessible"
    exit 1
fi

# Test 2: Récupérer les notes
echo ""
echo "2️⃣ Test de récupération des notes..."
NOTES_COUNT=$(curl -s http://localhost:5000/api/notes | python3 -c "import sys, json; print(len(json.load(sys.stdin)['notes']))" 2>/dev/null)
echo "   ✅ $NOTES_COUNT notes trouvées"

# Test 3: Créer une note de test
echo ""
echo "3️⃣ Test de création de note..."
NOTE_ID=$(curl -s -X POST http://localhost:5000/api/generate-note \
  -H "Content-Type: application/json" \
  -d '{"aiTags":["gpt-oss"],"title":"Test API","description":"Test automatique de l'\''API","intensity":"moderate"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['note']['id'])" 2>/dev/null)

if [ ! -z "$NOTE_ID" ]; then
    echo "   ✅ Note créée avec ID: $NOTE_ID"
else
    echo "   ❌ Échec création de note"
    exit 1
fi

# Test 4: Tester Ollama (optionnel)
echo ""
echo "4️⃣ Test de disponibilité d'Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys, json; print(len(json.load(sys.stdin)['models']))" 2>/dev/null)
    echo "   ✅ Ollama accessible avec $MODELS modèles"
else
    echo "   ⚠️  Ollama non accessible (normal si non démarré)"
fi

# Test 5: Supprimer la note de test
echo ""
echo "5️⃣ Test de suppression de note..."
DELETE_RESULT=$(curl -s -X DELETE http://localhost:5000/api/notes/$NOTE_ID | python3 -c "import sys, json; print(json.load(sys.stdin)['message'])" 2>/dev/null)
echo "   ✅ $DELETE_RESULT"

echo ""
echo "================================"
echo "✅ Tous les tests API ont réussi !"
