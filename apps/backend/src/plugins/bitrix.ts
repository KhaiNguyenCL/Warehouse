// Fastify plugin — gắn app.bitrix, 1 client gọi Bitrix REST API qua webhook (CLAUDE.md
// mục 13). Bitrix CHỈ ĐỌC — không có hàm update/create nào ở đây, đúng tinh thần
// "Fetch thông tin từ Bitrix, không ghi ngược lại".
import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'

export interface BitrixDeal {
  ID: string
  TITLE?: string
  OPPORTUNITY?: string
  COMPANY_ID?: string
  CONTACT_ID?: string
  [field: string]: unknown
}

export interface BitrixCompany {
  ID: string
  TITLE?: string
  [field: string]: unknown
}

export interface BitrixContact {
  ID: string
  NAME?: string
  LAST_NAME?: string
  [field: string]: unknown
}

declare module 'fastify' {
  interface FastifyInstance {
    bitrix: BitrixClient
  }
}

// Webhook URL có dạng "https://<domain>.bitrix24.vn/rest/1/<key>" (BITRIX_WEBHOOK_URL
// trong .env) — gọi tiếp method REST bằng cách nối "/<method>" phía sau, đúng theo ví dụ
// endpoint ở CLAUDE.md mục 13 (GET /rest/1/{api_key}/crm.deal.get?id={deal_id}).
export class BitrixClient {
  constructor(private webhookUrl: string | undefined) {}

  private async call<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.webhookUrl) {
      throw { statusCode: 503, message: 'BITRIX_WEBHOOK_URL chưa được cấu hình' }
    }
    const url = `${this.webhookUrl.replace(/\/$/, '')}/${method}?${new URLSearchParams(params).toString()}`

    let res: Response
    try {
      res = await fetch(url)
    } catch (err: any) {
      throw { statusCode: 502, message: `Không gọi được Bitrix API: ${err.message}` }
    }

    const json: any = await res.json()
    if (json.error) {
      throw { statusCode: 502, message: `Bitrix API lỗi: ${json.error_description ?? json.error}` }
    }
    return json.result as T
  }

  getDeal(dealId: string) {
    return this.call<BitrixDeal>('crm.deal.get', { id: dealId })
  }

  getCompany(companyId: string) {
    return this.call<BitrixCompany>('crm.company.get', { id: companyId })
  }

  getContact(contactId: string) {
    return this.call<BitrixContact>('crm.contact.get', { id: contactId })
  }

  listCompanies(filter: Record<string, string> = {}) {
    return this.call<BitrixCompany[]>('crm.company.list', filter)
  }

  listContacts(filter: Record<string, string> = {}) {
    return this.call<BitrixContact[]>('crm.contact.list', filter)
  }

  // Fetch toàn bộ companies từ Bitrix với các UF field cần thiết, xử lý pagination.
  // Bitrix trả tối đa 50 bản ghi/lần; dùng json.next làm offset cho lần kế tiếp.
  async listAllCompanies(): Promise<BitrixCompany[]> {
    if (!this.webhookUrl) throw { statusCode: 503, message: 'BITRIX_WEBHOOK_URL chưa được cấu hình' }

    const SELECT = [
      'ID', 'TITLE', 'COMPANY_TYPE', 'PHONE',
      'UF_CRM_1666348132682', 'UF_CRM_1666346470460', 'UF_CRM_1665716572711',
      'UF_CRM_1666348162912', 'UF_CRM_1666348221731', 'UF_CRM_1665716907464',
      'UF_CRM_1665716963770', 'UF_CRM_1666349520942', 'UF_CRM_1666349549274',
    ]

    const all: BitrixCompany[] = []
    let start = 0

    while (true) {
      const parts: string[] = [`start=${start}`]
      SELECT.forEach((f, i) => parts.push(`SELECT%5B${i}%5D=${encodeURIComponent(f)}`))
      const url = `${this.webhookUrl.replace(/\/$/, '')}/crm.company.list?${parts.join('&')}`

      let res: Response
      try { res = await fetch(url) } catch (err: any) {
        throw { statusCode: 502, message: `Không gọi được Bitrix API: ${err.message}` }
      }
      const json: any = await res.json()
      if (json.error) throw { statusCode: 502, message: `Bitrix API lỗi: ${json.error_description ?? json.error}` }

      all.push(...(json.result ?? []))
      if (!json.next) break
      start = Number(json.next)
    }

    return all
  }
}

export const bitrixPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('bitrix', new BitrixClient(process.env.BITRIX_WEBHOOK_URL))
})
