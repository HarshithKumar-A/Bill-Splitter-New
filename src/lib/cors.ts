import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-production-domain.com',
  // Add other domains as needed
]

export function corsMiddleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || ''
  
  // Check if the origin is in the allowed list or if we're in development
  const isAllowedOrigin = 
    process.env.NODE_ENV === 'development' || 
    allowedOrigins.includes(origin)
  
  // Set CORS headers based on the origin
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  
  // Add the Access-Control-Allow-Origin header if the origin is allowed
  if (isAllowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers })
  }
  
  return headers
} 