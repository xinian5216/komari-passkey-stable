# Komari Passkey Stable

Independent maintenance fork of [Akizon77/komari-passkey](https://github.com/Akizon77/komari-passkey), retaining Akizon77 attribution and the v0.1.13 baseline. See UPSTREAM.md and UPSTREAM_LICENSE_STATUS.md.

Requires Komari >=1.4.3, including the 1.5.0 Stable line. The verifier is bundled and runs using Komari's Node-compatible Goja modules; no external Node process is started by this version. Credentials and short-lived challenges are stored in data/plugin-data/komari-passkey/passkeys.json. Verified logins use the native sessions table.

This maintenance version bounds authentication requests and pending challenges. It preserves existing credentials, configuration keys, routes, secure defaults and native sessions. It does not change password or TOTP login.

Stored data is checked before use. Invalid JSON, unsupported store versions or malformed credentials return a recovery error without replacing the file. Preserve the original file and restore a verified backup, or use another sign-in method. Detailed plugin and verifier logs are off by default; temporarily enable debug_logging in plugin settings only when diagnosing a problem.

## Install or migrate

Back up the database and plugin data directory. Use the maintained market source or install the verified ZIP. Preserve plugin short komari-passkey and the existing data directory; do not uninstall first. Configure the correct RP ID and HTTPS origins. Keep password login available while verifying the new installation.

## Build and check

Use Node.js 22 for development: npm ci, then npm run verify. ZIP and SHA256SUMS are generated under dist/. Runtime does not require this development Node installation.

The source URL is https://raw.githubusercontent.com/xinian5216/komari-stable/stable/plugin-market/v1.json . See SECURITY.md for limits, permissions, private-site compatibility and rollback.
