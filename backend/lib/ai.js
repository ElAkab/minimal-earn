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

// Configuration des modèles IA par type de tâche
const AI_MODELS = {
	generation: {
		lightweight: "gpt-oss", // Génération pour notes générales
		code: "hir0rameel/qwen-claude", // Génération pour programmation
		fallback: "gpt-oss",
	},
	evaluation: {
		default: "gpt-oss", // Évaluation rapide (toujours léger)
		fallback: "gpt-oss",
	},
	hint: {
		default: "gpt-oss", // Indices rapides (toujours léger)
		fallback: "gpt-oss",
	},
};

// Ancienne configuration (deprecated, conservé pour compatibilité)
const MODELS = {
	lightweight: "gpt-oss",
	code: "hir0rameel/qwen-claude",
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

/**
 * Logger centralisé pour tracer les décisions IA
 * @param {string} task - Type de tâche
 * @param {string} model - Modèle sélectionné
 * @param {Object} metadata - Métadonnées additionnelles
 */
function logAIDecision(task, model, metadata = {}) {
	const timestamp = new Date().toISOString();
	const logEntry = {
		timestamp,
		task,
		model,
		...metadata,
	};

	console.log(`📊 [AI_DECISION] ${JSON.stringify(logEntry)}`);
}

// =====================
// Sélection intelligente du modèle
// =====================

/**
 * Sélectionne le modèle approprié selon la note ET la tâche
 * @param {Object} note - La note à analyser
 * @param {'generation'|'evaluation'|'hint'} task - Type de tâche IA
 * @returns {string} - Nom du modèle à utiliser
 */
export function pickModelForTask(note, task) {
	// Validation du paramètre task
	const validTasks = ["generation", "evaluation", "hint"];
	if (!validTasks.includes(task)) {
		console.warn(
			`⚠️ Tâche invalide: ${task}, utilisation de 'generation' par défaut`
		);
		task = "generation";
	}

	const taskModels = AI_MODELS[task];

	// Pour evaluation et hint : toujours utiliser le modèle par défaut (léger)
	if (task === "evaluation" || task === "hint") {
		console.log(
			`🎯 Tâche ${task} → Modèle léger par défaut: ${taskModels.default}`
		);
		logAIDecision(task, taskModels.default, {
			noteId: note.id,
			contentType: "n/a",
		});
		return taskModels.default;
	}

	// Pour generation : sélection dynamique selon le contenu
	// Vérifier si tag IA explicite pour code
	if (note.aiTags && note.aiTags.includes("hir0rameel/qwen-claude")) {
		console.log(
			`🎯 Tâche ${task} → Tag IA détecté → Modèle code: ${taskModels.code}`
		);
		logAIDecision(task, taskModels.code, {
			noteId: note.id,
			hasAiTags: true,
			contentType: "code",
		});
		return taskModels.code;
	}

	// Détecter mots-clés de programmation
	const programmingKeywords = [
		"javascript",
		"code",
		"function",
		"variable",
		"class",
		"programming",
		"développement",
		"algorithme",
	];

	const content = `${note.title || ""} ${note.description || ""}`.toLowerCase();
	const isProgramming = programmingKeywords.some((keyword) =>
		content.includes(keyword.toLowerCase())
	);

	if (isProgramming) {
		console.log(
			`🎯 Tâche ${task} → Contenu programmation détecté → Modèle code: ${taskModels.code}`
		);
		logAIDecision(task, taskModels.code, {
			noteId: note.id,
			hasAiTags: !!note.aiTags,
			contentType: "code",
		});
		return taskModels.code;
	}

	// Par défaut : modèle léger
	console.log(
		`🎯 Tâche ${task} → Contenu général → Modèle léger: ${taskModels.lightweight}`
	);
	logAIDecision(task, taskModels.lightweight, {
		noteId: note.id,
		hasAiTags: !!note.aiTags,
		contentType: "general",
	});
	return taskModels.lightweight;
}

/**
 * @deprecated Utiliser pickModelForTask() à la place
 * Conservé pour compatibilité avec les tests existants
 * Cette fonction sera supprimée dans une version future
 *
 * Choisit le modèle approprié selon le contenu de la note
 * @param {Object} note - La note à analyser
 * @returns {string} - Le nom du modèle à utiliser
 */
export function pickModel(note) {
	console.warn(
		"⚠️ pickModel() est deprecated, utiliser pickModelForTask() à la place"
	);
	return pickModelForTask(note, "generation");
}

// =====================
// Fonctions de test (développement)
// =====================

/**
 * Teste un modèle Ollama avec une question personnalisée
 * Utile pour vérifier que les modèles fonctionnent correctement
 *
 * @param {string} modelName - Nom du modèle à tester (ex: "gpt-oss", "hir0rameel/qwen-claude")
 * @param {string} question - Question à poser au modèle
 * @returns {Promise<Object>} - { success: boolean, response: string, duration: number, error?: string }
 *
 * @example
 * // Tester le modèle léger
 * await testModel("gpt-oss", "Qu'est-ce que JavaScript ?");
 *
 * // Tester le modèle code
 * await testModel("hir0rameel/qwen-claude", "Explique le concept de closure en JavaScript");
 */
export async function testModel(modelName, question) {
	console.log(`\n🧪 Test du modèle: ${modelName}`);
	console.log(`📝 Question: "${question}"`);
	console.log(
		`⏱️  Timeout configuré: ${
			OLLAMA_TIMEOUT === 0 ? "Désactivé" : `${OLLAMA_TIMEOUT / 1000}s`
		}`
	);
	console.log(`⏳ Envoi de la requête...\n`);

	const startTime = Date.now();

	try {
		const response = await withTimeout(
			() =>
				ollama.generate({
					model: modelName,
					prompt: question,
					stream: false,
				}),
			OLLAMA_TIMEOUT
		);

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		console.log(`✅ Réponse reçue en ${duration}s`);
		console.log(`\n📄 Réponse du modèle:\n${"=".repeat(50)}`);
		console.log(response.response.trim());
		console.log(`${"=".repeat(50)}\n`);

		return {
			success: true,
			response: response.response.trim(),
			duration: parseFloat(duration),
			model: modelName,
		};
	} catch (error) {
		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		console.error(`❌ Erreur après ${duration}s`);
		console.error(`   Type: ${error.message}`);
		console.error(`   Modèle: ${modelName}\n`);

		return {
			success: false,
			response: null,
			duration: parseFloat(duration),
			model: modelName,
			error: error.message,
		};
	}
}

// =====================
// Génération de question
// =====================

/**
 * Génère une question à partir d'une note via Ollama
 * @param {Object} note - La note source
 * @returns {Promise<{question: string, model: string}>} - Objet contenant la question générée et le modèle utilisé
 */
export async function generateQuestion(note) {
	const model = pickModelForTask(note, "generation");
	const titlePart = note.title ? `Titre : ${note.title}\n` : "";

	const prompt = `Tu es un examinateur pédagogique. Génère UNE question courte et précise pour tester la compréhension de l'utilisateur (en pleine phase d'apprentissage) en fonction de sa note.

	${titlePart}Contenu : ${note.description}

	Tu peux utiliser Markdown pour formater ta question (gras **texte**, italique *texte*, code \`code\`, listes, etc.).
	Réponds UNIQUEMENT avec la question, sans introduction ni explication.`;

	try {
		console.log(`🤖 [GENERATION] Note ${note.id} → Modèle: ${model}`);
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
		console.log(
			`✅ [GENERATION] Question générée (${duration}s) avec ${model}`
		);
		return {
			question: response.response.trim(),
			model: model,
		};
	} catch (error) {
		console.error(`❌ [GENERATION] Erreur avec ${model}:`, error.message);

		// Si erreur de timeout ou modèle introuvable, tenter le fallback
		if (
			model !== AI_MODELS.generation.fallback &&
			!error.message.includes("timeout")
		) {
			console.log(
				`🔄 [GENERATION] Tentative fallback: ${AI_MODELS.generation.fallback}`
			);
			try {
				const fallbackResponse = await withTimeout(
					() =>
						ollama.generate({
							model: AI_MODELS.generation.fallback,
							prompt,
							stream: false,
						}),
					OLLAMA_TIMEOUT
				);
				console.log(`✅ Question générée avec le modèle fallback`);
				return {
					question: fallbackResponse.response.trim(),
					model: AI_MODELS.generation.fallback,
				};
			} catch (fallbackError) {
				console.error(
					`❌ Erreur avec le modèle fallback:`,
					fallbackError.message
				);
			}
		}

		// Si tout échoue, retourner une question simple
		console.log(`⚠️ Utilisation de la question par défaut`);
		return {
			question: buildPrompt(note),
			model: AI_MODELS.generation.fallback,
		};
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
	// Créer un objet note minimal pour pickModelForTask
	const noteContext = { title: "", description: correctContext };
	const model = pickModelForTask(noteContext, "evaluation");

	const prompt = `Évalue cette réponse d'étudiant.

	Question : ${question}
	Contenu attendu : ${correctContext}
	Réponse de l'étudiant : ${userAnswer}

	Réponds en 2 lignes maximum :
	1. Première ligne : CORRECT ou INCORRECT  
	2. Explication courte (tu peux utiliser Markdown : **gras**, *italique*, \`code\`)`;

	try {
		console.log(
			`🤖 [EVALUATION] Question: "${question.substring(
				0,
				50
			)}..." → Modèle: ${model}`
		);
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
			`✅ [EVALUATION] Résultat: ${
				isCorrect ? "CORRECT" : "INCORRECT"
			} (${duration}s) avec ${model}`
		);

		return {
			isCorrect,
			feedback: response.response.trim(),
		};
	} catch (error) {
		console.error(`❌ [EVALUATION] Erreur avec ${model}:`, error.message);

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
	const model = pickModelForTask(note, "hint");

	const prompt = `Donne UN indice court (1 phrase) pour aider à répondre à une question sur ce sujet :

${note.description}

Tu peux utiliser Markdown pour le formatage (**gras**, *italique*, \`code\`).
Indice :`;

	try {
		console.log(`🤖 [HINT] Note ${note.id} → Modèle: ${model}`);
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
		console.log(`✅ [HINT] Indice généré (${duration}s) avec ${model}`);
		return response.response.trim();
	} catch (error) {
		console.error(`❌ [HINT] Erreur avec ${model}:`, error.message);
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
