# Welcome package v0

Run `npm run welcome:test` to execute the Node-only verifier suite. Verify a package with `npm run engram -- welcome verify --package <directory>`.

Manifests and parts are JSON/files on disk. `engramport-grant-v1` is RFC 8785 JSON Canonicalization Scheme serialization of the invitation `grant` object followed by SHA-256. Object keys are recursively sorted by UTF-16 code units as required by JCS, arrays preserve order, strings and finite JSON numbers use JSON serialization, and no insignificant whitespace is emitted. Part hashes cover raw bytes. The Ed25519 signature covers SHA-256 of the canonical manifest after removing only `signature.value`.

Tokens are never stored: invitation records contain only `token_sha256`. Key records contain public keys only.
