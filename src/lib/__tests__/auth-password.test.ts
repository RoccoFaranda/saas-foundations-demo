// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "../auth/password";

describe("Password Utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      // Argon2 hashes start with $argon2
      expect(hash).toMatch(/^\$argon2/);
    });

    it("should produce different hashes for same password", async () => {
      const password = "testpassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testpassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongpassword", hash);

      expect(isValid).toBe(false);
    });

    it("should reject invalid hash format", async () => {
      const isValid = await verifyPassword("anypassword", "invalid-hash");

      expect(isValid).toBe(false);
    });

    it("should reject empty password against valid hash", async () => {
      const hash = await hashPassword("testpassword123");

      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });
  });
});
