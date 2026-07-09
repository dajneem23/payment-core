/**
 * Claims we put in the JWT. `sub` (subject = user id) is the RFC 7519 registered
 * claim downstream services key off. `iss`/`aud`/`iat`/`exp` are added by
 * JwtService from config and validated on verify.
 */
export interface JwtPayload {
    sub: string; // user id
    iss: string; // issuer (user's email)
    jti?: string; // JWT ID (random UUID)
    iat?: number; // issued at (seconds since epoch)
}
