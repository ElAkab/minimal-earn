// Module de gestion de la configuration partagé
import { showToast } from "./toast.js";

const API_URL = "http://localhost:5000/api";

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
