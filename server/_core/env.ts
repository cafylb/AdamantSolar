export const ENV = {
  cookieSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL || "",
  forgeApiUrl: process.env.FORGE_API_URL || "",
  forgeApiKey: process.env.FORGE_API_KEY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  appleClientId: process.env.APPLE_CLIENT_ID || "",
  appleTeamId: process.env.APPLE_TEAM_ID || "",
  appleKeyId: process.env.APPLE_KEY_ID || "",
  applePrivateKey: process.env.APPLE_PRIVATE_KEY || "",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
};
