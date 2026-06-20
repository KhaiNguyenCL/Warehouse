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
}

export const bitrixPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('bitrix', new BitrixClient(process.env.BITRIX_WEBHOOK_URL))
})
