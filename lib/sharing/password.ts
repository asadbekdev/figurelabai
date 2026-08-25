export function createShareSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function hashSharePassword(password: string, salt: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${salt}\n${password}`)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return toHex(digest)
}

export async function verifySharePassword(
  password: string,
  salt: string,
  hash: string
): Promise<boolean> {
  const next = await hashSharePassword(password, salt)
  if (next.length !== hash.length) return false
  let mismatch = 0
  for (let index = 0; index < next.length; index += 1) {
    mismatch |= next.charCodeAt(index) ^ hash.charCodeAt(index)
  }
  return mismatch === 0
}
