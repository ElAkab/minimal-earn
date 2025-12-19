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

// Récupère la note à réviser en fonction de la date de prochaine révision.
export function getNoteToReview(intensity) {
	const now = new Date().toISOString();

	console.log(`\n🔍 [Scheduler] Recherche de notes à réviser...`);
	console.log(`   📅 Date actuelle : ${now}`);
	console.log(
		`   🎯 Intensité demandée : ${intensity} (type: ${typeof intensity})`
	);

	// Vérifier combien de notes existent au total
	const totalNotes = db.prepare("SELECT COUNT(*) as count FROM Notes").get(); // Total de notes dans la DB
	console.log(`   📚 Total notes en DB : ${totalNotes.count}`);

	// Vérifier combien ont l'intensité demandée
	const notesWithIntensity = db
		.prepare("SELECT COUNT(*) as count FROM Notes WHERE intensity = ?")
		.get(intensity);
	console.log(
		`   🎯 Notes avec intensité ${intensity} : ${notesWithIntensity.count}`
	);

	// Vérifier les dates de révision
	const allNextReviewDates = db
		.prepare(
			"SELECT id, title, nextReviewDate, intensity FROM Notes WHERE intensity = ?"
		)
		.all(intensity);
	console.log(`   📆 Dates de révision pour intensité ${intensity}:`);
	allNextReviewDates.forEach((note) => {
		const isPast = note.nextReviewDate <= now;
		console.log(
			`      - Note ${note.id}: ${note.nextReviewDate} ${
				isPast ? "✅ (à réviser)" : "⏳ (futur)"
			}`
		);
	});

	// Requête principale
	const stmt = db.prepare(
		"SELECT id, title, content, easeFactor, currentInterval FROM Notes WHERE nextReviewDate <= ? AND intensity = ? ORDER BY nextReviewDate ASC LIMIT 5"
	); // Limite à 5 résultats pour éviter de surcharger la mémoire
	const notes = stmt.all(now, intensity);

	console.log(`   ✨ Résultat : ${notes.length} note(s) trouvée(s)\n`);

	return notes;
}

// Fonction de test pour visualiser la progression de l'intervalle
export function testScheduler() {
	// console.log("=== TEST SCHEDULER ===\n");

	let interval = 0;
	let easeFactor = 2.5;
	const results = [];

	const scenarios = [
		{ score: 5, description: "Parfait" },
		{ score: 4, description: "Bien" },
		{ score: 3, description: "Correct" },
		{ score: 2, description: "Oublié" },
		{ score: 4, description: "Bien (après oubli)" },
	];

	scenarios.forEach((test, index) => {
		// test = { score, description } et index = numéro de la révision (révision = index + 1)

		const result = calculateNextReview(test.score, interval, easeFactor);
		interval = result.interval;
		easeFactor = result.easeFactor;

		console.log(
			`Révision ${index + 1} - Score: ${test.score} (${test.description})`
		);

		console.log(`→ Prochain intervalle: ${interval} jour(s)`);
		console.log(`→ Ease Factor: ${easeFactor.toFixed(2)}\n`);

		results.push({
			revision: index + 1, // +1 car index commence à 0 (pour éviter de faire une révision 0)
			score: test.score,
			description: test.description,
			interval,
			easeFactor: parseFloat(easeFactor.toFixed(2)), // parseFloat pour éviter les chaînes de caractères
		});
	});

	return results;
}

// Conseil en System Design : Pour optimiser les requêtes, je te suggère de déplacer les champs nextReviewDate et easeFactor de la table Progression vers la table Notes. La table Progression garde l'historique (pour les statistiques), et la table Notes garde l'état ACTUEL de la révision. Cela simplifie ÉNORMÉMENT la requête getNoteToReview() !
