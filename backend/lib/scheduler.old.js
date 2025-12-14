// Fonctions de scheduling et d'adaptation des intervalles
const MS = {
	hour: 3600 * 1000, // = 1 heure
	day: 24 * 3600 * 1000, // = 1 jour
	minute: 60 * 1000, // = 1 minute
	second: 1000, // = 1 seconde
};

// Renvoie l'intervalle de base en ms selon l'intensité
export function baseIntervalForIntensity(intensity) {
	switch (intensity) {
		case "chill":
			return 7 * MS.day; // weekly
		case "moderate":
			return 1 * MS.day; // daily
		case "intensive":
			return 6 * MS.hour; // a few times per day
		default:
			return 1 * MS.day;
	}
}

// Version test : intervalles courts pour tester rapidement les notifications
// Ne remplace pas la fonction principale, à utiliser uniquement pour les tests
export function baseIntervalForIntensityTest(intensity) {
	switch (intensity) {
		case "chill":
			return 5 * MS.minute; // 5 minutes au lieu de 7 jours
		case "moderate":
			return 2 * MS.minute; // 2 minutes au lieu de 1 jour
		case "intensive":
			return 30 * MS.second; // 30 secondes au lieu de 6 heures
		default:
			return 2 * MS.minute;
	}
}

// Calcule le prochain intervalle en fonction de l'intensité et de la correction. prevInterval = intervalle précédent en ms intensity = "chill" | "moderate" | "intensive" correct = booléen
export function computeNextInterval(prevInterval, intensity, correct) {
	const base = baseIntervalForIntensity(intensity); // ex: 1 jour pour "moderate"
	let interval = prevInterval || base; // si pas de précédent, on prend le base
	if (correct) {
		interval = Math.min(interval * 1.5, 365 * MS.day); // max 1 an
	} else {
		interval = Math.max(base * 0.5, interval * 0.6); // min base * 0.5 (50% du base). Ex: pour "moderate" min 12h
	}
	return Math.max(interval, MS.hour);
}

// Version test : utilise les intervalles courts pour tester
export function computeNextIntervalTest(prevInterval, intensity, correct) {
	const base = baseIntervalForIntensityTest(intensity);
	let interval = prevInterval || base;
	if (correct) {
		interval = Math.min(interval * 1.5, 60 * MS.minute); // max 1 heure en mode test
	} else {
		interval = Math.max(base * 0.5, interval * 0.6);
	}
	return Math.max(interval, 10 * MS.second); // min 10 secondes en mode test
}

// Calcule les métadonnées de scheduling après une revue. Renvoie un objet avec lastInterval, nextReviewAt, lastReviewed, reviewCount note = note existante correct = booléen
export function computeNextReview(note, correct) {
	const prevInterval =
		note.lastInterval || baseIntervalForIntensity(note.intensity);
	const nextInterval = computeNextInterval(
		prevInterval,
		note.intensity,
		correct
	);
	return {
		lastInterval: nextInterval,
		nextReviewAt: new Date(Date.now() + nextInterval).toISOString(),
		lastReviewed: new Date().toISOString(),
		reviewCount: (note.reviewCount || 0) + (correct ? 1 : 0),
	};
}

// Version test : utilise les intervalles courts pour tester rapidement
export function computeNextReviewTest(note, correct) {
	const prevInterval =
		note.lastInterval || baseIntervalForIntensityTest(note.intensity);
	const nextInterval = computeNextIntervalTest(
		prevInterval,
		note.intensity,
		correct
	);
	return {
		lastInterval: nextInterval,
		nextReviewAt: new Date(Date.now() + nextInterval).toISOString(),
		lastReviewed: new Date().toISOString(),
		reviewCount: (note.reviewCount || 0) + (correct ? 1 : 0),
	};
}
