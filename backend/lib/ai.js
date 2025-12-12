// Helpers pour construire le prompt et sélectionner l'IA
export function pickIA(aiArray) {
	if (!Array.isArray(aiArray) || aiArray.length === 0) return null;
	return aiArray[0];
}

export function buildPrompt(note) {
	const titlePart = note.title ? `Contexte / titre : ${note.title}\n\n` : "";
	return `Tu es un examinateur. Utilise la description suivante pour créer une question qui teste la compréhension ou la mémorisation. Réponds uniquement avec la question, puis attends la réponse utilisateur.\n\n${titlePart}Description : ${note.description}\n\n.`;
}
