import { Global, Module } from '@nestjs/common';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.token';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';
import { EmailService } from '../modules/email/email.service';

/**
 * Loads a better-auth ESM module from a CJS context.
 *
 * SWC transforms `await import('...')` to `require()` when building CJS output,
 * which fails for ESM-only packages (ERR_REQUIRE_ESM). The `new Function()`
 * wrapper is opaque to the bundler/transformer — it preserves the real
 * `import()` call at runtime. This is the standard workaround for this class of
 * CJS/ESM interop problem.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function esmImport(specifier: string): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('s', 'return import(s)')(specifier);
}

@Global()
@Module({
  providers: [
    {
      provide: BETTER_AUTH,
      useFactory: async (
        prisma: PrismaService,
        env: EnvService,
        email: EmailService,
      ): Promise<BetterAuthInstance> => {
        const { betterAuth } = await esmImport('better-auth');
        const { prismaAdapter } = await esmImport('better-auth/adapters/prisma');
        const { magicLink, organization } = await esmImport('better-auth/plugins');

        const googleClientId = env.get('GOOGLE_CLIENT_ID');
        const googleClientSecret = env.get('GOOGLE_CLIENT_SECRET');

        return betterAuth({
          secret: env.get('BETTER_AUTH_SECRET'),
          baseURL: env.get('BETTER_AUTH_URL'),
          basePath: '/api/auth',

          database: prismaAdapter(prisma, { provider: 'postgresql' }),

          // Sessions: HttpOnly cookies, 30-day expiry, sliding window
          session: {
            expiresIn: 60 * 60 * 24 * 30,
            updateAge: 60 * 60 * 24,
            cookieCache: { enabled: true, maxAge: 60 * 5 },
          },

          // Allow the frontend origin to send cookies.
          // CORS headers for /api/auth/* are set in main.ts (reply.raw) because
          // toNodeHandler bypasses Fastify's header layer and app.enableCors().
          trustedOrigins: [env.get('CORS_ORIGIN')],

          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
          },

          emailVerification: {
            sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) =>
              email.sendVerification({ email: user.email, name: user.name }, url),
            autoSignInAfterVerification: true,
            expiresIn: 60 * 60 * 24, // 24 hours
          },

          plugins: [
            // Magic link — 15-min expiry per security.md
            magicLink({
              sendMagicLink: async ({ email: to, url }: { email: string; url: string }) =>
                email.sendMagicLink(to, url),
              expiresIn: 60 * 15,
            }),

            // Organisation plugin — uses existing schema with parentOrgId + orgType
            organization({
              allowUserToCreateOrganization: true,
              invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
              schema: {
                organization: {
                  additionalFields: {
                    parentOrgId: {
                      type: 'string',
                      required: false,
                      returned: true,
                    },
                    orgType: {
                      type: 'string',
                      required: false,
                      defaultValue: 'WORKSPACE',
                      returned: true,
                    },
                  },
                },
              },
            }),
          ],

          // Env-gated Google OAuth — must not crash when env vars are absent
          socialProviders: {
            ...(googleClientId && googleClientSecret
              ? {
                  google: {
                    clientId: googleClientId,
                    clientSecret: googleClientSecret,
                  },
                }
              : {}),
          },

          advanced: {
            useSecureCookies: env.get('NODE_ENV') === 'production',
            cookiePrefix: 'wa-kijo',
          },
        });
      },
      inject: [PrismaService, EnvService, EmailService],
    },
    AuthService,
  ],
  exports: [BETTER_AUTH, AuthService],
})
export class AuthModule {}
