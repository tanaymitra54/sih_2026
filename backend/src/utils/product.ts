/**
 * Removes the HMAC signature from a product before it is sent to any client.
 * The HMAC is a mint-time secret — if it leaks, anyone can reprint a valid QR.
 * Callers should re-attach the encoded `qr` string (which embeds the HMAC) only
 * where the caller is the manufacturer who minted it.
 */
export function publicProduct<T extends object>(p: T): Omit<T, "hmac"> {
  const { hmac, ...rest } = p as T & { hmac?: string };
  return rest as Omit<T, "hmac">;
}
