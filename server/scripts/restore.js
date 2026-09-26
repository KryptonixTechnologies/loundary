import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceArg = process.argv[2];
if (!sourceArg) throw new Error('Usage: npm run db:restore -- /absolute/path/to/backup.db');
if (!process.env.DATABASE_URL?.startsWith('file:')) throw new Error('The built-in restore command supports the local SQLite deployment only.');

const source = path.resolve(sourceArg);
const prismaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prisma');
const databasePath = path.resolve(prismaDir, process.env.DATABASE_URL.slice('file:'.length));
await fs.access(source);
await fs.copyFile(source, databasePath);
console.log(`Restored ${databasePath} from ${source}`);
