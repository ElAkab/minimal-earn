import { Ollama } from "ollama";

/**
 * aiService.js
 *
 * Service centralisé pour tous les appels IA.
 * Implémente une stratégie hybride :
 * - IA externe rapide par défaut (OpenRouter, OpenAI, etc.)
 * - Ollama local en fallback ou sur demande
 *
 * Architecture :
 * - Tous les appels IA passent par ce module
 * - Configuration flexible via variables d'environnement
 * - Support de plusieurs providers
 * - Gestion des timeouts et erreurs
 * - Métriques et logging
 */

// =====================
// CONFIGURATION
// =====================

/**
 * Configuration du provider IA par défaut
 * Valeurs possibles : "ollama", "openrouter", "openai", "anthropic"
 *
 * Défaut : "ollama" (IA locale gratuite)
 * Pour production : "openrouter" (IA externe rapide, peu coûteuse)
 */
const AI_PROVIDER = process.env.AI_PROVIDER || "ollama";

/**
 * Configuration des API keys (pour providers externes)
 */
const API_KEYS = {
	openrouter: process.env.OPENROUTER_API_KEY,
	openai: process.env.OPENAI_API_KEY,
	anthropic: process.env.ANTHROPIC_API_KEY,
};

/**
 * Configuration des modèles par provider et tâche
 */
const MODELS_CONFIG = {
	ollama: {
		generation: "gpt-oss", // Modèle léger pour génération
		evaluation: "gpt-oss", // Même modèle pour évaluation
		hint: "gpt-oss", // Même modèle pour indices
		code: "hir0rameel/qwen-claude", // Modèle spécialisé pour code
	},
	openrouter: {
		generation: "google/gemini-flash-1.5-8b", // Rapide et peu cher
		evaluation: "google/gemini-flash-1.5-8b", // Idem
		hint: "google/gemini-flash-1.5-8b", // Idem
		code: "google/gemini-flash-1.5-8b", // Peut gérer le code aussi
	},
};

/**
 * Timeouts par provider (ms)
 */
const TIMEOUTS = {
	ollama: 30000, // 30s pour IA locale
	openrouter: 10000, // 10s pour IA externe
	openai: 10000,
	anthropic: 10000,
};

// Instance Ollama
const ollama = new Ollama();

// =====================
// SÉLECTION DU MODÈLE
// =====================

/**
 * Détermine le modèle à utiliser selon le provider, la tâche et le contenu
 * @param {string} task - "generation", "evaluation", "hint"
 * @param {Object} note - Note à analyser (optionnel)
 * @returns {string} - Nom du modèle
 */
export function selectModel(task, note = null) {
	const provider = AI_PROVIDER;
	const models = MODELS_CONFIG[provider];

	if (!models) {
		console.warn(`⚠️ Provider inconnu: ${provider}, utilisation d'ollama`);
		return MODELS_CONFIG.ollama[task] || MODELS_CONFIG.ollama.generation;
	}

	// Pour Ollama : détecter si c'est du code
	if (provider === "ollama" && note) {
		const codeKeywords = [
			"function",
			"variable",
			"class",
			"method",
			"code",
			"javascript",
			"python",
			"const",
			"let",
			"var",
			"return",
		];

		const content = `${note.title || ""} ${
			note.description || ""
		}`.toLowerCase();
		const isCode = codeKeywords.some((keyword) => content.includes(keyword));

		if (isCode && task === "generation") {
			return models.code;
		}
	}

	return models[task] || models.generation;
}

// =====================
// APPELS IA PAR PROVIDER
// =====================

/**
 * Génère du texte via Ollama
 * @param {string} model - Nom du modèle
 * @param {string} prompt - Prompt
 * @returns {Promise<string>} - Réponse générée
 */
async function generateWithOllama(model, prompt) {
	const response = await ollama.generate({
		model,
		prompt,
		stream: false,
	});
	return response.response.trim();
}

/**
 * Génère du texte via OpenRouter
 * @param {string} model - Nom du modèle
 * @param {string} prompt - Prompt
 * @returns {Promise<string>} - Réponse générée
 */
async function generateWithOpenRouter(model, prompt) {
	const apiKey = API_KEYS.openrouter;
	if (!apiKey) {
		throw new Error("OPENROUTER_API_KEY non configurée");
	}

	const response = await fetch(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "http://localhost:5173", // Optionnel
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content: prompt }],
			}),
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenRouter error: ${error}`);
	}

	const data = await response.json();
	return data.choices[0].message.content.trim();
}

/**
 * Génère du texte selon le provider configuré
 * @param {string} model - Nom du modèle
 * @param {string} prompt - Prompt
 * @returns {Promise<string>} - Réponse générée
 */
async function generateText(model, prompt) {
	const provider = AI_PROVIDER;
	const timeout = TIMEOUTS[provider] || 30000;

	const generateFn = async () => {
		switch (provider) {
			case "ollama":
				return await generateWithOllama(model, prompt);
			case "openrouter":
				return await generateWithOpenRouter(model, prompt);
			default:
				throw new Error(`Provider non supporté: ${provider}`);
		}
	};

	// Appliquer timeout
	return Promise.race([
		generateFn(),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error(`Timeout après ${timeout}ms`)), timeout)
		),
	]);
}

// =====================
// FONCTIONS PUBLIQUES
// =====================

/**
 * Génère une question pour une note
 * @param {Object} note - Note source
 * @returns {Promise<Object>} - { question, model }
 */
export async function generateQuestion(note) {
	const model = selectModel("generation", note);
	const titlePart = note.title ? `Titre : ${note.title}\n` : "";

	const prompt = `Tu es un examinateur pédagogique. Génère UNE question courte et précise pour tester la compréhension de l'utilisateur en phase d'apprentissage.

