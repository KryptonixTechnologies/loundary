import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db/client.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(root, 'backups'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!process.env.DATABASE_URL?.startsWith('file:')) {
  throw new Error('The built-in backup command supports the local SQLite deployment only.');
}

await fs.mkdir(backupDir, { recursive: true });
const target = path.join(backupDir, `open-doors-${stamp}.db`);
const escaped = target.replaceAll("'", "''");
await prisma.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
await prisma.$disconnect();
console.log(target);
