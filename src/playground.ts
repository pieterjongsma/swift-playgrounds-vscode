
import * as path from 'path';
import * as fs from 'fs';
import * as ndjson from 'ndjson';
import { MD5 } from 'crypto-js';
import * as rimraf from 'rimraf';

import { copyMissingFiles, copyIfMissing, readdirSyncRecursive, isFile, parentDirMatching } from 'util/file';
import { run, writableForCallback } from 'util/child_process';
import { Writable } from 'stream';
import { WritableStreamBuffer } from 'stream-buffers';


export const PLAYGROUND_REGEX = new RegExp('.*\.playground');


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

		const scratchPath = path.join(storagePath, `swift-playground-${MD5(this._filePath).toString()}`);
		if (!fs.existsSync(scratchPath)) {
			fs.mkdirSync(scratchPath);
		}
		this._scratchPath = scratchPath;
	}

	public async preparePackage(): Promise<void> {
		console.log("Preparing at", this._scratchPath);

		// Delete any existing directory (recursively)
		rimraf.sync(this._scratchPath);
		fs.mkdirSync(this._scratchPath);

		// Copy all playground files to scratch folder
		// TODO: This is rather inefficient. Find a better way. Maybe links?
		const files = readdirSyncRecursive(this._filePath)
			.filter(isFile)
			.filter(file => !parentDirMatching(file, new RegExp("^\.build$")))
			.filter(file => !parentDirMatching(file, new RegExp("^.*\.xcworkspace$")));
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
		console.info("GET MANIFEST");

		const buffer = new WritableStreamBuffer();

		const cmd = "swiftc";
		const args = [
			"--driver-mode=swift",
			"-L", "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/pm/4_2",
			"-lPackageDescription",
			"-I", "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/pm/4_2",
			"Package.swift",
			"-fileno", "3",
		];
		// const args: string[] = [];

		return run(cmd, args, {
			cwd: this._scratchPath,
			shell: true
		}, [stdoutStream, stderrStream, buffer])
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
		console.info("COMPILE");

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
		console.info("EXECUTE");

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