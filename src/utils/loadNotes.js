// =====================
// Récupération des notes
// =====================
export async function loadNotes() {
	try {
		const response = await fetch("http://localhost:3000/api/notes");

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log(`📚 ${data.count} notes chargées :`, data.notes);

		console.log("Détails des notes :", data);
		return data.notes;
	} catch (error) {
		console.error("❌ Erreur lors du chargement des notes:", error);
		return [];
	}
}
