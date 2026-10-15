# Reviewed scan exceptions

The bundled @peculiar ASN.1 libraries contain assignments to RecipientEncryptedKeys and PKCS8ShroudedKeyBag class names. Gitleaks generic-api-key mistakes these identifiers for secrets. The exceptions match only those class assignment expressions, not the runtime directory.

The Goja fixture contains a generated public key and one signed assertion for example.test. Its private key was generated temporarily in memory and was never saved. Only that exact signature value is allowlisted; the rest of the fixture and all other test files remain scanned.
