import  crypto from 'crypto';
export const timingEquals = (aHex: string, bHex: string) => {
    const a = Buffer.from(aHex, 'hex');
    const b = Buffer.from(bHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}