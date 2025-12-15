// SQLite : Créer deux tables pour stocker les notes et suivre la progression - Notes et Progression

import DatabaseSync from "node:sqlite";
// Recommandation : Utilise ':memory:' pour les tests rapides, ou un chemin de fichier (ex: 'data/flashcard.sqlite')
// pour un stockage persistant. Un chemin vide risque d'être interprété différemment selon le package.
const db = new DatabaseSync.Database("data/flashcard.sqlite"); // J'ai ajouté un chemin d'accès

// On utilise async/await ou .on('open') pour s'assurer que la connexion est prête
// et exec pour l'exécution synchrone est souvent déconseillée en production, mais pour un petit projet local ça passe.

// Création de la table Notes
db.exec(`
    CREATE TABLE IF NOT EXISTS Notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        intensity INTEGER,
        color TEXT,
        nextReviewDate DATETIME,
        easeFactor REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Création de la table Progression
db.exec(`
    CREATE TABLE IF NOT EXISTS Progression (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL, -- Référence à la note
        reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP, -- Date de la révision
        responseScore REAL NOT NULL, -- Score de la réponse (0-5)
        easeFactor REAL, -- Facteur de facilité
        FOREIGN KEY (note_id) REFERENCES Notes(id)
    );
`);

export default db;

// INTEGER : pour les nombres entiers
// TEXT : pour les chaînes de caractères
// DATETIME : pour les dates et heures
// DEFAULT CURRENT_TIMESTAMP : pour définir la valeur par défaut à la date et l'heure actuelles
// PRIMARY KEY : pour définir la clé primaire de la table (ça sert à identifier de manière unique chaque enregistrement dans la table. Exemple, on peut utiliser "id" comme clé primaire pour chaque note afin de les différencier les unes des autres)
// FOREIGN KEY : pour définir une clé étrangère qui référence une autre table (ça sert à établir une relation entre deux tables. Exemple, dans la table Progression, on utilise "note_id" comme clé étrangère pour faire référence à l'id de la table Notes, ce qui permet de lier chaque progression à une note spécifique). 1 - FOREIGN KEY = le point de liaison entre deux tables. 2 - On précise la colonne de la table actuelle (note_id) qui va servir de clé étrangère. 3 - On indique la table et la colonne référencée (Notes(id)) pour établir la relation grâce à FOREIGN KEY.
// REAL : pour les nombres à virgule)