${titlePart}Contenu : ${note.description}

Réponds UNIQUEMENT avec la question, sans introduction ni explication.`;

	try {
		console.log(
			`🤖 Génération question (provider: ${AI_PROVIDER}, model: ${model})`
		);
		const startTime = Date.now();

		const question = await generateText(model, prompt);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Question générée en ${duration}s`);

		return { question, model };
	} catch (error) {
		console.error(`❌ Erreur génération question:`, error.message);

		// Fallback vers Ollama si provider externe échoue
		if (AI_PROVIDER !== "ollama") {
			console.log(`🔄 Tentative avec Ollama...`);
			try {
				const fallbackModel = MODELS_CONFIG.ollama.generation;
				const question = await generateWithOllama(fallbackModel, prompt);
				return { question, model: fallbackModel };
			} catch (fallbackError) {
				console.error(`❌ Fallback échoué:`, fallbackError.message);
			}
		}

		// Dernier recours : question basique
		return {
			question: `Explique en détail : ${note.description.substring(0, 100)}...`,
			model: "fallback",
		};
	}
}

/**
 * Évalue la réponse d'un utilisateur
 * @param {string} question - Question posée
 * @param {string} userAnswer - Réponse de l'utilisateur
 * @param {string} correctContext - Contexte correct (description de la note)
 * @returns {Promise<Object>} - { isCorrect, feedback, confidence }
 */
export async function evaluateAnswer(question, userAnswer, correctContext) {
	const model = selectModel("evaluation");

	const prompt = `Évalue cette réponse d'étudiant.

Question : ${question}
Contenu attendu : ${correctContext}
Réponse de l'étudiant : ${userAnswer}

Réponds en 2 lignes maximum :
1. Première ligne : CORRECT ou INCORRECT
2. Explication courte (1 phrase)`;

	try {
		console.log(
			`🤖 Évaluation réponse (provider: ${AI_PROVIDER}, model: ${model})`
		);
		const startTime = Date.now();

		const response = await generateText(model, prompt);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		const isCorrect = response.toLowerCase().includes("correct");

		console.log(
			`✅ Évaluation terminée en ${duration}s: ${
				isCorrect ? "CORRECT" : "INCORRECT"
			}`
		);

		return {
			isCorrect,
			feedback: response,
			confidence: isCorrect ? 0.9 : 0.8, // Score de confiance (futur usage)
		};
	} catch (error) {
		console.error(`❌ Erreur évaluation:`, error.message);

		// Fallback : évaluation basique
		return {
			isCorrect: userAnswer.length > 10,
			feedback: "Évaluation automatique indisponible. Réponse enregistrée.",
			confidence: 0.5,
		};
	}
}

/**
 * Génère un indice pour aider l'utilisateur
 * @param {Object} note - Note source
 * @returns {Promise<string>} - Indice généré
 */
export async function generateHint(note) {
	const model = selectModel("hint", note);

	const prompt = `Donne UN indice court (1 phrase) pour aider à répondre à une question sur ce sujet :

${note.description}

Indice :`;

	try {
		console.log(
			`🤖 Génération indice (provider: ${AI_PROVIDER}, model: ${model})`
		);
		const startTime = Date.now();

		const hint = await generateText(model, prompt);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Indice généré en ${duration}s`);

		return hint;
	} catch (error) {
		console.error(`❌ Erreur génération indice:`, error.message);
		return "Relisez attentivement le contexte de la note.";
	}
}

// =====================
// CONFIGURATION ET STATS
// =====================

/**
 * Retourne la configuration actuelle
 * @returns {Object} - Configuration
 */
export function getAIConfig() {
	return {
		provider: AI_PROVIDER,
		models: MODELS_CONFIG[AI_PROVIDER],
		timeout: TIMEOUTS[AI_PROVIDER],
		hasApiKey: !!API_KEYS[AI_PROVIDER],
	};
}

/**
 * Change le provider IA (pour page Paramètres future)
 * @param {string} newProvider - Nouveau provider
 */
export function setAIProvider(newProvider) {
	if (!MODELS_CONFIG[newProvider]) {
		throw new Error(`Provider non supporté: ${newProvider}`);
	}
	process.env.AI_PROVIDER = newProvider;
	console.log(`⚙️ Provider IA changé: ${newProvider}`);
}

// =====================
// FONCTIONS LEGACY (compatibilité)
// =====================

export function pickModel(note) {
	return selectModel("generation", note);
}

export function buildPrompt(note) {
	const titlePart = note.title ? `Contexte / titre : ${note.title}\n\n` : "";
	return `Tu es un examinateur. Utilise la description suivante pour créer une question qui teste la compréhension ou la mémorisation. Réponds uniquement avec la question, puis attends la réponse utilisateur.\n\n${titlePart}Description : ${note.description}\n\n.`;
}

export function pickModelForTask(note, task) {
	return selectModel(task, note);
}
