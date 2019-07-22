import * as path from 'path';
import * as os from 'os';
import * as program from 'commander';

import Playground from '../playground';

program
    .version('0.1')
    .command("run <file>")
    .description("Compiles and runs a Playground")
    .action(file => {
        runPlayground(file);
    });

program.parse(process.argv);

function runPlayground(file: string) {
    console.log(`Building Playground ${file}`);
    const playground = new Playground(
        file,
        os.tmpdir()
        );

    playground.run(json => {
        console.log(json);
    })
    .then(() => {
        console.log("Playground executed succesfully");
    })
    .catch((err: any) => {
        console.error("Playground failed to execute", err);
    });
}
