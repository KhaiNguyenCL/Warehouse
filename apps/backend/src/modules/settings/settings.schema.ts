export const REQUIRES_COMPANY_VALUES = ['supplier', 'customer', 'none'] as const
export const REQUIRES_REF_DOCUMENT_VALUES = ['quotation', 'stocktake_result', 'none'] as const

// ─── Roles & Permissions ──────────────────────────────────────────────────

export const createRoleSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name:            { type: 'string', minLength: 1 },
      description:     { type: 'string' },
      permission_keys: { type: 'array', items: { type: 'string' } },
    },
  },
}

export const updateRoleSchema = {
  body: {
    type: 'object',
    properties: {
      name:        { type: 'string', minLength: 1 },
      description: { type: 'string' },
    },
  },
}

export const replaceRolePermissionsSchema = {
  body: {
    type: 'object',
    required: ['permission_keys'],
    properties: {
      permission_keys: { type: 'array', items: { type: 'string' } },
    },
  },
}

// ─── Users ─────────────────────────────────────────────────────────────────

export const createUserSchema = {
  body: {
    type: 'object',
    required: ['full_name', 'email', 'password', 'role_id'],
    properties: {
      full_name: { type: 'string', minLength: 1 },
      email:     { type: 'string', format: 'email' },
      phone:     { type: 'string' },
      password:  { type: 'string', minLength: 6 },
      role_id:   { type: 'string', format: 'uuid' },
    },
  },
}

export const updateUserSchema = {
  body: {
    type: 'object',
    properties: {
      full_name: { type: 'string', minLength: 1 },
      phone:     { type: 'string' },
      role_id:   { type: 'string', format: 'uuid' },
      is_active: { type: 'boolean' },
      password:  { type: 'string', minLength: 6 },
    },
  },
}

export const listUserSchema = {
  querystring: {
    type: 'object',
    properties: {
      role_id:   { type: 'string', format: 'uuid' },
      is_active: { type: 'boolean' },
      page:      { type: 'integer', minimum: 1, default: 1 },
      limit:     { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

// ─── Import / Export Types ─────────────────────────────────────────────────

export const createImportTypeSchema = {
  body: {
    type: 'object',
    required: ['key', 'label'],
    properties: {
      key:                   { type: 'string', minLength: 1 },
      label:                 { type: 'string', minLength: 1 },
      parent_key:            { type: 'string' },
      requires_company:      { type: 'string', enum: REQUIRES_COMPANY_VALUES, default: 'none' },
      requires_ref_document: { type: 'string', enum: REQUIRES_REF_DOCUMENT_VALUES, default: 'none' },
    },
  },
}

export const updateImportTypeSchema = {
  body: {
    type: 'object',
    properties: {
      label:                 { type: 'string', minLength: 1 },
      parent_key:            { type: 'string' },
      requires_company:      { type: 'string', enum: REQUIRES_COMPANY_VALUES },
      requires_ref_document: { type: 'string', enum: REQUIRES_REF_DOCUMENT_VALUES },
      is_active:             { type: 'boolean' },
    },
  },
}

export const createExportTypeSchema = {
  body: {
    type: 'object',
    required: ['key', 'label'],
    properties: {
      key:                { type: 'string', minLength: 1 },
      label:              { type: 'string', minLength: 1 },
      parent_key:         { type: 'string' },
      requires_company:   { type: 'string', enum: REQUIRES_COMPANY_VALUES, default: 'none' },
      requires_quotation: { type: 'boolean', default: false },
    },
  },
}

export const updateExportTypeSchema = {
  body: {
    type: 'object',
    properties: {
      label:              { type: 'string', minLength: 1 },
      parent_key:         { type: 'string' },
      requires_company:   { type: 'string', enum: REQUIRES_COMPANY_VALUES },
      requires_quotation: { type: 'boolean' },
      is_active:          { type: 'boolean' },
    },
  },
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type RequiresCompany = (typeof REQUIRES_COMPANY_VALUES)[number]
export type RequiresRefDocument = (typeof REQUIRES_REF_DOCUMENT_VALUES)[number]

export interface CreateRoleBody {
  name: string
  description?: string
  permission_keys?: string[]
}

export interface UpdateRoleBody {
  name?: string
  description?: string
}

export interface ReplaceRolePermissionsBody {
  permission_keys: string[]
}

export interface CreateUserBody {
  full_name: string
  email: string
  phone?: string
  password: string
  role_id: string
}

export interface UpdateUserBody {
  full_name?: string
  phone?: string
  role_id?: string
  is_active?: boolean
  password?: string
}

export interface ListUserQuery {
  role_id?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export interface CreateImportTypeBody {
  key: string
  label: string
  parent_key?: string
  requires_company?: RequiresCompany
  requires_ref_document?: RequiresRefDocument
}

export interface UpdateImportTypeBody {
  label?: string
  parent_key?: string
  requires_company?: RequiresCompany
  requires_ref_document?: RequiresRefDocument
  is_active?: boolean
}

export interface CreateExportTypeBody {
  key: string
  label: string
  parent_key?: string
  requires_company?: RequiresCompany
  requires_quotation?: boolean
}

export interface UpdateExportTypeBody {
  label?: string
  parent_key?: string
  requires_company?: RequiresCompany
  requires_quotation?: boolean
  is_active?: boolean
}
