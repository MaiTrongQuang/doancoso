import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  userId: number;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CASHIER";
};

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

function getJwtSecretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify<SessionPayload>(token, getJwtSecretKey());

  return {
    userId: Number(payload.userId),
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}
