import { NextResponse } from 'next/server'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import prisma from '@/lib/db'

const FIREBASE_PROJECT_ID = 'billsplitter-537ad'

// Firebase's public keys endpoint
const JWKS_URL = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`

// Create a JWKS key set for verifying Firebase tokens
const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

export interface AuthUser {
    id: string // Database user ID (not Firebase UID)
    uid: string // Firebase UID
    email: string
    name?: string
}

/**
 * Verifies a Firebase ID token and returns the decoded payload
 */
export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email: string; name?: string }> {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        })

        return {
            uid: payload.sub as string,
            email: payload.email as string,
            name: payload.name as string | undefined,
        }
    } catch (error) {
        console.error('Token verification failed:', error)
        throw new Error('Invalid or expired token')
    }
}

/**
 * Extracts the Firebase token from the Authorization header and verifies it
 * Returns the database user (not just Firebase user)
 */
export async function getAuthUser(request: Request): Promise<AuthUser> {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: No token provided')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
        // Verify Firebase token
        const firebaseUser = await verifyFirebaseToken(token)

        // Look up the database user by providerId (Firebase UID)
        const dbUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { providerId: firebaseUser.uid },
                    { email: firebaseUser.email }
                ]
            }
        })

        if (!dbUser) {
            throw new Error('Unauthorized: User not found in database')
        }

        return {
            id: dbUser.id, // Database user ID
            uid: firebaseUser.uid, // Firebase UID
            email: firebaseUser.email,
            name: firebaseUser.name || dbUser.name,
        }
    } catch (error) {
        throw new Error('Unauthorized: Invalid token')
    }
}

/**
 * Requires authentication and returns the authenticated user
 * Throws an error if not authenticated
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
    return getAuthUser(request)
}

/**
 * Returns a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
    return NextResponse.json(
        { error: message },
        { status: 401 }
    )
}

/**
 * Returns a 403 Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
    return NextResponse.json(
        { error: message },
        { status: 403 }
    )
}
