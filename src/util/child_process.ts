
import * as cp from 'child_process';
import { Writable } from 'stream';


export class ChildProcessExitError extends Error {
	exitCode: number;

	constructor(exitCode: number, message?: string | undefined) {
		super(message);
		this.exitCode = exitCode;
	}
}

export class ChildProcessDisconnectError extends Error {
}

export class ChildProcessNotStringError extends Error {
}


export function quoteString(string: string): string {
	const escapedString = string.replace('"', '\\"');
	return `"${escapedString}"`;
}


export function writableForCallback(call: (data: string) => void): Writable {
	return new Writable({
		write(chunk, encoding, callback) {
			if (encoding) {
				if (encoding === 'buffer') {
					encoding = 'utf-8';
				}
				call(chunk.toString(encoding));
			} else {
				throw new ChildProcessNotStringError("Writable was expecting a string");
			}
			callback();
		}
	});
}


// Adaptation of https://decembersoft.com/posts/promises-in-serial-with-array-reduce/
export function promiseSequence(tasks: (() => Promise<any>)[]): Promise<any[]> {
    return tasks.reduce((promiseChain: Promise<any[]>, currentTask) => {
        return promiseChain.then(chainResults =>
            currentTask().then(currentResult =>
                [ ...chainResults, currentResult ]
            )
        );
    }, Promise.resolve([]));
}


export function simpleRun(
	command: string,
	args?: readonly string[] | undefined,
	options?: cp.ExecOptions | undefined,
	stdioStreams: (Writable | undefined)[] = []
	): Promise<void> {

    const commandWithArgs = [command, ...(args || [])].join(' ');

    return new Promise((resolve, reject) => {
		cp.exec(commandWithArgs, options, (err, stdout, stderr) => {
			const stdoutStream = stdioStreams[0];
			const stderrStream = stdioStreams[1];
			if (stdoutStream) {
				stdoutStream.write(stdout);
			}
			if (stderrStream) {
				stderrStream.write(stderr);
			}
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}


export function run(
	command: string,
	args?: readonly string[] | undefined,
	options?: cp.SpawnOptions | undefined,
	stdioStreams: (Writable | undefined)[] = []
	): Promise<void> {

	return new Promise((resolve, reject) => {
		if (!options) { options = {}; }
		options.stdio = [null, ...stdioStreams.map(stream => {
			if (stream) { return 'pipe'; }
			return null;
		})];
		const child = cp.spawn(command, args, options) as any;

		stdioStreams.forEach((stream, index) => {
			if (stream) {
				const stdioIndex = index + 1; // index 0 is stdin
				child.stdio[stdioIndex].pipe(stream);
			}
		});

		child.once('close', (code: number, signal: string) => {
			// This event is not handled. See 'exit' instead
		});

		child.once('disconnect', () => {
			reject(new ChildProcessDisconnectError());
		});

		child.once('error', (err: Error) => {
			reject(err);
		});

		child.once('exit', (code: number, signal: string) => {
			if (code) { reject(new ChildProcessExitError(code, signal)); }
			else { resolve(); }
		});
	});
}
