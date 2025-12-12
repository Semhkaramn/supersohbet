import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { serialize } from 'cookie'

export interface Session {
  userId: string
  email: string
  username: string
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-min-32-characters-long-change-this-in-production'
)

/**
 * Yeni JWT token oluşturur
 */
export async function createToken(payload: Session): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    username: payload.username
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 gün
    .sign(JWT_SECRET)

  return token
}

/**
 * JWT token'ı doğrular ve payload'ı döner
 */
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      username: payload.username as string
    }
  } catch (error) {
    return null
  }
}

/**
 * Request'ten session bilgisini alır
 */
export async function getSession(request: NextRequest): Promise<Session | null> {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return null

    return await verifyToken(token)
  } catch (error) {
    return null
  }
}

/**
 * Auth gerektiren endpoint'lerde kullanılır
 * Session yoksa hata fırlatır
 */
export async function requireAuth(request: NextRequest): Promise<Session> {
  const session = await getSession(request)
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * Auth token cookie'sini response'a ekler
 */
export function setAuthCookie(token: string): string {
  return serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 gün
    path: '/'
  })
}

/**
 * Auth token cookie'sini siler (logout)
 */
export function clearAuthCookie(): string {
  return serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
}

/**
 * Response ile birlikte auth cookie set eder
 */
export function createAuthResponse(data: any, token: string): NextResponse {
  const response = NextResponse.json(data)
  response.headers.append('Set-Cookie', setAuthCookie(token))
  return response
}

/**
 * Logout response oluşturur
 */
export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json({ success: true, message: 'Çıkış yapıldı' })
  response.headers.append('Set-Cookie', clearAuthCookie())
  return response
}
