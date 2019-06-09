
import * as path from 'path';
import * as fs from 'fs-extra';
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


function ensureDirectory(path: string) {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
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
	private readonly _bundleDir: string;
	private readonly _extensionPath: string;
	private readonly _buildFolder: string = "build";
	private readonly _scratchPath: string; // Path to store temporary files

	constructor(filePath: string, extensionPath: string, storagePath: string) {
		this._filePath = filePath;
		this._bundleDir = path.dirname(this._filePath);
		this._extensionPath = extensionPath;

		const scratchPath = path.join(storagePath, `swift-playground-${MD5(this._filePath).toString()}`);
		if (!fs.existsSync(scratchPath)) {
			fs.mkdirSync(scratchPath);
		}
		this._scratchPath = scratchPath;
	}

	public get allPaths(): string[] {
		return readdirSyncRecursive(this._bundleDir)
			.map(file => subtractParentPath(this._bundleDir, file))
			.filter(file => !!file) as string[]; // Remove nulls
	}

	public get allFiles(): string[] {
		return readdirSyncRecursive(this._bundleDir)
			.filter(file => fs.statSync(file).isFile()) // Filter out directories
			.map(file => subtractParentPath(this._bundleDir, file))
			.filter(file => !!file) as string[]; // Remove nulls
	}

	public get sourcesFiles(): string[] {
		// Not using a regex because of differences in path separators between systems
		return this.allFiles
			.filter(file => {
				return file.split(path.sep)[0] === "Sources";
			})
			.filter(file => path.extname(file) === ".swift");
	}

	public get resourcesFiles(): string[] {
		return this.allFiles
			.filter(file => {
				return file.split(path.sep)[0] === "Resources";
			});
	}

	public get dependencyFiles(): string[] {
		return this.allPaths
			.filter(file => {
				return file.split(path.sep)[0] === "Dependencies";
			});
	}

	public get frameworkFiles(): string[] {
		return this.dependencyFiles
			.filter(file => path.extname(file) === ".framework");
	}

	public run(callback: (json: JSON) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void): Promise<void> {
		return new Promise((resolve, reject) => {
			const fullPath = (file: string) => path.join(this._bundleDir, file);
			const q = quoteString;

			// `swiftc` allows top-level expressions only when the file is called 'main.swift'
			const mainFilePath = path.join(this._scratchPath, 'main.swift');
			fs.copyFileSync(this._filePath, mainFilePath);

			// Find sibling Sources directory and include the swift files in build
			const sources = this.sourcesFiles.map(fullPath).join(" ");

			// Copy Resources files into build folder
			this.resourcesFiles.forEach(file => {
				const fileWithoutDir = file.split(path.sep).slice(1); // File name without Resources folder
				fs.copyFileSync(fullPath(file), path.join(this._scratchPath, ...fileWithoutDir));
			});

			// Copy frameworks ...
			const scratchFrameworkDirectory = path.join(this._scratchPath, "Dependencies");
			ensureDirectory(scratchFrameworkDirectory);
			this.frameworkFiles.forEach(file => {
				const fileWithoutDir = file.split(path.sep).slice(1); // File name without Resources folder
				fs.copySync(fullPath(file), path.join(scratchFrameworkDirectory, ...fileWithoutDir));
			});
			const frameworks = `-F ${q(scratchFrameworkDirectory)} ` + 
				this.frameworkFiles
				.map(frameworkPath => path.basename(frameworkPath, ".framework"))
				.map(framework => `-framework ${q(framework)}`)
				.join(' ');
			// ... and link them
			const linkerOptions = ['-rpath', q(scratchFrameworkDirectory)];
			const linker = linkerOptions.map(option => `-Xlinker ${option}`).join(' ');

			const executable = path.join(this._scratchPath, 'main');
			const flags = '';
			const compileCmd = `swiftc \
-Xfrontend -debugger-support \
-Xfrontend -playground \
-module-name Playground \
-working-directory ${this._bundleDir} \
${flags} \
${frameworks} \
${linker} \
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