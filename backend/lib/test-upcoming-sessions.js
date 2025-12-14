#!/usr/bin/env node

/**
 * Script de test pour les sessions à venir et les métriques de cache
 *
 * Usage:
 *   node test-upcoming-sessions.js
 *
 * Ce script teste :
 * - getUpcomingSessionNotes() pour une intensité
 * - getAllUpcomingSessions() pour toutes les intensités
 * - Affichage des métriques de cache
 */

import * as sessionScheduler from "./sessionScheduler.js";
import * as questionCache from "./questionCache.js";
import * as dataStore from "./dataStore.js";

async function testUpcomingSessions() {
	console.log("🧪 Test des sessions à venir et métriques de cache\n");
	console.log("=".repeat(60));

	try {
		// Charger les notes
		const notes = await dataStore.readNotes();
		console.log(`\n📚 ${notes.length} note(s) chargée(s)`);

		// Test 1: Sessions à venir avec lookahead 24h
		console.log("\n\n📅 Test 1: Sessions à venir (24h lookahead)");
		console.log("-".repeat(60));

		const lookahead24h = 24 * 60 * 60 * 1000;
		const upcomingSessions = sessionScheduler.getAllUpcomingSessions(
			notes,
			lookahead24h
		);

		console.log(
			`\n✨ ${upcomingSessions.length} session(s) à venir dans les 24h:\n`
		);

		for (const session of upcomingSessions) {
			const hoursUntil = (session.timeUntil / (60 * 60 * 1000)).toFixed(2);
			console.log(`📌 Intensité: ${session.intensity}`);
			console.log(
				`   ⏰ Prochaine session: ${session.nextSession.toLocaleString(
					"fr-FR"
				)}`
			);
			console.log(`   ⏱️  Dans ${hoursUntil}h`);
			console.log(`   📝 ${session.notes.length} note(s) à réviser`);
			console.log(
				`   ✅ Dans la fenêtre: ${session.withinLookahead ? "Oui" : "Non"}`
			);

			// Vérifier le cache pour chaque note
			let cachedCount = 0;
			for (const note of session.notes) {
				const cached = await questionCache.getCachedQuestion(note.id);
				if (cached) cachedCount++;
			}

			console.log(
				`   💾 Questions en cache: ${cachedCount}/${session.notes.length}`
			);
			console.log("");
		}

		// Test 2: Sessions par intensité individuelle
		console.log("\n\n📊 Test 2: Sessions par intensité (lookahead 48h)");
		console.log("-".repeat(60));

		const lookahead48h = 48 * 60 * 60 * 1000;
		const intensities = ["intensive", "moderate", "chill"];

		for (const intensity of intensities) {
			const sessionInfo = sessionScheduler.getUpcomingSessionNotes(
				notes,
				intensity,
				lookahead48h
			);
			const hoursUntil = sessionInfo.timeUntil
				? (sessionInfo.timeUntil / (60 * 60 * 1000)).toFixed(2)
				: "N/A";

			console.log(`\n🎯 ${intensity.toUpperCase()}`);
			console.log(
				`   Prochaine session: ${
					sessionInfo.nextSession?.toLocaleString("fr-FR") || "Aucune"
				}`
			);
			console.log(`   Dans: ${hoursUntil}h`);
			console.log(`   Notes: ${sessionInfo.notes.length}`);
			console.log(
				`   Dans fenêtre 48h: ${sessionInfo.withinLookahead ? "✅" : "❌"}`
			);
		}

		// Test 3: Métriques de cache
		console.log("\n\n📈 Test 3: Métriques de cache");
		console.log("-".repeat(60));

		const metrics = questionCache.getCacheMetrics();
		const stats = await questionCache.getCacheStats();

		console.log("\n💾 Statistiques du cache:");
		console.log(`   Total entrées: ${stats.totalEntries}`);
		console.log(`   Entrées valides: ${stats.validEntries}`);
		console.log(`   Entrées expirées: ${stats.expiredEntries}`);
		console.log(`   TTL: ${stats.ttlDays} jours`);

		console.log("\n📊 Métriques hit/miss:");
		console.log(`   Cache hits: ${metrics.hits}`);
		console.log(`   Cache misses: ${metrics.misses}`);
		console.log(`   Générations: ${metrics.generations}`);
		console.log(`   Total requêtes: ${metrics.totalRequests}`);
		console.log(`   Taux de hit: ${metrics.hitRate}%`);

		// Test 4: Simulation lookahead court (2h)
		console.log("\n\n⚡ Test 4: Sessions imminentes (2h lookahead)");
		console.log("-".repeat(60));

		const lookahead2h = 2 * 60 * 60 * 1000;
		const imminentSessions = sessionScheduler.getAllUpcomingSessions(
			notes,
			lookahead2h
		);

		if (imminentSessions.length > 0) {
			console.log(`\n🚨 ${imminentSessions.length} session(s) imminente(s):\n`);
			for (const session of imminentSessions) {
				const minutesUntil = (session.timeUntil / (60 * 1000)).toFixed(0);
				console.log(`   ⏰ ${session.intensity}: dans ${minutesUntil} minutes`);
			}
			console.log("\n💡 Recommandation: Déclencher pré-génération maintenant!");
		} else {
			console.log("\n✅ Aucune session imminente dans les 2h prochaines");
		}

		console.log("\n" + "=".repeat(60));
		console.log("✅ Tests terminés avec succès!\n");
	} catch (error) {
		console.error("\n❌ Erreur pendant les tests:", error);
		console.error(error.stack);
		process.exit(1);
	}
}

// Exécuter les tests
testUpcomingSessions();
