
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as ndjson from 'ndjson';
import { MD5 } from 'crypto-js';

import * as playgroundRuntime from './vscode_playground_runtime.swift';

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

	public run(callback: (json: JSON) => void, errorCallback: (error: any) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void) {
		const mainFilePath = path.join(this._scratchPath, 'main.swift');
		fs.copyFileSync(this._filePath, mainFilePath);

		const q = quoteString;
		const executable = path.join(this._scratchPath, 'main');
		const flags = '';
		const sources = '';
		const compileCmd = `swiftc \
-Xfrontend -debugger-support \
-Xfrontend -playground \
-module-name Playground \
${flags} \
-o ${q(executable)} \
${q(mainFilePath)} ${sources} ${q(path.join(this._extensionPath, this._buildFolder, playgroundRuntime))}`;
		const runCmd = `${q(executable)}`;

		console.log("Executing compile", compileCmd);
		cp.exec(compileCmd, (err, stdout, stderr) => {
			console.log(err, stdout, stderr);

			if (stdout && stdoutCallback) { stdoutCallback(stdout); }
			if (stderr && stderrCallback) { stderrCallback(stderr); }
			if (err) {
				errorCallback(err);
				return;
			}

			console.log("Executing run", runCmd);
			const child = cp.spawn(runCmd, [], { shell: true, stdio: [null, 'pipe', 'pipe', 'pipe'] }) as any;

			const fd = child.stdio[3]; // `.stdio` is misspecified as a tuple of fixed length
			if (!fd) { return; }

			if (stdoutCallback) { child.stdout.on('data', stdoutCallback); }
			if (stderrCallback) { child.stderr.on('data', stderrCallback); }
			fd.pipe(ndjson.parse()).on('data', callback);

			child.on('close', (code: any) => {
			});

			child.on('error', (error: any) => {
				errorCallback(error);
				// FIXME: Bubble error up to caller
			});
		});
	}
}