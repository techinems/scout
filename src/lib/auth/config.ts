export const authConfig = {
  get disabled() {
    return process.env.AUTH_DISABLED === "true";
  },
  get issuer() {
    return process.env.KEYCLOAK_ISSUER ?? "";
  },
  get clientId() {
    return process.env.KEYCLOAK_CLIENT_ID ?? "scout";
  },
  get clientSecret() {
    return process.env.KEYCLOAK_CLIENT_SECRET ?? "";
  },
  get requiredRole() {
    return process.env.KEYCLOAK_REQUIRED_ROLE ?? "scout-access";
  },
  get appUrl() {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  get sessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
    }
    return secret;
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  /** Synthetic identity used when AUTH_DISABLED=true. */
  devUser: {
    email: "dev@scout.local",
    name: "Dev User",
  },
} as const;
