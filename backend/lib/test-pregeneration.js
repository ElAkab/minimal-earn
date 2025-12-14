#!/usr/bin/env node

/**
 * Script de test pour la pré-génération de questions
 *
 * Usage:
 *   node test-pregeneration.js
 *   node test-pregeneration.js --intensity=intensive
 *   node test-pregeneration.js --max=5
 */

import * as preGenerator from "./preGenerator.js";

// Parser les arguments
const args = process.argv.slice(2);
const options = {};

args.forEach((arg) => {
	if (arg.startsWith("--intensity=")) {
		options.intensities = [arg.split("=")[1]];
	} else if (arg.startsWith("--max=")) {
		options.maxQuestions = parseInt(arg.split("=")[1]);
	}
});

console.log("🧪 Test de pré-génération");
console.log("========================\n");

if (options.intensities) {
	console.log(`📊 Intensités: ${options.intensities.join(", ")}`);
}
if (options.maxQuestions) {
	console.log(`🔢 Limite: ${options.maxQuestions} questions`);
}
console.log("");

try {
	const report = await preGenerator.preGenerateForUpcomingSessions(options);

	console.log("\n📊 Rapport final:");
	console.log("================");
	console.log(`Statut: ${report.enabled ? "✅ Actif" : "❌ Désactivé"}`);
	console.log(`Durée: ${(report.duration / 1000).toFixed(2)}s`);
	console.log("");
	console.log("Statistiques:");
	console.log(`  Total: ${report.summary.total}`);
	console.log(`  💾 En cache: ${report.summary.cached}`);
	console.log(`  ✨ Générées: ${report.summary.generated}`);
	console.log(`  ❌ Échecs: ${report.summary.failed}`);
	console.log(`  ⏭️  Ignorées: ${report.summary.skipped}`);

	if (report.results.length > 0) {
		console.log("\nDétails des résultats:");
		report.results.forEach((result, index) => {
			const emoji = {
				cached: "💾",
				generated: "✨",
				failed: "❌",
				skipped: "⏭️",
			}[result.status];

			console.log(
				`  ${index + 1}. Note ${result.noteId}: ${emoji} ${result.status}`
			);
			if (result.duration) {
				console.log(`     ⏱️  ${result.duration}ms`);
			}
			if (result.model) {
				console.log(`     🤖 ${result.model}`);
			}
			if (result.error) {
				console.log(`     ⚠️  ${result.error}`);
			}
		});
	}

	if (report.error) {
		console.log("\n❌ Erreur globale:", report.error);
	}

	process.exit(report.summary.failed > 0 ? 1 : 0);
} catch (error) {
	console.error("\n💥 Erreur fatale:", error);
	process.exit(1);
}
