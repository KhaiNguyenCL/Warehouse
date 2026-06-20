export const COMPANY_TYPES = ['customer', 'supplier'] as const

export const createCompanySchema = {
  body: {
    type: 'object',
    required: ['code', 'name', 'types'],
    properties: {
      code:         { type: 'string', minLength: 1 },
      name:         { type: 'string', minLength: 1 },
      tax_code:     { type: 'string' },
      country:      { type: 'string', minLength: 2, maxLength: 2 },
      address:      { type: 'string' },
      phone:        { type: 'string' },
      email:        { type: 'string', format: 'email' },
      bank_account: { type: 'string' },
      bank_name:    { type: 'string' },
      bitrix_company_id: { type: 'string' },
      note:         { type: 'string' },
      // 1 company có thể vừa là KH vừa là NCC (CLAUDE.md mục 12) — types là mảng,
      // không phải 1 giá trị duy nhất.
      types: {
        type: 'array',
        items: { type: 'string', enum: COMPANY_TYPES },
        minItems: 1,
        uniqueItems: true,
      },
    },
  },
}

export const updateCompanySchema = {
  body: {
    type: 'object',
    properties: {
      code:         { type: 'string', minLength: 1 },
      name:         { type: 'string', minLength: 1 },
      tax_code:     { type: 'string' },
      country:      { type: 'string', minLength: 2, maxLength: 2 },
      address:      { type: 'string' },
      phone:        { type: 'string' },
      email:        { type: 'string', format: 'email' },
      bank_account: { type: 'string' },
      bank_name:    { type: 'string' },
      bitrix_company_id: { type: 'string' },
      note:         { type: 'string' },
      is_active:    { type: 'boolean' },
      types: {
        type: 'array',
        items: { type: 'string', enum: COMPANY_TYPES },
        minItems: 1,
        uniqueItems: true,
      },
    },
  },
}

export const listCompanySchema = {
  querystring: {
    type: 'object',
    properties: {
      type:   { type: 'string', enum: COMPANY_TYPES },
      search: { type: 'string' },
      page:   { type: 'integer', minimum: 1, default: 1 },
      limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
}

export const createContactSchema = {
  body: {
    type: 'object',
    required: ['full_name'],
    properties: {
      full_name:  { type: 'string', minLength: 1 },
      position:   { type: 'string' },
      phone:      { type: 'string' },
      email:      { type: 'string', format: 'email' },
      is_primary: { type: 'boolean' },
      bitrix_contact_id: { type: 'string' },
      note:       { type: 'string' },
    },
  },
}

export const updateContactSchema = {
  body: {
    type: 'object',
    properties: {
      full_name:  { type: 'string', minLength: 1 },
      position:   { type: 'string' },
      phone:      { type: 'string' },
      email:      { type: 'string', format: 'email' },
      is_primary: { type: 'boolean' },
      bitrix_contact_id: { type: 'string' },
      note:       { type: 'string' },
    },
  },
}

export type CompanyType = (typeof COMPANY_TYPES)[number]

export interface CreateCompanyBody {
  code: string
  name: string
  tax_code?: string
  country?: string
  address?: string
  phone?: string
  email?: string
  bank_account?: string
  bank_name?: string
  bitrix_company_id?: string
  note?: string
  types: CompanyType[]
}

export interface UpdateCompanyBody extends Partial<Omit<CreateCompanyBody, 'types'>> {
  types?: CompanyType[]
  is_active?: boolean
}

export interface ListCompanyQuery {
  type?: CompanyType
  search?: string
  page?: number
  limit?: number
}

export interface CreateContactBody {
  full_name: string
  position?: string
  phone?: string
  email?: string
  is_primary?: boolean
  bitrix_contact_id?: string
  note?: string
}

export interface UpdateContactBody extends Partial<CreateContactBody> {}
