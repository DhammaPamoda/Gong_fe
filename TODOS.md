# TODOs

## Client Upgrade Tasks

- [ ] Update `npm run build-to-prod` script when upgrading the client
  - Current format: `node --openssl-legacy-provider node_modules/@angular/cli/bin/ng.js build --prod --outputPath='../gong_server/dist'`
  - May need to update based on Angular CLI version and Node.js compatibility requirements
  - previously was:     "build-to-prod": "NODE_OPTIONS=--openssl-legacy-provider ng build --prod --outputPath='../gong_server/dist'",
it better stay how it was.


in docker file, the user is hardcoded, not good for other centers.

2511/21.13:50:18:093 relayAndSoundManager[warn] : RelaysModule::constructor ft245rl module is not available. Relay functionality will be disabled. Please install FTDI drivers and rebuild the module if needed. .

