
import * as path from 'path';
import * as fs from 'fs';

export function copyDirectory(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = targetDir + file.slice(sourceDir.length);
		copyCreatingDirectories(file, targetFile);
	});
}

export function copyMissingFiles(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = targetDir + file.slice(sourceDir.length);
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
	fs.mkdirSync(directory, { recursive: true });
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
