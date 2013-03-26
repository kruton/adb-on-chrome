JS_SRC=\
	./lib/Hydrate.js \
	./lib/jsbn/base64.js \
	./lib/jsbn/jsbn.js \
	./lib/jsbn/jsbn2.js \
	./lib/jsbn/prng4.js \
	./lib/jsbn/rng.js \
	./lib/jsbn/rsa.js \
	./lib/jsbn/rsa2.js \
	./src/adb-server.js \
	./src/auth-manager.js \
	./src/background.js \
	./src/devices.js \
	./src/monotonic.js \
	./src/tcp-server.js \
	./lib-test/sinon-1.6.0.js \
	./src-test/adb-server.test.js \
	./src-test/test-utils.js \

HTML_SRC=src/devices.html

MANIFEST=manifest.json

OUTPUT=adb-on-chrome.crx

$(OUTPUT): $(MANIFEST) $(HTML_SRC) $(JS_SRC)
	crxmake --pack-extension=. --extension-output=$@ \
		--pack-extension-key=adb-on-chrome.pem \
		--ignore-dir='(\.git|\.settings|dev-only|src-test|lib-test)' \
		--ignore-file='^\.|Makefile|jsTestDriver\.conf|\.pem$$'

clean:
	rm -f $(OUTPUT)