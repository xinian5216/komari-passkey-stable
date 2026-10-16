# Upstream and maintenance boundary

Original: https://github.com/Akizon77/komari-passkey

Baseline: v0.1.13 (9ac8b9222c2eb40872a729010f18c5d44e7cec62). Original authorship and Git history are preserved.

This repository is maintained by xinian5216 for Komari Stable. It is not an official upstream release.

Changes: bound authentication request rates and pending challenges; validate stored data and disable detailed logs by default with an opt-in debug setting. Retain the existing credential file, routes, WebAuthn policies and native session format.

Build tooling: published plugin SDK/dev 1.4.3, locked dependencies, deterministic ZIP packaging, separate CI and explicit releases. No automatic upstream merges or releases.

Runtime minimum remains >=1.4.3. Do not import the Passkey main branch requiring Komari 1.6.0 into this 1.5.0-compatible line.

Versioning: the current market UI compares only numeric major/minor/patch. Increment the numeric patch for each subsequent maintenance release, rather than only changing the stable suffix. Published tags and assets must never be overwritten.
