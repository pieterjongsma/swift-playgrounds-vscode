
import { assert, AssertionError } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as program from 'commander';
import * as glob from 'glob';
import { promisify } from 'util';
import chalk from 'chalk';

import Playground from 'playground';
import { pathSiblingReplacingExtension } from 'util/file';
import { promiseSequence } from 'util/child_process';


program
    .version('0.2.0');

program
    .command("test <pattern>")
    .description("Runs playground tests")
    .action(pattern => {
        const files = glob.sync(pattern);
        console.log(`Found ${files.length} playground files.`);

        const tasks = files.map(file => {
            return () => testPlayground(file).catch(error => {
                console.error(`Failed to run playground ${file}`);
                throw error;
            });
        });

        promiseSequence(tasks).then(results => {
            printSummary(results);
        }).catch(console.error);
    });

program
    .command("overwrite <pattern>")
    .description("Writes expected output files")
    .action(pattern => {
        const files = glob.sync(pattern);
        const tasks = files.map(file => {
            return () => testPlayground(file, true);
        });
        promiseSequence(tasks).then(_ => {
            console.log("Finished");
        });
    });

program.parse(process.argv);


async function playgroundOutput(playgroundFile: string): Promise<JSON[]> {
    let buffer: JSON[] = [];
    const playground = new Playground(playgroundFile, os.tmpdir(), "build/template.playground");
    await playground.run((json) => {
        buffer.push(json);
    }, (stdout: string) => {
        console.log(stdout);
    }, (stderr: string) => {
        console.error(stderr);
    });
    return buffer;
}


async function testPlayground(playgroundFile: string, overwriteExpectation: boolean = false): Promise<boolean> {
    try {
        const expectationFile = pathSiblingReplacingExtension(playgroundFile, ".expectation");
        const expectation = await promisify(fs.readFile)(expectationFile)
            .then(buffer => buffer.toString())
            .then(JSON.parse)
            .catch(_ => null);
        const output = await playgroundOutput(playgroundFile);

        if (overwriteExpectation || expectation === null) {
            fs.writeFileSync(expectationFile, JSON.stringify(output));
            if (expectation === null) {
                console.warn(chalk.yellow(`${playgroundFile}: Expectation not found. Written.`));
            }
        } else {
            assert.deepEqual(output, expectation, "Playground output did not match expectation.");
            console.log(chalk.green(`${playgroundFile}`));
        }
        return true;
    } catch(err) {
        if (err instanceof AssertionError) {
            console.error(chalk.red(`${playgroundFile}: ${err.message}`));
            return false;
        } else {
            throw err;
        }
    }
}


function printSummary(results: boolean[]) {
    const errors = results.filter(result => !result);
    
    console.log("\nFinished");
    if (errors.length > 0) {
        console.error(chalk.red("Some playgrounds failed. Please see results above."));
    } else {
        console.log(chalk.green("All playgrounds tested with no unexpected results."));
    }
}
