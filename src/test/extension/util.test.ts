//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { parentDirMatching } from 'util/file';

// Defines a Mocha test suite to group tests of similar kind together
suite("Util Tests", function () {

    // Defines a Mocha unit test
    test("Parent dir matching", function() {
        const testcases: [string, string, string | null][] = [
            ["foo/bar.playground/blah", '.*\.playground', "foo/bar.playground"],
            ["foo/bar.playground/blah/bleep/bloop.swift", '.*\.playground', "foo/bar.playground"],
            ["foo/bar/blah", '.*\.playground', null],
            ["", '.+?', null],
            ["/", "foo", null]
        ];

        testcases.forEach(([file, pattern, expectedResult]) => {
            const result = parentDirMatching(file, new RegExp(pattern));
            assert.equal(
                expectedResult,
                result,
                `/${pattern}/ on '${file}' returned '${result}'`
            );
        });
    });
});