import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '.');

	return new Promise((resolve, reject) => {
		const files = glob.sync('**/**.test.js', { cwd: testsRoot });
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

		try {
			mocha.run((failures: number) => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}
