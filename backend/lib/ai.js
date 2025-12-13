import { Ollama } from "ollama";

// =====================
// Configuration Ollama
// =====================

// Instance du client Ollama (connexion locale par défaut)
const ollama = new Ollama();

/**
 * Configuration du timeout pour les requêtes Ollama
 *
 * IMPORTANT : Les modèles locaux peuvent être lents selon votre matériel
 * - Modèles légers (< 7B) : ~5-15 secondes
 * - Modèles moyens (7B-13B) : ~15-45 secondes
 * - Modèles lourds (> 13B) : ~45-120 secondes
 *
 * Valeurs recommandées :
 * - 0 (défaut) : Pas de timeout (recommandé pour développement local)
 * - 120000 : 2 minutes (pour production avec modèles moyens)
 * - 180000 : 3 minutes (pour modèles lourds)
 *
 * Configuration via variable d'environnement : OLLAMA_TIMEOUT=120000
 */
const OLLAMA_TIMEOUT = process.env.OLLAMA_TIMEOUT
	? parseInt(process.env.OLLAMA_TIMEOUT)
	: 0;

// Validation du timeout
if (OLLAMA_TIMEOUT < 0) {
	console.warn(
		"⚠️ OLLAMA_TIMEOUT doit être >= 0, utilisation de la valeur par défaut (0)"
	);
}

console.log(
	`⚙️ Configuration Ollama timeout: ${
		OLLAMA_TIMEOUT === 0 ? "Désactivé" : `${OLLAMA_TIMEOUT / 1000}s`
	}`
);

// Catalogue des modèles disponibles (du plus léger au plus lourd)
const MODELS = {
	// Modèle léger généraliste (par défaut)
	lightweight: "gpt-oss",
	// Modèle pour la programmation
	code: "hir0rameel/qwen-claude",
	// Modèle de secours si les autres échouent
	fallback: "gpt-oss",
};

// =====================
// Utilitaires
// =====================

/**
 * Exécute un appel Ollama avec timeout optionnel
 * @param {Function} asyncFn - Fonction asynchrone à exécuter
 * @param {number} timeout - Timeout en ms (0 = pas de timeout)
 * @returns {Promise} - Résultat ou erreur timeout
 */
async function withTimeout(asyncFn, timeout = OLLAMA_TIMEOUT) {
	// Si timeout est 0 ou non défini, pas de timeout
	if (!timeout || timeout === 0) {
		return asyncFn();
	}

	return Promise.race([
		asyncFn(),
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Ollama timeout after ${timeout / 1000}s`)),
				timeout
			)
		),
	]);
}

// =====================
// Sélection intelligente du modèle
// =====================

/**
 * Choisit le modèle approprié selon le contenu de la note
 * @param {Object} note - La note à analyser
 * @returns {string} - Le nom du modèle à utiliser
 */
export function pickModel(note) {
	// Si tags IA contiennent "hir0rameel/qwen-claude" → modèle code
	if (note.aiTags && note.aiTags.includes("hir0rameel/qwen-claude")) {
		return MODELS.code;
	}

	// Si la description contient des mots-clés de programmation
	const codeKeywords = [
		"function",
		"variable",
		"class",
		"method",
		"code",
		"programming",
		"javascript",
		"python",
		"java",
		"const",
		"let",
		"var",
		"return",
		"import",
		"export",
	];

	const content = `${note.title || ""} ${note.description || ""}`.toLowerCase();
	const hasCodeKeywords = codeKeywords.some((keyword) =>
		content.includes(keyword.toLowerCase())
	);

	if (hasCodeKeywords) {
		return MODELS.code;
	}

	// Par défaut → modèle léger
	return MODELS.lightweight;
}

// =====================
// Génération de question
// =====================

/**
 * Génère une question à partir d'une note via Ollama
 * @param {Object} note - La note source
 * @returns {Promise<string>} - La question générée
 */
export async function generateQuestion(note) {
	const model = pickModel(note);
	const titlePart = note.title ? `Titre : ${note.title}\n` : "";

	const prompt = `Tu es un examinateur pédagogique. Génère UNE question courte et précise pour tester la compréhension de l'utilisateur (en pleine phase d'apprentissage) en fonction de sa note.

	${titlePart} Contenu : ${note.description}

	Réponds UNIQUEMENT avec la question, sans introduction ni explication.`;

	try {
		console.log(`🤖 Génération de question avec le modèle: ${model}`);
		const startTime = Date.now();

		const response = await withTimeout(
			() =>
				ollama.generate({
					model,
					prompt,
					stream: false,
				}),
			OLLAMA_TIMEOUT
		);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Question générée avec succès en ${duration}s`);
		return response.response.trim();
	} catch (error) {
		console.error(`❌ Erreur génération question (${model}):`, error.message);

		// Si erreur de timeout ou modèle introuvable, tenter le fallback
		if (model !== MODELS.fallback && !error.message.includes("timeout")) {
			console.log(`🔄 Tentative avec le modèle fallback: ${MODELS.fallback}`);
			try {
				const fallbackResponse = await withTimeout(
					() =>
						ollama.generate({
							model: MODELS.fallback,
							prompt,
							stream: false,
						}),
					OLLAMA_TIMEOUT
				);
				console.log(`✅ Question générée avec le modèle fallback`);
				return fallbackResponse.response.trim();
			} catch (fallbackError) {
				console.error(
					`❌ Erreur avec le modèle fallback:`,
					fallbackError.message
				);
			}
		}

		// Si tout échoue, retourner une question simple
		console.log(`⚠️ Utilisation de la question par défaut`);
		return buildPrompt(note);
	}
}

