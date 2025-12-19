// =====================
// Récupération des notes
// =====================
/**
 * Charge les notes depuis l'API
 * @param {string} intensity - Intensité à filtrer (optionnel: "1", "2", "3" ou "all")
 * @returns {Promise<Array>} Liste des notes
 */
export async function loadNotes(intensity = "") {
	try {
		const url =
			intensity && intensity !== "all"
				? `http://localhost:3000/api/notes?intensity=${intensity}`
				: "http://localhost:3000/api/notes";

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		const filterText =
			intensity && intensity !== "all"
				? ` (intensité ${intensity})`
				: " (toutes)";
		console.log(`📚 ${data.count} notes chargées${filterText}`);

		return data.notes;
	} catch (error) {
		console.error("❌ Erreur lors du chargement des notes:", error);
		return [];
	}
}
