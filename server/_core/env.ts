export const ENV = {
  cookieSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL || "",
  forgeApiUrl: process.env.FORGE_API_URL || "",
  forgeApiKey: process.env.FORGE_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production",
};
