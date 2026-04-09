
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ndjson from 'ndjson';

import { copyMissingFiles, copyIfMissing, readdirSyncRecursive, isFile, parentDirMatching } from 'util/file';
import { run, simpleRun, writableForCallback } from 'util/child_process';
import { Writable } from 'stream';
import { WritableStreamBuffer } from 'stream-buffers';


export const PLAYGROUND_REGEX = new RegExp('.*\\.playground');


export class PlaygroundInitializationError extends Error {
}

export class PlaygroundManifestError extends Error {
}


export default class Playground {

	private readonly _filePath: string; // Path to .playground
	private readonly _templatePath: string; // Path of template .playground with Package.swift etc.
	private readonly _scratchPath: string; // Path to store temporary files

	constructor(filePath: string, storagePath: string, templatePath: string) {
		this._filePath = filePath;
		this._templatePath = templatePath;

		const hash = crypto.createHash('md5').update(this._filePath).digest('hex');
		const scratchPath = path.join(storagePath, `swift-playground-${hash}`);
		if (!fs.existsSync(scratchPath)) {
			fs.mkdirSync(scratchPath);
		}
		this._scratchPath = scratchPath;
	}

	public async preparePackage(): Promise<void> {
		console.log("Preparing Playground at", this._scratchPath);

		// Delete any existing directory (recursively)
		fs.rmSync(this._scratchPath, { recursive: true, force: true });
		fs.mkdirSync(this._scratchPath);

		// Copy all playground files to scratch folder
		// TODO: This is rather inefficient. Find a better way. Maybe links?
		const files = readdirSyncRecursive(this._filePath)
			.filter(isFile)
			.filter(file => !parentDirMatching(file, new RegExp("^\\.build$")))
			.filter(file => !parentDirMatching(file, new RegExp("^.*\\.xcworkspace$")));
		files.forEach((file: string) => {
			const targetFile = path.join(this._scratchPath, path.relative(this._filePath, file));
			copyIfMissing(file, targetFile);
		});

		// `swiftc` allows top-level expressions only when the file is called 'main.swift'
		const contentsFilePath = path.join(this._filePath, 'Contents.swift');
		const mainFilePath = path.join(this._scratchPath, 'Sources', 'main.swift');
		if (!copyIfMissing(contentsFilePath, mainFilePath)) {
			// main.swift exists. It shouldn't
			throw new PlaygroundInitializationError("main.swift file in Sources is not allowed");
		}

		// Copy non-existing files in playground from template folder
		copyMissingFiles(this._templatePath, this._scratchPath);
	}

	public getManifest(stdoutStream?: Writable | undefined, stderrStream?: Writable | undefined): Promise<JSON> {
		const buffer = new WritableStreamBuffer();

		const cmd = "swift";
		const args = [
			"package", "dump-package"
		];

		return simpleRun(cmd, args, {
			cwd: this._scratchPath
		}, [buffer, stderrStream])
		.then(() => buffer.getContentsAsString())
		.then(contents => {
			if (!contents) {
				throw new PlaygroundInitializationError("Failed to run Playground");
			}
			return contents;
		})
		.then(JSON.parse);
	}

	compile(stdoutStream: Writable | undefined, stderrStream: Writable | undefined): Promise<void> {
		const cmd = "swift";
		const args = [
			"build",
			"-Xswiftc", "-Xfrontend", "-Xswiftc", "-debugger-support",
			"-Xswiftc", "-Xfrontend", "-Xswiftc", "-playground"
		];

		return run(
			cmd, args,
			{
				cwd: this._scratchPath
			},
			[stdoutStream, stderrStream]
		);
	}

	execute(callbackStream: Writable, stdoutStream: Writable | undefined, stderrStream: Writable | undefined): Promise<void> {
		const cmd = "swift";
		const args = [
			"run",
			"-Xswiftc", "-Xfrontend", "-Xswiftc", "-debugger-support",
			"-Xswiftc", "-Xfrontend", "-Xswiftc", "-playground"
		];

		return run(
			cmd, args,
			{
				cwd: this._scratchPath
			},
			[stdoutStream, stderrStream, callbackStream]
		);
	}

	public run(callback: (json: JSON) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void): Promise<void> {
		return this.preparePackage()
		.then(() => {
			const callbackStream = ndjson.parse();
			callbackStream.on('data', callback);
			const stdoutStream = stdoutCallback ? writableForCallback(stdoutCallback) : undefined;
			const stderrStream = stderrCallback ? writableForCallback(stderrCallback) : undefined;

			return this.execute(callbackStream, stdoutStream, stderrStream);
		});
	}
}
