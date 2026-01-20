// @vitest-environment node
import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema, emailSchema, passwordSchema } from "../validation/auth";

describe("Auth Validation Schemas", () => {
  describe("emailSchema", () => {
    it("should accept valid email", () => {
      const result = emailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("should lowercase email", () => {
      const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("should trim whitespace", () => {
      const result = emailSchema.safeParse("  test@example.com  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("should reject invalid email", () => {
      const result = emailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject email over 255 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("should accept valid password (8+ chars)", () => {
      const result = passwordSchema.safeParse("password123");
      expect(result.success).toBe(true);
    });

    it("should accept password exactly 8 characters", () => {
      const result = passwordSchema.safeParse("12345678");
      expect(result.success).toBe(true);
    });

    it("should reject password under 8 characters", () => {
      const result = passwordSchema.safeParse("short");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("8 characters");
      }
    });

    it("should reject password over 128 characters", () => {
      const result = passwordSchema.safeParse("a".repeat(129));
      expect(result.success).toBe(false);
    });

    it("should accept password exactly 128 characters", () => {
      const result = passwordSchema.safeParse("a".repeat(128));
      expect(result.success).toBe(true);
    });
  });

  describe("signupSchema", () => {
    it("should accept valid signup data", () => {
      const result = signupSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing email", () => {
      const result = signupSchema.safeParse({
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const result = signupSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("should reject weak password", () => {
      const result = signupSchema.safeParse({
        email: "test@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "anypassword",
      });
      expect(result.success).toBe(true);
    });

    it("should accept any non-empty password (validation happens in authorize)", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "x",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
