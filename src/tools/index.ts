
import * as os from 'os';
import * as program from 'commander';
import { inspect } from 'util';

import Playground from '../playground';

program
    .version('0.2.0');

program
    .command("run <file>")
    .description("Compiles and runs a Playground")
    .action(file => {
        console.log(`Building Playground ${file}`);
        const playground = playgroundForFile(file);

        playground.run(json => {
            console.log(json);
        })
        .then(() => {
            console.log("Playground executed succesfully");
        })
        .catch((err: any) => {
            console.error("Playground failed to execute", err);
        });
    });

program
    .command("manifest <file>")
    .description("Prints json representation of Playground manifest")
    .action(file => {
        console.log(`Manifest for Playground ${file}`);
        const playground = playgroundForFile(file);
        playground.preparePackage()
            .then(() => playground.getManifest())
            .then(manifest => console.dir(manifest, { depth: null }));
    });

program.parse(process.argv);

function playgroundForFile(file: string) {
    return new Playground(
        file,
        os.tmpdir(),
        "build/template.playground"
        );

}
