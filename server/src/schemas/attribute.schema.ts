import { z } from 'zod';

export const attributeOptionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Option name is required'),
  sort_order: z.number().optional().default(0),
});

export const saveAttributeSchema = z.object({
  code: z
    .string()
    .min(1, 'Attribute code is required')
    .max(100, 'Attribute code cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Code must contain only letters, numbers, and underscores'),
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
  is_required: z.coerce.boolean().optional().default(false),
  is_unique: z.coerce.boolean().optional().default(false),
  quick_add: z.coerce.boolean().optional().default(false),
  is_user_defined: z.coerce.boolean().optional().default(true),
  sort_order: z.coerce.number().optional().default(0),
  validation: z
    .enum(['numeric', 'email', 'decimal', 'url', ''])
    .nullable()
    .optional(),
  options: z
    .union([
      z.array(z.string()),
      z.array(attributeOptionSchema),
    ])
    .optional()
    .default([]),
});

export const updateAttributeSchema = saveAttributeSchema.partial().extend({
  code: z
    .string()
    .min(1, 'Attribute code is required')
    .max(100, 'Attribute code cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Code must contain only letters, numbers, and underscores')
    .optional(),
  name: z.string().min(1, 'Attribute name is required').max(255).optional(),
  type: z
    .enum([
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
    ])
    .optional(),
  entity_type: z
    .enum([
      'leads',
      'persons',
      'organizations',
      'products',
      'quotes',
      'warehouses',
    ])
    .optional(),
});

export type SaveAttributeInput = z.infer<typeof saveAttributeSchema>;
export type UpdateAttributeInput = z.infer<typeof updateAttributeSchema>;
