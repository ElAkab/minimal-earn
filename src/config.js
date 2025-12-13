// Module de gestion de la configuration partagé
import { showToast } from "./toast.js";

const API_URL = "http://localhost:5000/api";

// =====================
// Charger la configuration
// =====================
export async function loadConfig() {
	try {
		const response = await fetch(`${API_URL}/config`);
		const config = await response.json();
		return config;
	} catch (error) {
		console.error("Error loading config:", error);
		return null;
	}
}

// =====================
// Mettre à jour la configuration
// =====================
export async function updateConfig(config) {
	try {
		const response = await fetch(`${API_URL}/config`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(config),
		});

		if (!response.ok) throw new Error("Erreur lors de la mise à jour");

		return await response.json();
	} catch (error) {
		console.error("Error updating config:", error);
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
		console.warn(`Toggle element with id "${toggleElementId}" not found`);
		return;
	}

	// Charger l'état initial
	const config = await loadConfig();
	if (config) {
		toggle.checked = config.interrogationsEnabled;
		console.log("Interrogations enabled:", config);
	}

	// Écouter les changements
	// "change" plutôt que "click" pour capturer tous les changements d'état
	toggle.addEventListener("change", async (e) => {
		try {
			await updateConfig({ interrogationsEnabled: e.target.checked });

			showToast(
				e.target.checked
					? "Interrogations activées"
					: "Interrogations désactivées",
				"success"
			);

			// Callback optionnel pour réagir au changement
			if (onChangeCallback) {
				await onChangeCallback(e.target.checked);
			}
		} catch (error) {
			console.error("Error toggling interrogations:", error);
			showToast("Erreur lors de la mise à jour", "error");
			// Rétablir l'état précédent
			e.target.checked = !e.target.checked;
		}
	});
}

// =====================
// Charger les notes dues
// =====================
export async function loadDueNotes() {
	try {
		const response = await fetch(`${API_URL}/due-notes`);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error loading due notes:", error);
		throw error;
	}
}
