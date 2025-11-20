# TODOs

## Client Upgrade Tasks

- [ ] Update `npm run build-to-prod` script when upgrading the client
  - Current format: `node --openssl-legacy-provider node_modules/@angular/cli/bin/ng.js build --prod --outputPath='../gong_server/dist'`
  - May need to update based on Angular CLI version and Node.js compatibility requirements
  - previously was:     "build-to-prod": "NODE_OPTIONS=--openssl-legacy-provider ng build --prod --outputPath='../gong_server/dist'",
it better stay how it was.

