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
        path.join(__dirname, ".."), // FIXME: This is not what I expect (extension path)
        os.tmpdir()
        );

    playground.run(json => {
        console.log(json);
    }, error => {
        console.error(error);
    });
}
