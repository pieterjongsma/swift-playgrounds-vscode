
test_playgrounds:
	npm run webpack
	node ./build/test_extension.js test "src/test/playgrounds/examples/**/*.playground"
