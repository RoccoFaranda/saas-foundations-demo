-- Drop Auth.js tables (if present) now that JWT sessions are used
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "verification_tokens";
