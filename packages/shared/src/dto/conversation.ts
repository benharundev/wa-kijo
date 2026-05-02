import { z } from 'zod';

export const ConversationStatusSchema = z.enum(['open', 'closed', 'snoozed']);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const ConversationChannelSchema = z.enum(['whatsapp', 'email', 'sms']);
export type ConversationChannel = z.infer<typeof ConversationChannelSchema>;

export const MessageTypeSchema = z.enum([
  'text',
  'image',
  'document',
  'audio',
  'video',
  'template',
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageDirectionSchema = z.enum(['inbound', 'outbound']);
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;

export const MessageStatusSchema = z.enum([
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
]);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

// ── Conversation DTOs ─────────────────────────────────────────────────────────

export const CreateConversationSchema = z.object({
  contactId: z.string().min(1),
  channel:   ConversationChannelSchema.default('whatsapp'),
});
export type CreateConversationDto = z.infer<typeof CreateConversationSchema>;

export const UpdateConversationSchema = z.object({
  status:           ConversationStatusSchema.optional(),
  assignedToUserId: z.string().nullable().optional(),
});
export type UpdateConversationDto = z.infer<typeof UpdateConversationSchema>;

export const ConversationQuerySchema = z.object({
  cursor:           z.string().optional(),
  take:             z.coerce.number().int().min(1).max(100).default(20),
  status:           ConversationStatusSchema.optional(),
  contactId:        z.string().optional(),
  assignedToUserId: z.string().optional(),
  channel:          ConversationChannelSchema.optional(),
});
export type ConversationQueryDto = z.infer<typeof ConversationQuerySchema>;

// ── Message DTOs ──────────────────────────────────────────────────────────────

export const SendMessageSchema = z
  .object({
    type:     MessageTypeSchema.default('text'),
    body:     z.string().min(1).max(4096).optional(),
    mediaUrl: z.string().url().optional(),
  })
  .refine((d) => (d.type === 'text' ? !!d.body : true), {
    message: 'body is required for text messages',
    path: ['body'],
  })
  .refine(
    (d) => (['image', 'document', 'audio', 'video'].includes(d.type) ? !!d.mediaUrl : true),
    { message: 'mediaUrl is required for media messages', path: ['mediaUrl'] },
  );
export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export const MessageQuerySchema = z.object({
  cursor:    z.string().optional(),
  take:      z.coerce.number().int().min(1).max(100).default(50),
  direction: MessageDirectionSchema.optional(),
});
export type MessageQueryDto = z.infer<typeof MessageQuerySchema>;
