
import * as path from 'path';
import * as fs from 'fs';

export function parentDirMatching(file: string, expression: RegExp): (string | null) {
	if (path.basename(file).match(expression)) {
		return file;
	} else if (path.basename(file) === file || path.dirname(file) === file) {
		// Reached the end. No match
		return null;
	} else {
		return parentDirMatching(path.dirname(file), expression);
	}
}

export function pathSiblingReplacingExtension(currentPath: string, extension: string): string {
    const currentExtension = path.extname(currentPath);
    const sibling = currentPath.slice(0, -currentExtension.length) + extension;
    return sibling;
}

export function copyDirectory(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = path.join(targetDir, path.relative(sourceDir, file));
		copyCreatingDirectories(file, targetFile);
	});
}

export function copyMissingFiles(sourceDir: string, targetDir: string) {
	const files = readdirSyncRecursive(sourceDir)
		.filter(isFile);
	files.forEach(file => {
		const targetFile = path.join(targetDir, path.relative(sourceDir, file));
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

export function readdirSyncRecursive(p: string, a: string[] = []): string[] {
	if (fs.statSync(p).isDirectory()) {
		fs.readdirSync(p).map(f => readdirSyncRecursive(a[a.push(path.join(p, f)) - 1], a));
	}
	return a;
}

export function isFile(path: string): boolean {
	return !fs.statSync(path).isDirectory();
}
