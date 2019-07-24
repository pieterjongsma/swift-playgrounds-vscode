
import * as path from 'path';
import * as fs from 'fs';

export function parentDirMatching(file: string, expression: RegExp): (string | null) {
	// FIXME: Implement this
	return path.dirname(file);
}

export function subtractParentPath(parentPath: string, aPath: string): string | null {
	const pComps = parentPath.split(path.sep);
	const comps = aPath.split(path.sep);
	while (true) {
		const pComp = pComps.shift();
		if (pComp === undefined) { break; }

		const comp = comps.shift();
		if (comp !== pComp) {
			return null;
		}
	}
	return path.join(...comps);
}

export function copyDirectory(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = targetDir + file.slice(sourceDir.length); // FIXME: Use subtract parent path function
		copyCreatingDirectories(file, targetFile);
	});
}

export function copyMissingFiles(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = targetDir + file.slice(sourceDir.length); // FIXME: Use subtract parent path function
		copyIfMissing(file, targetFile);
	});
}

export function copyIfMissing(sourceFile: string, targetFile: string): boolean {
	if (!fs.existsSync(targetFile)) {
		copyCreatingDirectories(sourceFile, targetFile);
		return true;
	}
	return false;
}

export function copyCreatingDirectories(sourceFile: string, targetFile: string) {
	createDirectoriesForFile(targetFile);
	fs.copyFileSync(sourceFile, targetFile);
}

export function createDirectoriesForFile(file: string) {
	const directory = path.dirname(file);
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

function readdirSyncRecursive(p: string, a: string[] = []): string[] {
	if (fs.statSync(p).isDirectory()) {
		fs.readdirSync(p).map(f => readdirSyncRecursive(a[a.push(path.join(p, f)) - 1], a));
	}
	return a;
}

function isFile(path: string): boolean {
	return !fs.statSync(path).isDirectory();
}
