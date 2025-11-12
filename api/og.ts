// Vercel Edge Function for Dynamic Open Graph Tags
// This handles /community/project/:projectId URLs and injects dynamic OG meta tags

import { createClient } from '@supabase/supabase-js'

// Types
interface ProjectData {
  id: string
  name: string
  description: string | null
  preview_image_url: string | null
  user_id: string
}

interface UserProfile {
  display_name: string
}

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const userAgent = req.headers.get('user-agent') || ''
  
  // Detect if this is a bot/crawler that needs OG tags
  const isCrawler = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot/i.test(userAgent)
  
  // If not a crawler, serve the SPA directly
  if (!isCrawler) {
    // Rewrite to the SPA's index.html
    return fetch(new URL('/index.html', url.origin))
  }
  
  // Extract project ID from URL pattern: /community/project/:projectId
  const pathMatch = url.pathname.match(/^\/community\/project\/([a-f0-9-]+)/)
  
  if (!pathMatch) {
    // Not a project detail page, serve default
    return fetch(new URL('/index.html', url.origin))
  }

  const projectId = pathMatch[1]

  try {
    // Initialize Supabase client (using anonymous access for public projects)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, preview_image_url, user_id')
      .eq('id', projectId)
      .eq('is_published', true)
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      console.error('Project not found:', projectError)
      // Serve the SPA which will handle the 404
      return fetch(new URL('/index.html', url.origin))
    }

    // Fetch author display name
    const { data: profile } = await supabase
      .from('user_profiles_public')
      .select('display_name')
      .eq('user_id', project.user_id)
      .single()

    const authorName = profile?.display_name || 'Unknown Artist'

    // Generate dynamic meta tags
    const title = `${project.name} by ${authorName} - ASCII Motion`
    const description = project.description || `Check out this ASCII art animation by ${authorName} on ASCII Motion.`
    const imageUrl = sanitizeUrl(project.preview_image_url)
    const pageUrl = `https://ascii-motion.app/community/project/${projectId}`

    // Generate HTML with dynamic OG tags
    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Dynamic Project Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${pageUrl}" />

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="ASCII art animation: ${escapeHtml(project.name)}" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="600" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="ASCII art animation: ${escapeHtml(project.name)}" />

    <!-- Standard Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <!-- Static page for crawlers - no redirect needed -->
    <div style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: hsl(0, 0%, 3.9%);
      color: hsl(0, 0%, 98%);
      font-family: 'Courier New', monospace;
    ">
      <div style="text-align: center;">
        <h1>${escapeHtml(project.name)}</h1>
        <p>by ${escapeHtml(authorName)}</p>
        <p style="margin-top: 1rem;">
          <a href="${pageUrl}" style="color: hsl(0, 0%, 80%);">View on ASCII Motion</a>
        </p>
      </div>
    </div>
  </body>
</html>
`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error generating OG tags:', error)
    
    // Fallback to SPA on error
    return fetch(new URL('/index.html', url.origin))
  }
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Helper function to validate and sanitize URLs
function sanitizeUrl(url: string | null): string {
  if (!url) return 'https://ascii-motion.app/og-image.png'
  
  try {
    const parsed = new URL(url)
    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'https://ascii-motion.app/og-image.png'
    }
    return escapeHtml(parsed.toString())
  } catch {
    // Invalid URL, return default
    return 'https://ascii-motion.app/og-image.png'
  }
}
