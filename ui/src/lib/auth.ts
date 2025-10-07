import { betterAuth } from "better-auth"
import { magicLink } from "better-auth/plugins"
import { Pool } from "pg"
import { Resend } from "resend"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
})

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  } : undefined,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        console.log("=== MAGIC LINK ===")
        console.log("Email:", email)
        console.log("Token:", token)
        console.log("URL:", url)
        console.log("==================")

        if (!resend) {
          console.log("⚠️  No RESEND_API_KEY configured - email not sent")
          return
        }

        try {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to teamz</h2>
              <p>Click the link below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Sign in to teamz
              </a>
              <p style="color: #666; font-size: 14px;">This link will expire in 5 minutes.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
            </div>
          `

          const result = await resend.emails.send({
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: email,
            subject: "Sign in to teamz",
            html: emailHtml,
          })

          console.log("✅ Magic link email sent successfully")
          console.log("📧 Resend response:", JSON.stringify(result, null, 2))
        } catch (error) {
          console.error("❌ Failed to send magic link email:", error)
        }
      },
    }),
  ],
})
