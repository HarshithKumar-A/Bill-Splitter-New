import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { uid, email, name, provider } = await request.json()

        // Validate input
        if (!uid || !email || !name) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if user already exists by email or providerId
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { providerId: uid }
                ]
            }
        })

        if (user) {
            // Update existing user with provider info if needed
            if (!user.providerId || user.provider === 'credentials') {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        provider: provider || 'google',
                        providerId: uid,
                        name // Update name in case it changed
                    }
                })
            }
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    provider: provider || 'google',
                    providerId: uid,
                    password: null // OAuth users don't have passwords
                }
            })
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json({
            message: 'Authentication successful',
            user: userWithoutPassword
        })
    } catch (error) {
        console.error('Google Sign-In error:', error)
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        )
    }
}
