//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { parentDirMatching } from 'util/file';
import { PLAYGROUND_REGEX } from 'playground';

// Defines a Mocha test suite to group tests of similar kind together
suite("Util Tests", function () {

    // Defines a Mocha unit test
    test("Parent dir matching", function() {
        const testcases: [string, RegExp, string | null][] = [
            ["foo/bar.playground/blah", PLAYGROUND_REGEX, "foo/bar.playground"],
            ["foo/bar.playground/blah/bleep/bloop.swift", PLAYGROUND_REGEX, "foo/bar.playground"],
            ["foo/bar/blah", PLAYGROUND_REGEX, null],
            ["", new RegExp('.+?'), null],
            ["/", new RegExp("foo"), null]
        ];

        testcases.forEach(([file, expression, expectedResult]) => {
            const result = parentDirMatching(file, expression);
            assert.equal(
                expectedResult,
                result,
                `${expression} on '${file}' returned '${result}'`
            );
        });
    });
});