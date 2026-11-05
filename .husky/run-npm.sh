if [ "$OS" = "Windows_NT" ]; then
  exec node -e 'const path = require("node:path"); const cli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"); process.argv.splice(1, 0, cli); require(cli)' -- "$@"
fi

exec npm "$@"
