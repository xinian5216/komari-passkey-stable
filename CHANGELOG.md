# Changes

## 0.1.15-stable.1

- Validate stored credentials and challenges without rewriting invalid or unknown-version data.
- Return a clear recovery error when the credential store cannot be read.
- Disable detailed plugin and verifier logs by default; add an explicit debug setting.
- Explain recovery and request-limit errors in the English and Chinese interfaces.
- Patch the build-only brace-expansion dependency to 2.1.7 and audit development dependencies in CI.
- Publish complete draft releases before applying GitHub's immutable release protection.

## 0.1.14-stable.1

- Establish a separately maintained Stable fork from Akizon77/komari-passkey@v0.1.13.
- Add bounded request limits and a hard pending-challenge cap without changing credential storage.
- Lock independent build dependencies, validate deterministic release packages and retain original plugin identity.
