// Logique de calcul de la date

/** 
    calculateNextReview(score, currentEase, currentInterval) : Prend en entrée le score de l'IA et l'historique de la note, puis calcule le nouveau nextReviewDate. (On utilisera une version simplifiée de l'algorithme SM-2 pour commencer).

    getNoteToReview() : Interroge la base de données pour trouver la note dont le nextReviewDate est le plus ancien ou qui est déjà passé.

    - score = qualifié de la réponse
    - interval = temps avant la prochaine révision
    - easeFactor = difficulté de la note 
**/
import db from "../db.js";

export function calculateNextReview(score, inteval, easeFactor) {
	let newEase = easeFactor;

	if (score < 3) {
		// Mauvaise réponse → punition
		newEase = Math.max(1.3, easeFactor - 0.2); // Diminuer l'ease factor mais pas en dessous de 1.3
		return {
			interval: 1,
			easeFactor: newEase,
		};
	}

	// Bonne réponse → ajuster l'intervalle
	const newInterval = Math.round(inteval * newEase);
	return {
		interval: newInterval,
		easeFactor: newEase,
	};
}

export function getNoteToReview() {
	// On utilise Promise pour une meilleure gestion asynchrone (node:sqlite est souvent basé sur des Callbacks/Promises)
	// Assumons que 'db' exporte des méthodes Promise comme .get() ou .all()

	const now = new Date().toISOString();

	// On cherche la note la plus ancienne dont la date de révision est passée (<= now)
	// On doit faire une jointure pour récupérer les infos de la Note ET de la dernière Progression.
	// Pour simplifier, on part du principe qu'on va chercher la Note ET le dernier enregistrement de Progression

	// Simplification pour l'instant : chercher toutes les notes (elles n'ont pas encore de nextReviewDate directement)
	// *Idéalement, on ajouterait 'nextReviewDate' et 'easeFactor' directement dans la table 'Notes' pour simplifier la requête.*

	// Nouvelle approche pour simplifier l'accès aux données :
	// On suppose que la table 'Notes' contient déjà 'nextReviewDate' et 'easeFactor' (meilleure pratique pour la performance).
	const note = db.get(
		"SELECT id, title, content FROM Notes WHERE nextReviewDate <= ? ORDER BY nextReviewDate ASC LIMIT 1",
		now
	);

	return note;
}

// Conseil en System Design : Pour optimiser les requêtes, je te suggère de déplacer les champs nextReviewDate et easeFactor de la table Progression vers la table Notes. La table Progression garde l'historique (pour les statistiques), et la table Notes garde l'état ACTUEL de la révision. Cela simplifie ÉNORMÉMENT la requête getNoteToReview() !