export function buildPrompt(note) {
	const titlePart = note.title ? `Contexte / titre : ${note.title}\n\n` : "";
	return `Tu es un examinateur. Utilise la description suivante pour créer une question qui teste la compréhension ou la mémorisation. Réponds uniquement avec la question, puis attends la réponse utilisateur.\n\n${titlePart}Description : ${note.description}\n\n.`;
}

// =====================
// Évaluation de réponse
// =====================

/**
 * Évalue la réponse de l'utilisateur via Ollama
 * @param {string} question - La question posée
 * @param {string} userAnswer - La réponse de l'utilisateur
 * @param {string} correctContext - Le contexte correct (description de la note)
 * @returns {Promise<Object>} - { isCorrect: boolean, feedback: string }
 */
export async function evaluateAnswer(question, userAnswer, correctContext) {
	// Utiliser le modèle léger pour l'évaluation (tâche simple)
	const model = MODELS.lightweight;

	const prompt = `Évalue cette réponse d'étudiant.

	Question : ${question}
	Contenu attendu : ${correctContext}
	Réponse de l'étudiant : ${userAnswer}

	Réponds en 2 lignes maximum :
	1. Première ligne : CORRECT ou INCORRECT
	2. Explication courte (1 phrase)`;

	try {
		console.log(`🤖 Évaluation de la réponse avec le modèle: ${model}`);
		const startTime = Date.now();

		const response = await withTimeout(
			() =>
				ollama.generate({
					model,
					prompt,
					stream: false,
				}),
			OLLAMA_TIMEOUT
		);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		const isCorrect = response.response.toLowerCase().includes("correct");
		console.log(
			`✅ Évaluation terminée en ${duration}s: ${
				isCorrect ? "CORRECT" : "INCORRECT"
			}`
		);

		return {
			isCorrect,
			feedback: response.response.trim(),
		};
	} catch (error) {
		console.error(`❌ Erreur évaluation réponse:`, error.message);

		// Fallback : évaluation basique
		return {
			isCorrect: userAnswer.length > 10,
			feedback:
				"Évaluation automatique temporairement indisponible. Réponse enregistrée.",
		};
	}
}

// =====================
// Génération d'indice
// =====================

/**
 * Génère un indice pour aider l'utilisateur
 * @param {Object} note - La note source
 * @returns {Promise<string>} - L'indice généré
 */
export async function generateHint(note) {
	const model = MODELS.lightweight;

	const prompt = `Donne UN indice court (1 phrase) pour aider à répondre à une question sur ce sujet :

${note.description}

Indice :`;

	try {
		console.log(`🤖 Génération d'indice avec le modèle: ${model}`);
		const startTime = Date.now();

		const response = await withTimeout(
			() =>
				ollama.generate({
					model,
					prompt,
					stream: false,
				}),
			OLLAMA_TIMEOUT
		);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Indice généré avec succès en ${duration}s`);
		return response.response.trim();
	} catch (error) {
		console.error(`❌ Erreur génération indice:`, error.message);
		return "Relisez attentivement le contexte de la note.";
	}
}

// =====================
// Fonctions legacy (pour compatibilité)
// =====================

export function pickIA(aiArray) {
	if (!Array.isArray(aiArray) || aiArray.length === 0) return null;
	return aiArray[0];
}
