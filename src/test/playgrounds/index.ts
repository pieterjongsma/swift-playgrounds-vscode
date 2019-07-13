
import { assert, AssertionError } from 'chai';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as program from 'commander';
import * as glob from 'glob';
import { promisify } from 'util';
import chalk from 'chalk';

import Playground from 'playground';
import { isNull } from 'util';

program
    .version('0.1')

    .command("test <pattern>")
    .description("Runs playground tests")
    .action(pattern => {
        const files = glob.sync(pattern);
        console.log(`Found ${files.length} playground files.`);
        Promise.all(files.map(file => testPlayground(file))).then(results => {
            printSummary(results);
        });
    })

    .command("overwrite <pattern>")
    .description("Writes expected output files")
    .action(pattern => {
        const files = glob.sync(pattern);
        Promise.all(files.map(file => testPlayground(file, true))).then(_ => {
            console.log("Finished");
        });
    });

program.parse(process.argv);


function pathSiblingReplacingExtension(currentPath: string, extension: string): string {
    const currentExtension = path.extname(currentPath);
    const sibling = currentPath.slice(0, -currentExtension.length) + extension;
    return sibling;
}


async function playgroundOutput(playgroundFile: string): Promise<JSON[]> {
    var buffer: JSON[] = [];
    const playground = new Playground(playgroundFile, '.', os.tmpdir());
    await playground.run((json: JSON) => {
        buffer.push(json);
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
        console.log(chalk.green("All playgrounds tested with no unexpected results."))
    }
}
