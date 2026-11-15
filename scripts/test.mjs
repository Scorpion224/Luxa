/**
 * Lance les tests de `tests/` avec le lanceur natif de Node.
 *
 * Le motif `tests/**\/*.test.mjs` n'est pas interprété par `node --test` avant
 * Node 21 : on énumère donc les fichiers nous-mêmes, ce qui fonctionne sur
 * toutes les versions supportées (Node 20 et suivantes) et sous Windows.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dossier = fileURLToPath(new URL('../tests/', import.meta.url));
const fichiers = readdirSync(dossier)
  .filter((nom) => nom.endsWith('.test.mjs'))
  .sort()
  .map((nom) => path.join(dossier, nom));

if (fichiers.length === 0) {
  console.error('Aucun fichier de test trouvé dans tests/');
  process.exit(1);
}

const resultat = spawnSync(process.execPath, ['--test', ...fichiers], { stdio: 'inherit' });
process.exit(resultat.status ?? 1);
