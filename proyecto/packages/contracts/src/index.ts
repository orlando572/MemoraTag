import { z } from 'zod';

// Event types match the mobile app ('issue' is the real value, not 'incident').
export const RoleSchema = z.enum(['admin', 'member']);
export type Role = z.infer<typeof RoleSchema>;

export const InventoryStatusSchema = z.enum(['in_use', 'in_repair', 'retired']);
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>;

export const EventTypeSchema = z.enum(['note', 'issue', 'maintenance', 'resolved', 'photo', 'document']);
export type EventType = z.infer<typeof EventTypeSchema>;

const iso = z.string().min(1);

export const OrganizationSchema = z.object({ id: z.string(), name: z.string(), created_at: iso, role: RoleSchema.optional() });
export type Organization = z.infer<typeof OrganizationSchema>;
export const UpdateOrganizationSchema = z.object({ name: z.string().trim().min(1).max(80) });
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export const CreateOrganizationSchema = z.object({ name: z.string().trim().min(1).max(120) });
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const MemberSchema = z.object({ user_id: z.string(), email: z.string(), role: RoleSchema });
export type Member = z.infer<typeof MemberSchema>;
export const AddMemberSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), role: RoleSchema.default('member') });
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export const UpdateMemberRoleSchema = z.object({ role: RoleSchema });
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const InventoryObjectSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  internal_code: z.string().nullish(),
  category: z.string().nullish(),
  location: z.string().nullish(),
  assignee: z.string().nullish(),
  status: InventoryStatusSchema,
  created_at: iso,
  archived_at: iso.nullish(),
  nfc_written_at: z.string().nullable().optional(),
});
export type InventoryObject = z.infer<typeof InventoryObjectSchema>;

const optText = z.string().trim().max(200).nullish();
export const CreateObjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(''),
  color: z.string().max(32).default('#DCEBEE'),
  internal_code: optText,
  category: optText,
  location: optText,
  assignee: optText,
  status: InventoryStatusSchema.default('in_use'),
});
export type CreateObjectInput = z.infer<typeof CreateObjectSchema>;
export const UpdateObjectSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    color: z.string().max(32),
    internal_code: optText,
    category: optText,
    location: optText,
    assignee: optText,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'empty update');
export type UpdateObjectInput = z.infer<typeof UpdateObjectSchema>;
export const ChangeStatusSchema = z.object({ status: InventoryStatusSchema });
export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;
export const ALLOWED_FILE_MIME_TYPES = [...PHOTO_MIME_TYPES, ...DOCUMENT_MIME_TYPES] as const;

export const EventFileKindSchema = z.enum(['photo', 'document']);
export type EventFileKind = z.infer<typeof EventFileKindSchema>;
export const EventFileSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  kind: EventFileKindSchema,
  name: z.string(),
  mime: z.string(),
  size: z.number().int(),
  created_at: iso,
  created_by: z.string(),
});
export type EventFile = z.infer<typeof EventFileSchema>;

export const ObjectEventSchema = z.object({
  id: z.string(),
  object_id: z.string(),
  type: EventTypeSchema,
  title: z.string(),
  description: z.string(),
  event_date: iso.nullish(),
  created_at: iso,
  created_by: z.string(),
  created_by_email: z.string().nullable().optional(),
  files: z.array(EventFileSchema).default([]),
});
export type ObjectEvent = z.infer<typeof ObjectEventSchema>;
export const CreateEventSchema = z.object({
  type: EventTypeSchema.default('note'),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).default(''),
  event_date: iso.nullish(),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const ObjectFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: InventoryStatusSchema.optional(),
  location: z.string().trim().optional(),
  category: z.string().trim().optional(),
  // Query-string flag: 'true' or '1' lists only archived objects.
  nfc: z.enum(['with', 'without']).optional(),
  archived: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === 'true' || v === '1').optional(),
});
export type ObjectFilters = z.infer<typeof ObjectFiltersSchema>;

export const OrganizationSummarySchema = z.object({
  total: z.number().int(),
  by_status: z.record(InventoryStatusSchema, z.number().int()),
  open_incidents: z.number().int(),
  recent_events: z.array(ObjectEventSchema),
});
export type OrganizationSummary = z.infer<typeof OrganizationSummarySchema>;
