// Module de gestion de la configuration partagé
import { showToast } from "./toast.js";

const API_URL = "http://localhost:5000/api";

// Cache des requêtes récentes pour éviter les appels redondants
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 secondes

/**
 * Effectue une requête API optimisée avec cache et gestion d'erreurs
 * @param {string} endpoint - Endpoint API (sans /api)
 * @param {Object} options - Options fetch
 * @param {boolean} useCache - Utiliser le cache (défaut: true pour GET)
 * @returns {Promise<any>} - Réponse JSON
 */
export async function apiRequest(endpoint, options = {}, useCache = true) {
	const url = `${API_URL}${endpoint}`;
	const cacheKey = `${options.method || "GET"}_${url}`;

	// Vérifier le cache pour les requêtes GET
	if (useCache && (!options.method || options.method === "GET")) {
		const cached = requestCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			console.log(`📦 Cache hit: ${endpoint}`);
			return cached.data;
		}
	}

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData.message || errorData.error || `HTTP ${response.status}`
			);
		}

		const data = await response.json();

		// Mettre en cache les requêtes GET réussies
		if (useCache && (!options.method || options.method === "GET")) {
			requestCache.set(cacheKey, {
				data,
				timestamp: Date.now(),
			});
		}

		return data;
	} catch (error) {
		console.error(`❌ API Error (${endpoint}):`, error);
		throw error;
	}
}

/**
 * Invalide le cache pour un endpoint spécifique
 * @param {string} endpoint - Endpoint à invalider
 */
export function invalidateCache(endpoint = null) {
	if (endpoint) {
		const url = `${API_URL}${endpoint}`;
		for (const key of requestCache.keys()) {
			if (key.includes(url)) {
				requestCache.delete(key);
			}
		}
	} else {
		requestCache.clear();
	}
}

// =====================
// Charger la configuration
// =====================
export async function loadConfig() {
	try {
		console.log("📡 Chargement de la configuration depuis l'API...");
		const response = await fetch(`${API_URL}/config`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const config = await response.json();
		console.log("✅ Configuration chargée:", config);
		return config;
	} catch (error) {
		console.error("❌ Erreur lors du chargement de la config:", error);
		// Retourner une config par défaut en cas d'erreur
		return { interrogationsEnabled: true };
	}
}

// =====================
// Mettre à jour la configuration
// =====================
export async function updateConfig(config) {
	try {
		console.log("📡 Mise à jour de la configuration:", config);
		const response = await fetch(`${API_URL}/config`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(config),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || "Erreur lors de la mise à jour");
		}

		const updatedConfig = await response.json();
		console.log("✅ Configuration mise à jour:", updatedConfig);
		return updatedConfig;
	} catch (error) {
		console.error("❌ Erreur lors de la mise à jour de la config:", error);
		throw error;
	}
}

// =====================
// Initialiser le toggle d'interrogations
// =====================
export async function initInterrogationsToggle(
	toggleElementId,
	onChangeCallback
) {
	const toggle = document.getElementById(toggleElementId);
	if (!toggle) {
		console.warn(`⚠️ Toggle element with id "${toggleElementId}" not found`);
		return;
	}

	console.log("🔧 Initialisation du toggle d'interrogations...");

	// Charger l'état initial depuis l'API
	const config = await loadConfig();
	if (config) {
		toggle.checked = config.interrogationsEnabled;
		console.log(
			`✅ Toggle initialisé: ${
				config.interrogationsEnabled ? "activé" : "désactivé"
			}`
		);
	}

	// Écouter les changements
	toggle.addEventListener("change", async (e) => {
		const newState = e.target.checked;
		console.log(
			`🔄 Changement du toggle: ${newState ? "activé" : "désactivé"}`
		);

		try {
			await updateConfig({ interrogationsEnabled: newState });

			showToast(
				newState
					? "✅ Interrogations activées"
					: "⏸️ Interrogations désactivées",
				"success"
			);

			// Callback optionnel pour réagir au changement
			if (onChangeCallback && typeof onChangeCallback === "function") {
				console.log("🔄 Exécution du callback...");
				await onChangeCallback(newState);
			}
		} catch (error) {
			console.error("❌ Erreur lors du changement de toggle:", error);
			showToast("❌ Erreur lors de la mise à jour", "error");
			// Rétablir l'état précédent en cas d'erreur
			e.target.checked = !newState;
		}
	});
}

// =====================
// Charger les notes dues
// =====================
export async function loadDueNotes() {
	try {
		console.log("📡 Chargement des notes dues...");
		const response = await fetch(`${API_URL}/due-notes`);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log(`✅ Notes dues chargées: ${data.due?.length || 0} note(s)`);
		return data;
	} catch (error) {
		console.error("❌ Erreur lors du chargement des notes dues:", error);
		throw error;
	}
}
