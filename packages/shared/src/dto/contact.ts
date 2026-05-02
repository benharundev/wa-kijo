import { z } from 'zod';

/** E.164 phone number — e.g. +60123456789 */
export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Must be E.164 format, e.g. +60123456789');

// ── Tag DTOs ──────────────────────────────────────────────────────────────────

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour, e.g. #6B7280')
    .default('#6B7280'),
});
export type CreateTagDto = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = CreateTagSchema.partial();
export type UpdateTagDto = z.infer<typeof UpdateTagSchema>;

// ── Contact DTOs ──────────────────────────────────────────────────────────────

export const CreateContactSchema = z.object({
  phone:  PhoneSchema,
  name:   z.string().min(1).max(100),
  email:  z.string().email().optional(),
  notes:  z.string().max(2000).optional(),
  source: z.string().max(50).optional(),
  tagIds: z.array(z.string()).default([]),
});
export type CreateContactDto = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  email:     z.string().email().nullable().optional(),
  notes:     z.string().max(2000).nullable().optional(),
  source:    z.string().max(50).optional(),
  isBlocked: z.boolean().optional(),
  tagIds:    z.array(z.string()).optional(),
});
export type UpdateContactDto = z.infer<typeof UpdateContactSchema>;

export const ContactQuerySchema = z.object({
  cursor:    z.string().optional(),
  take:      z.coerce.number().int().min(1).max(100).default(20),
  search:    z.string().optional(),
  tagId:     z.string().optional(),
  isBlocked: z.coerce.boolean().optional(),
});
export type ContactQueryDto = z.infer<typeof ContactQuerySchema>;
