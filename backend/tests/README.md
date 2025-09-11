# backend tests

These unit tests use [`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server) to spin up a temporary MongoDB instance. When the server is first created, the package downloads a MongoDB binary. This step **requires internet access**.

If you need to run the tests in an offline environment, pre-download the binary or set `DOWNLOAD_DIR` to a directory that already contains the binary. Alternatively, you can provide your own prebuilt MongoDB binary so that the tests do not attempt to download anything.

## Node version

Install dependencies using **Node 18 or newer**. Vite 7 pulls in Rollup 4 which installs a platform specific binary as an optional dependency. Older Node versions can cause the wrong binary to be selected and the build to fail.

Run the tests with:

```bash
npm install
npm test
```

### Troubleshooting

If you get build errors related to binary modules (for example after switching Node versions), delete the `node_modules` directory and `package-lock.json` file and then reinstall dependencies.
