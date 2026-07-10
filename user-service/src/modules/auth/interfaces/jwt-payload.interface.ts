/**
 * JWT claims. RFC 7519 registered claims `iss`, `aud`, `iat`, `exp`, `jti` are
 * set by the signer (issuer/audience from config; jti via the `jwtid` option;
 * iat/exp automatically). We add two private claims:
 *   - `email`  — convenience for the caller identity
 *   - `type`   — 'access' | 'refresh' to stop a refresh token being used as an
 *                access token and vice-versa
 * `sub` (subject = user id) is what downstream services key off.
 */
export interface JwtPayload {
    sub: string;
    email: string;
    role: string; // 'USER' | 'ADMIN' — surfaced downstream as X-User-Role
    type: 'access' | 'refresh';
    jti?: string; // set by signer via jwtid
    iat?: number; // set by signer
    exp?: number; // set by signer
}
