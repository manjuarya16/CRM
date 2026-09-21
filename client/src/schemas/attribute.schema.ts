import { z } from 'zod';

export const attributeOptionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Option name is required'),
  sort_order: z.number().optional().default(0),
});

export const attributeSchema = z.object({
  code: z
    .string()
    .min(1, 'Attribute code is required')
    .max(100, 'Attribute code cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Code can only contain letters, numbers, and underscores (e.g. custom_field_1)'),
  name: z.string().min(1, 'Attribute name is required').max(255, 'Attribute name cannot exceed 255 characters'),
  type: z.enum([
    'text',
    'textarea',
    'price',
    'boolean',
    'select',
    'multiselect',
    'checkbox',
    'email',
    'address',
    'phone',
    'lookup',
    'datetime',
    'date',
    'image',
    'file',
  ]),
  entity_type: z.enum([
    'leads',
    'persons',
    'organizations',
    'products',
    'quotes',
    'warehouses',
  ]),
  lookup_type: z.string().nullable().optional(),
  is_required: z.boolean().default(false),
  is_unique: z.boolean().default(false),
  quick_add: z.boolean().default(false),
  is_user_defined: z.boolean().default(true),
  sort_order: z.number().default(0),
  validation: z
    .enum(['numeric', 'email', 'decimal', 'url', ''])
    .nullable()
    .optional(),
  options: z.array(attributeOptionSchema).default([]),
});

export type AttributeFormData = z.infer<typeof attributeSchema>;
