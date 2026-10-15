# Maintenance rules

Read UPSTREAM.md, upstream.json, README.md and SECURITY.md first.

Preserve upstream attribution, original history, plugin short, configuration keys, existing data formats and public routes. Only make necessary fixes. Never add execution, listening or unrestricted filesystem permissions. Never merge upstream main automatically.

Before release run npm ci, npm run verify, npm audit --omit=dev, a full-history secret scan, package inspection and a real Komari Goja runtime compatibility check. Released tags and assets are immutable. Do not store real credentials, private endpoints or user data in this repository or tests. Do not change production configuration without explicit authorization.

When repairing a bug, reproduce it with a failing test before the minimal fix. Keep migration and rollback instructions accurate.
