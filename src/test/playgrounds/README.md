
# Playground testing

To ensure code changes don't unintentionally change the output of running a Playground, this extension has dedicated tests for Playground output. In these tests, we run sample Swift Playground file and compare the output to the stored, expected output. 

## Running the tests

You can run the tests as such

    npm run webpack
    node ./build/test_extension.js test "src/test/playgrounds/examples/**/*.playground"

It can take a while to run all the tests.

## Updating ouputs

In some cases, a change in Playground output is desired. To do this, we simply need to update the output files and check them into source control. This makes any changes in Playground output explicit in source control, which is nice.

To help in updating the output files there is a special command that, instead of comparing Playground output with stored expectations, overwrites the expectation files. The same command can be used to generate expecation files for new example Playgrounds.

    node ./build/test_extension.js overwrite "src/test/playgrounds/examples/**/*.playground"
