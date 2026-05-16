import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EnvService } from '../../config/env.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly env: EnvService) {
    this.resend = new Resend(env.get('RESEND_API_KEY'));
    this.from = env.get('EMAIL_FROM');
  }

  async sendVerification(user: { email: string; name: string }, url: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: user.email,
      subject: 'Verify your email address',
      html: this.verificationTemplate(user.name, url),
    });

    if (error) {
      this.logger.error(
        { userId: user.email, error: error.message },
        'Failed to send verification email',
      );
    } else {
      this.logger.log({ email: user.email }, 'Verification email sent');
    }
  }

  async sendMagicLink(email: string, url: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Your sign-in link',
      html: this.magicLinkTemplate(url),
    });

    if (error) {
      this.logger.error({ email, error: error.message }, 'Failed to send magic link email');
    } else {
      this.logger.log({ email }, 'Magic link email sent');
    }
  }

  async sendInvitation(params: {
    email: string;
    orgName: string;
    inviterName: string;
    role: string;
    url: string;
  }): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.email,
      subject: `You've been invited to join ${params.orgName}`,
      html: this.invitationTemplate(params),
    });

    if (error) {
      this.logger.error(
        { email: params.email, error: error.message },
        'Failed to send invitation email',
      );
    } else {
      this.logger.log({ email: params.email, orgName: params.orgName }, 'Invitation email sent');
    }
  }

  // ---------------------------------------------------------------------------
  // Plain HTML templates — upgrade to React Email components when desired
  // ---------------------------------------------------------------------------

  private verificationTemplate(name: string, url: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Hi ${this.escapeHtml(name)},</p>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
            Verify email
          </a>
        </p>
        <p style="color:#666;font-size:12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>`;
  }

  private magicLinkTemplate(url: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your sign-in link</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
        <p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
            Sign in
          </a>
        </p>
        <p style="color:#666;font-size:12px;">If you didn't request this link, you can safely ignore this email.</p>
      </div>`;
  }

  private invitationTemplate(params: {
    orgName: string;
    inviterName: string;
    role: string;
    url: string;
  }): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You've been invited</h2>
        <p>${this.escapeHtml(params.inviterName)} has invited you to join <strong>${this.escapeHtml(params.orgName)}</strong> as ${this.escapeHtml(params.role)}.</p>
        <p>
          <a href="${params.url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
            Accept invitation
          </a>
        </p>
        <p style="color:#666;font-size:12px;">This invitation expires in 7 days.</p>
      </div>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
