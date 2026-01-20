// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Mock the auth function
const mockAuth = vi.fn();
vi.mock("../auth/config", () => ({
  auth: () => mockAuth(),
}));

// Import after mocks are set up
import {
  getCurrentUser,
  requireUser,
  requireVerifiedUser,
  isAuthenticated,
  isEmailVerified,
} from "../auth/session";

describe("Auth Session Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
  });

  describe("getCurrentUser", () => {
    it("should return null when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return null when session has no user", async () => {
      mockAuth.mockResolvedValue({});
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return null when session user has no id", async () => {
      mockAuth.mockResolvedValue({ user: { email: "test@example.com" } });
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return user data when authenticated", async () => {
      const mockUser = {
        id: "user_123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: new Date("2026-01-01"),
      };
      mockAuth.mockResolvedValue({ user: mockUser });

      const user = await getCurrentUser();

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: mockUser.emailVerified,
      });
    });

    it("should handle user with null emailVerified", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          name: null,
          emailVerified: null,
        },
      });

      const user = await getCurrentUser();

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
        name: null,
        emailVerified: null,
      });
    });

    it("should treat missing emailVerified as null", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          name: "Test User",
        },
      });

      const user = await getCurrentUser();

      expect(user).toEqual({
        id: "user_123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
      });
    });
  });

  describe("requireUser", () => {
    it("should redirect to login when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("should return user when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          name: "Test",
          emailVerified: new Date(),
        },
      });

      const user = await requireUser();

      expect(user.id).toBe("user_123");
    });
  });

  describe("requireVerifiedUser", () => {
    it("should redirect to login when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireVerifiedUser()).rejects.toThrow("REDIRECT:/login");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("should redirect to verify-email when authenticated but not verified", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          emailVerified: null,
        },
      });

      await expect(requireVerifiedUser()).rejects.toThrow("REDIRECT:/verify-email");
      expect(mockRedirect).toHaveBeenCalledWith("/verify-email");
    });

    it("should return user when authenticated and verified", async () => {
      const verifiedDate = new Date("2026-01-01");
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          name: "Test",
          emailVerified: verifiedDate,
        },
      });

      const user = await requireVerifiedUser();

      expect(user.id).toBe("user_123");
      expect(user.emailVerified).toEqual(verifiedDate);
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    it("should return true when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_123", email: "test@example.com" },
      });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });
  });

  describe("isEmailVerified", () => {
    it("should return false when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const result = await isEmailVerified();
      expect(result).toBe(false);
    });

    it("should return false when authenticated but not verified", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user_123", email: "test@example.com", emailVerified: null },
      });

      const result = await isEmailVerified();

      expect(result).toBe(false);
    });

    it("should return true when authenticated and verified", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user_123",
          email: "test@example.com",
          emailVerified: new Date(),
        },
      });

      const result = await isEmailVerified();

      expect(result).toBe(true);
    });
  });
});
