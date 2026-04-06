#!/bin/sh
export PATH="/Users/design/.nvm/versions/node/v24.12.0/bin:$PATH"
export NODE="/Users/design/.nvm/versions/node/v24.12.0/bin/node"
cd /Users/design/permissionlabs/design-review
node ./node_modules/.bin/next dev --port 3000
