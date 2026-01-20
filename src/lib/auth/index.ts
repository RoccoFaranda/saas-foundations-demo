// Auth.js configuration and handlers
export { handlers, auth, signIn, signOut } from "./config";

// Session helpers
export {
  getCurrentUser,
  requireUser,
  requireVerifiedUser,
  isAuthenticated,
  isEmailVerified,
  type SessionUser,
} from "./session";

// Token utilities
export {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  createEmailChangeToken,
  verifyEmailChangeToken,
} from "./tokens";

// Email utilities
export {
  getEmailAdapter,
  devEmailAdapter,
  testEmailAdapter,
  testEmailHelpers,
  type EmailMessage,
  type EmailAdapter,
} from "./email";
