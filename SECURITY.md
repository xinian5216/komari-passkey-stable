# Security and releases

Report vulnerabilities privately to the repository owner. Never post live credentials or private deployment details in public issues.

Both upstream plugins need administrator-level system RPC. A custom source controls distribution; it does not reduce those runtime privileges. Only install reviewed releases.

Releases require passing type checks, regression tests, production dependency audit and secret scanning. The release workflow builds from the selected immutable tag and refuses to overwrite a release. CI actions are pinned to commits. Upstream updates require review.

Authentication endpoints are limited to 20 requests per source and 120 globally per 60-second window; pending persistent challenges are capped at 128. The global budget remains effective with spoofed proxy headers. Protect the reverse proxy as well. Configure an explicit RP ID and HTTPS origins. Retain a working password/recovery path: private-site mode can block the upstream anonymous Passkey routes.

Back up the Komari database and data/plugin-data/komari-passkey/ before switching versions. Use the same plugin short to preserve data; do not uninstall or delete its data as a migration step. Rollback by reinstalling a verified previous ZIP after backing up. Avoid reinstalling an official-source copy over this maintained version.

New releases are assembled as drafts and published only after all verified assets are uploaded. GitHub immutable releases protect newly published tags and assets when enabled; previously published releases are not retroactively locked.
