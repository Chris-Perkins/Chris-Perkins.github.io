# Current work item

## CLN-01 — Remove game test files

Request: Clean up all test files while keeping core game files intact.

Acceptance: remove tests, browser/comparison/preview harnesses and fixtures from the project; remove scripts and current instructions that invoke them; preserve all nine core game files and all hosting/build inputs byte-for-byte.

Status: Basic explicit cleanup; no proposal/selection needed. One implementation writer and one fresh independent acceptance reviewer. Root owns tracking/docs/private evidence. Main SOURCE/TEST STOP received;79 test-only files and56 scripts removed. Root checks pass: all non-documentation/non-package inputs remain byte-identical; README contains no removed test commands. Candidate 7bf3f44befed7f56f1823d3a4ba4c212eb04f06460661f74c90893c77d30af48 frozen for one fresh reviewer. Validation: compare preserved-file hashes, inspect deletion inventory and package scripts.
