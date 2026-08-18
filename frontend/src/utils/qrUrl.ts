// QR encodes a URL so a phone camera / Google Lens opens the public verify page.
export const verifyUrl = (qr: string) => `${location.origin}/consumer/verify?qr=${encodeURIComponent(qr)}`;
