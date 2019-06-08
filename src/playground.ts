
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as ndjson from 'ndjson';
import { MD5 } from 'crypto-js';

import * as playgroundRuntime from './vscode_playground_runtime.swift';


function readdirSyncRecursive(p: string, a: string[] = []): string[] {
	if (fs.statSync(p).isDirectory()) {
		fs.readdirSync(p).map(f => readdirSyncRecursive(a[a.push(path.join(p, f)) - 1], a));
	}
	return a;
}

function subtractParentPath(parentPath: string, aPath: string): string | null {
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


function quoteString(string: string): string {
	const escapedString = string.replace('"', '\\"');
	return `"${escapedString}"`;
}

export default class Playground {

	private readonly _filePath: string;
	private readonly _extensionPath: string;
	private readonly _buildFolder: string = "build";
	private readonly _scratchPath: string; // Path to store temporary files

	constructor(filePath: string, extensionPath: string, storagePath: string) {
		this._filePath = filePath;
		this._extensionPath = extensionPath;

		const scratchPath = path.join(storagePath, `swift-playground-${MD5(this._filePath).toString()}`);
		if (!fs.existsSync(scratchPath)) {
			fs.mkdirSync(scratchPath);
		}
		this._scratchPath = scratchPath;
	}

	public run(callback: (json: JSON) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void): Promise<void> {
		return new Promise((resolve, reject) => {
			const parentDir = path.dirname(this._filePath);

			// `swiftc` allows top-level expressions only when the file is called 'main.swift'
			const mainFilePath = path.join(this._scratchPath, 'main.swift');
			fs.copyFileSync(this._filePath, mainFilePath);

			// Find sibling Sources directory and include the swift files in build
			const allFiles = readdirSyncRecursive(parentDir)
				.filter(file => fs.statSync(file).isFile()) // Filter out directories
				.map(file => subtractParentPath(parentDir, file))
				.filter(file => !!file) as string[]; // Remove nulls;

			// Match Sources files from all files in bundle. Not using a regex because of differences in path separators between systems
			const sources = allFiles
				.filter(file => {
					return file.split(path.sep)[0] === "Sources";
				}).filter(file => path.extname(file) === ".swift")
				.map(file => path.join(parentDir, file))
				.join(" ");

			// Copy Resources files into build folder
			const resources = allFiles
				.filter(file => {
					return file.split(path.sep)[0] === "Resources";
				});
			resources.forEach(file => {
				const fileWithoutResources = file.split(path.sep).slice(1); // File name without Resources folder
				fs.copyFileSync(path.join(parentDir, file), path.join(this._scratchPath, ...fileWithoutResources));
			});

			const q = quoteString;
			const executable = path.join(this._scratchPath, 'main');
			const flags = '';
			const compileCmd = `swiftc \
-Xfrontend -debugger-support \
-Xfrontend -playground \
-module-name Playground \
-working-directory ${parentDir} \
${flags} \
-o ${q(executable)} \
${q(mainFilePath)} ${sources} ${q(path.join(this._extensionPath, this._buildFolder, playgroundRuntime))}`;
			const runCmd = `${q(executable)}`;

			console.debug("Executing compile", compileCmd);
			cp.exec(compileCmd, (err, stdout, stderr) => {
				console.debug(err, stdout, stderr);

				if (stdout && stdoutCallback) { stdoutCallback(stdout); }
				if (stderr && stderrCallback) { stderrCallback(stderr); }
				if (err) {
					reject(err);
					return;
				}

				console.debug("Executing run", runCmd);
				// `child.stdio` is misspecified in Typescript as a tuple of fixed length, so we cast `child` to any
				const child = cp.spawn(runCmd, [], { shell: true, stdio: [null, 'pipe', 'pipe', 'pipe'] }) as any;

				const fd = child.stdio[3];
				if (!fd) { return; }

				if (stdoutCallback) { child.stdout.on('data', stdoutCallback); }
				if (stderrCallback) { child.stderr.on('data', stderrCallback); }
				fd.pipe(ndjson.parse()).on('data', callback);

				child.on('close', (code: number, signal: string) => {
					// This event is not handled. See 'exit' instead
				});

				child.on('disconnect', () => {
					console.log("Received disconnect event. Should not occur.");
				});

				child.on('error', (err: Error) => {
					reject(err);
				});

				child.on('exit', (code: number, signal: string) => {
					if (code) { reject(); }
					else { resolve(); }
				});
			});
		});
	}
}