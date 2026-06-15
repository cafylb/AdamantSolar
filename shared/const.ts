export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

export const REQUIRE_LOGIN = false; // set to true to require login, false to bypass
export const TEST_USER_EMAIL = "AdamantSolar@gmail.com";

// Shared password required to access the sensitive REST API endpoints
// (referral admin, balance top-up, debug). Pass it via the "x-api-password"
// header, a "?password=" query parameter, or a "password" field in the body.
export const API_PASSWORD = "29011804didi";