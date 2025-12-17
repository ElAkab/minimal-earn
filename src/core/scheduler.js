// Logique de calcul de la date
import db from "../db.js";

/** 
    calculateNextReview(score, currentEase, currentInterval) : Prend en entrée le score de l'IA et l'historique de la note, puis calcule le nouveau nextReviewDate. (On utilisera une version simplifiée de l'algorithme SM-2 pour commencer).

    getNoteToReview() : Interroge la base de données pour trouver la note dont le nextReviewDate est le plus ancien ou qui est déjà passé.

    - score = qualité de la réponse
    - interval = temps (en jours) avant la prochaine révision
    - easeFactor = difficulté de la note 
**/

export function calculateNextReview(score, interval, easeFactor) {
	let newEase = easeFactor;

	if (score < 3) {
		// Mauvaise réponse → punition
		newEase = Math.max(1.3, easeFactor - 0.2); // Diminuer l'ease factor mais pas en dessous de 1.3
		return {
			interval: 1,
			easeFactor: newEase,
		};
		// Exemple : Si l'utilisateur a oublié la note, on réinitialise l'intervalle à 1 jour
	} else {
		// Score >= 3
		newEase = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)); // Formule SM-2 standard pour ajuster l'Ease (difficulté)
		newEase = Math.min(2.5, newEase); // Empêcher l'easeFactor de dépasser un maximum (ex: 2.5)

		// Calcul du nouvel intervalle (première fois : 1 jour, deuxième fois : 6 jours, puis intervalle * newEase)
		let newInterval;
		if (interval === 0) newInterval = 1; // Si c'est la première révision
		else if (interval === 1) newInterval = 6; // Si c'est la deuxième
		else newInterval = Math.round(interval * newEase);

		// Bonne réponse → ajuster l'intervalle
		return {
			interval: newInterval,
			easeFactor: newEase,
		};
	}
}

// Récupère la note à réviser en fonction de la date de prochaine révision
export function getNoteToReview(intensity) {
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

	// CORRECTION : Avec node:sqlite (mode synchrone), il faut utiliser .prepare().all()
	const stmt = db.prepare(
		"SELECT id, title, content, easeFactor, currentInterval FROM Notes WHERE nextReviewDate <= ? AND intensity = ? ORDER BY nextReviewDate ASC LIMIT 5"
	);
	const notes = stmt.all(now, intensity);
	// notes est maintenant un tableau de notes prêtes pour la révision

	return notes;
}

// Conseil en System Design : Pour optimiser les requêtes, je te suggère de déplacer les champs nextReviewDate et easeFactor de la table Progression vers la table Notes. La table Progression garde l'historique (pour les statistiques), et la table Notes garde l'état ACTUEL de la révision. Cela simplifie ÉNORMÉMENT la requête getNoteToReview() !
