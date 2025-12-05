import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // Clear any server-side session if you implement one
        // For now, the client will handle logout by clearing localStorage

        return NextResponse.json({
            message: 'Logout successful'
        })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        )
    }
}
