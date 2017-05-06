## Local setup

Assuming you have nodejs and npm installed.

- Clone repository
- Set the environment variable `PEERIO_STAGING_SOCKET_SERVER` if you want to connect to a different server.
- Run `npm install` -- if it fails maybe run `npm install` in `app/` first
- Run `npm start` to run a development build.

## Dependency management


... 


# UI Tests

Tests run with Spectron.

### Writing tests

In development builds, there is a tool available for recording clicks and inputs. You can run `recordUI()`, and then `stopRecording()`, which will print the results. There are at least a few caveats and pitfalls, documented in the code -- src/helpers/test-recorder.js

There are a few hooks available in test/helpers.js -- 

- `startApp` -- starts Spectron
- `startAppAndConnect` -- starts spectron and waits until the socket is connected
- `startAppAndLogin` -- the above, plus logs in (with a passphrase for CI reasons)
- `login` -- login minus starting the app and connecting
- `closeApp` -- cleans up, use as `afterEach` hook

### CI

Tests run on circleCI. However, the CI is very slow, so we hack the `login` function to wipe the passcode (if it exists). 

On the CI, tests on the branch `staging` are configured to run with the staging server.

### Local tests / VSCode debugger

To run and debug indvidual test files locally, make sure to compile sources first... and to set environment variables `PEERIO_DESKTOP_STAGING_TEST_USERNAME`, `PEERIO_DESKTOP_STAGING_TEST_PASSPHRASE`, `PEERIO_DESKTOP_PROD_TEST_USERNAME`, `PEERIO_DESKTOP_PROD_TEST_PASSPHRASE` in order to skip needing to create an account that will run the tests. 

To configure VSCode to run each individual test in the debugger, add the following configuration:

```json
{
    "type": "node",
    "request": "launch",
    "name": "Spectron",
    "console": "integratedTerminal",
    "cwd":"${workspaceRoot}",
    "program": "${workspaceRoot}/node_modules/mocha/bin/_mocha",
    "args": [
        "${relativeFile}",
        "--require=${workspaceRoot}/test/global-setup.js",
        "--colors",
        "--reporter=nyan"
    ]
}
```
