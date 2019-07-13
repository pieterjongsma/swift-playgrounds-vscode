
import * as path from 'path';
import * as fs from 'fs';

export function readdirSyncRecursive(p: string, a: string[] = []): string[] {
	if (fs.statSync(p).isDirectory()) {
		fs.readdirSync(p).map(f => readdirSyncRecursive(a[a.push(path.join(p, f)) - 1], a));
	}
	return a;
}
