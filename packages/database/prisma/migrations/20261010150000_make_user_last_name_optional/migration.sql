-- Le nom de famille devient facultatif : le prénom et l'identifiant restent
-- obligatoires, l'identité complète vivant sur la fiche Personne.
ALTER TABLE "User" ALTER COLUMN "lastName" DROP NOT NULL;
