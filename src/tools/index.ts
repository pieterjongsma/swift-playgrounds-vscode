
import * as os from 'os';
import * as program from 'commander';

import Playground from '../playground';

program
    .command("run <file>")
    .description("Compiles and runs a Playground")
    .action(async file => {
        console.log(`Building Playground ${file}`);
        const playground = playgroundForFile(file);

        try {
            await playground.run(json => {
                console.log(json);
            }, (stdout: string) => {
                console.log(stdout);
            }, (stderr: string) => {
                console.error(stderr);
            });

            console.log("Playground executed succesfully");
        } catch(e) {
            console.error("Playground failed to execute", e);
            process.exit(1);
        }
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
