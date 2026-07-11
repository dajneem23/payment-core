import { verifySignature } from './hmac.util';

describe('hmac.util', () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ paymentId: 'abc', status: 'SETTLED' });

    it('should verify a valid signature', () => {
        const { createHmac } = require('crypto');
        const signature = createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('hex');

        expect(verifySignature(body, signature, secret)).toBe(true);
    });

    it('should reject a tampered body', () => {
        const { createHmac } = require('crypto');
        const signature = createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('hex');

        const tamperedBody = JSON.stringify({ paymentId: 'xyz', status: 'SETTLED' });
        expect(verifySignature(tamperedBody, signature, secret)).toBe(false);
    });

    it('should reject an invalid signature', () => {
        expect(verifySignature(body, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject an empty signature', () => {
        expect(verifySignature(body, '', secret)).toBe(false);
    });

    it('should reject with wrong secret', () => {
        const { createHmac } = require('crypto');
        const signature = createHmac('sha256', 'wrong-secret')
            .update(body, 'utf8')
            .digest('hex');

        expect(verifySignature(body, signature, secret)).toBe(false);
    });
});
