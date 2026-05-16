import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  CreateCheckoutSchema,
  CreatePortalSchema,
  type CreateCheckoutDto,
  type CreatePortalDto,
} from '@wa-kijo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestContext } from '../../common/context/request-context';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiCookieAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // ── Plans ─────────────────────────────────────────────────────────────────

  @Get('plans')
  @Public()
  @ApiOperation({
    summary: 'List active plans',
    description: 'Returns all active subscription plans. Public — no auth required.',
  })
  @ApiOkResponse({ description: 'List of plans' })
  listPlans() {
    return this.billing.listPlans();
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  @Get('subscription')
  @RequirePermission('billing:view')
  @ApiOperation({
    summary: 'Get current subscription',
    description: "Returns the active subscription for the caller's organisation.",
  })
  @ApiOkResponse({ description: 'Current subscription or null if not subscribed' })
  getSubscription(@CurrentUser() ctx: RequestContext) {
    return this.billing.getSubscription(ctx);
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  @Post('stripe/checkout')
  @RequirePermission('billing:manage')
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description:
      'Creates a hosted Stripe Checkout session. Redirect the user to the returned `url` to complete payment.',
  })
  @ApiCreatedResponse({ description: 'Checkout session URL' })
  createStripeCheckout(
    @CurrentUser() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateCheckoutSchema)) dto: CreateCheckoutDto,
  ) {
    return this.billing.createCheckout(ctx, { ...dto, provider: 'stripe' });
  }

  @Post('stripe/portal')
  @RequirePermission('billing:manage')
  @ApiOperation({
    summary: 'Create Stripe billing portal session',
    description:
      'Creates a Stripe Customer Portal session for managing the subscription, payment method, and invoices.',
  })
  @ApiCreatedResponse({ description: 'Portal session URL' })
  createStripePortal(
    @CurrentUser() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreatePortalSchema)) dto: CreatePortalDto,
  ) {
    return this.billing.createPortal(ctx, dto);
  }

  /**
   * Stripe webhook endpoint.
   *
   * Security notes:
   *  - @Public() bypasses the AuthGuard — Stripe doesn't send session cookies.
   *  - Signature is verified via STRIPE_WEBHOOK_SECRET inside BillingService.
   *  - Never return error details in the response body (helps attackers).
   *  - Stripe retries on non-2xx. Always return 200 after successful processing.
   */
  @Post('stripe/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver', description: 'Internal — do not call.' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException();

    await this.billing.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }

  // Additional provider routes (Billplz, Curlec, etc.) live in wa'kijo-pro
  // behind the Tier A+ paywall. Stripe is the only provider in Community.
}
