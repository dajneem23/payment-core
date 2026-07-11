import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify an HMAC-SHA256 signature using timing-safe comparison.
 * @param rawBody - The raw request body as a string.
 * @param signature - The signature header value (hex-encoded HMAC).
 * @param secret - The shared HMAC secret.
 * @returns true if the signature is valid, false otherwise.
 */
export function verifySignature(
    rawBody: string,
    signature: string,
    secret: string,
): boolean {
    try {
        const computed = createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('hex');

        const computedBuf = Buffer.from(computed, 'utf8');
        const signatureBuf = Buffer.from(signature, 'utf8');

        if (computedBuf.length !== signatureBuf.length) {
            return false;
        }

        return timingSafeEqual(computedBuf, signatureBuf);
    } catch {
        return false;
    }
}
