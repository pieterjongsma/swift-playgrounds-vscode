
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as ndjson from 'ndjson';
import { MD5 } from 'crypto-js';
import * as rimraf from 'rimraf';

import { copyDirectory, copyMissingFiles, copyIfMissing } from 'util/file';
import { run, writableForCallback, promiseSequence } from 'util/child_process';
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
		copyDirectory(this._filePath, this._scratchPath);

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

	getBinPath(stdoutStream?: Writable | undefined, stderrStream?: Writable | undefined): Promise<string> {
		console.info("GET BIN PATH");

		const buffer = new WritableStreamBuffer();

		const cmd = "swift";
		const args = [
			"build",
			"--show-bin-path"
		];

		return run(cmd, args, {
			cwd: this._scratchPath
		}, [buffer])
		.then(() => buffer.getContentsAsString())
		.then(contents => {
			if (!contents) {
				throw new PlaygroundInitializationError("Failed to run Playground");
			}
			return contents;
		})
		.then(contents => contents.trim());
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

		return promiseSequence([
			() => this.getManifest(stdoutStream, stderrStream),
			() => this.getBinPath(stdoutStream, stderrStream),
		])
		.then(([manifest, binPath]) => {
			if (manifest.package.targets.length !== 1) {
				throw new PlaygroundManifestError("Playground Package.swift should contain a single target");
			}
			const target = manifest.package.targets[0];
			const runCmd = path.join(binPath, target.name);

			console.log("RUN");

			return run(
				runCmd,
				undefined,
				{
					cwd: this._scratchPath,
				},
				[stdoutStream, stderrStream, callbackStream]
			);
		});
	}

	public run(callback: (json: JSON) => void, stdoutCallback?: (output: string) => void, stderrCallback?: (output: string) => void): Promise<void> {
		return this.preparePackage()
		.then(() => {
			const stdoutStream = stdoutCallback ? writableForCallback(stdoutCallback) : undefined;
			const stderrStream = stderrCallback ? writableForCallback(stderrCallback) : undefined;

			return this.compile(stdoutStream, stderrStream);
		})
		.then(() => {
			const callbackStream = ndjson.parse();
			callbackStream.on('data', callback);
			const stdoutStream = stdoutCallback ? writableForCallback(stdoutCallback) : undefined;
			const stderrStream = stderrCallback ? writableForCallback(stderrCallback) : undefined;

			return this.execute(callbackStream, stdoutStream, stderrStream)
		});
	}
}