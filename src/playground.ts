
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as ndjson from 'ndjson';
import { MD5 } from 'crypto-js';
import * as rimraf from 'rimraf';

import { copyDirectory, copyMissingFiles, copyIfMissing } from 'util/file';


export class PlaygroundInitializationError extends Error {
}


function quoteString(string: string): string {
	const escapedString = string.replace('"', '\\"');
	return `"${escapedString}"`;
}


export default class Playground {

	private readonly _filePath: string;
	private readonly _templatePath: string;
	private readonly _scratchPath: string; // Path to store temporary files

	constructor(filePath: string, storagePath: string, templatePath: string) {
		this._filePath = filePath;
		this._templatePath = templatePath;

		const scratchPath = path.join(storagePath, `swift-playground-${MD5(this._filePath).toString()}`);
		if (!fs.existsSync(scratchPath)) {
			fs.mkdirSync(scratchPath);
		}
		this._scratchPath = scratchPath;
	}

	public run(callback: (json: JSON) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("Creating playground", this._scratchPath);

			// Delete any existing directory (recursively)
			rimraf.sync(this._scratchPath);
			// if (!fs.existsSync(this._scratchPath)) {
				// TODO: Find out why directory sometimes still exists after rimraf. Probably because it is protected for VSCode extensions?
				fs.mkdirSync(this._scratchPath);
			// }

			// Copy all playground files to scratch folder
			// TODO: This is rather inefficient. Find a better way. Maybe links?
			copyDirectory(this._filePath, this._scratchPath);

			// `swiftc` allows top-level expressions only when the file is called 'main.swift'
			const contentsFilePath = path.join(this._filePath, 'Contents.swift');
			const mainFilePath = path.join(this._scratchPath, 'Sources/main.swift');
			if (!copyIfMissing(contentsFilePath, mainFilePath)) {
				// main.swift exists. It shouldn't
				throw new PlaygroundInitializationError("main.swift file in Sources is not allowed");
			}

			// Copy non-existing files in playground from template folder
			copyMissingFiles(this._templatePath, this._scratchPath);

			const flags = '';
			const compileCmd = `swift build \
-Xswiftc -Xfrontend -Xswiftc -debugger-support \
-Xswiftc -Xfrontend -Xswiftc -playground \
${flags}`;

			// FIXME: Get executable path with `swift build --show-bin-path`
			// FIXME: Use JSON representation of Package.swift to find executable name
			const runCmd = ".build/debug/Playground";

			console.debug("Executing compile", compileCmd);
			cp.exec(compileCmd, {
				cwd: this._scratchPath
			}, (err, stdout, stderr) => {
				console.debug(err, stdout, stderr);

				if (stdout && stdoutCallback) { stdoutCallback(stdout); }
				if (stderr && stderrCallback) { stderrCallback(stderr); }
				if (err) {
					reject(err);
					return;
				}

				console.debug("Executing run", runCmd);
				// `child.stdio` is misspecified in Typescript as a tuple of fixed length, so we cast `child` to any
				const child = cp.spawn(runCmd, [], { cwd: this._scratchPath, shell: true, stdio: [null, 'pipe', 'pipe', 'pipe'] }) as any;

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