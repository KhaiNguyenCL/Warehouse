// Trợ lý tra cứu nhanh bằng ngôn ngữ tự nhiên (Gemini) — chỉ xử lý câu hỏi ĐỌC dữ liệu
// (tồn kho, trạng thái phiếu...), không cho phép tool nào ghi/sửa dữ liệu. Model chỉ đóng
// vai trò "dịch" câu hỏi tự nhiên → gọi đúng tool → diễn giải kết quả, không tự bịa số liệu
// (ép qua systemInstruction).
import { Knex } from 'knex'
import { GoogleGenAI, FunctionDeclaration, Part } from '@google/genai'
import { InventoryRepository } from '../inventory/inventory.repository'

const MODEL = 'gemini-3.6-flash'
const MAX_TOOL_ROUNDS = 5 // chặn vòng lặp vô hạn nếu model cứ gọi tool liên tục

const checkInventoryDeclaration: FunctionDeclaration = {
  name: 'check_inventory',
  description:
    'Tra cứu tồn kho hiện tại theo tên sản phẩm, mã SKU hoặc mã hàng (item_code). ' +
    'BỎ TRỐNG "search" nếu người dùng hỏi chung chung (VD "kho đang có những SKU nào", ' +
    '"liệt kê hàng còn trong kho") — khi đó trả về danh sách các SKU đang còn tồn (qty_on_hand > 0), ' +
    'tối đa 20 dòng. Có thể lọc theo 1 kho cụ thể qua mã kho.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Từ khóa tìm theo tên sản phẩm, SKU hoặc mã hàng — VD "SG350", "switch cisco". Bỏ trống để liệt kê chung.',
      },
      warehouse_code: {
        type: 'string',
        description: 'Mã kho muốn lọc (tuỳ chọn) — VD "WH-DEMO". Bỏ trống nếu hỏi tổng tất cả kho.',
      },
    },
  },
}

export class AssistantService {
  private inventoryRepo: InventoryRepository

  constructor(private db: Knex) {
    this.inventoryRepo = new InventoryRepository(db)
  }

  private async runCheckInventory(args: { search?: string; warehouse_code?: string }) {
    let warehouse_id: string | undefined
    if (args.warehouse_code) {
      const wh = await this.db('warehouses').whereILike('code', args.warehouse_code).first()
      if (!wh) return { error: `Không tìm thấy kho có mã "${args.warehouse_code}"` }
      warehouse_id = wh.id
    }

    // Không có search → liệt kê chung: chỉ lấy SKU thật sự còn tồn (qty_on_hand > 0), lấy
    // dư ra (60) trước khi lọc rồi cắt còn 20, vì findAll() không lọc theo qty_on_hand.
    const isGeneralListing = !args.search
    const result = await this.inventoryRepo.findAll({
      search: args.search,
      warehouse_id,
      limit: isGeneralListing ? 60 : 10,
      page: 1,
    })

    let rows = result.data
    if (isGeneralListing) {
      rows = rows.filter((r: any) => Number(r.qty_on_hand) > 0).slice(0, 20)
    }

    if (rows.length === 0) {
      return { message: args.search ? 'Không tìm thấy SKU nào khớp từ khóa này' : 'Hiện không có SKU nào còn tồn kho' }
    }

    return {
      truncated: isGeneralListing && result.data.length > rows.length,
      items: rows.map((r: any) => ({
        sku: r.item_code || r.sku,
        name: r.variant_name,
        warehouse: r.warehouse_name,
        qty_on_hand: Number(r.qty_on_hand),
        qty_reserved: Number(r.qty_reserved),
        qty_available: Number(r.qty_available),
        unit: r.unit,
      })),
    }
  }

  private async runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (name === 'check_inventory') return this.runCheckInventory(args)
    return { error: `Tool "${name}" không tồn tại` }
  }

  async ask(question: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw { statusCode: 500, message: 'Chưa cấu hình GEMINI_API_KEY trên server' }

    const ai = new GoogleGenAI({ apiKey })
    const chat = ai.chats.create({
      model: MODEL,
      config: {
        systemInstruction:
          'Bạn là trợ lý tra cứu kho hàng nội bộ của DNS Technology. Trả lời NGẮN GỌN, chính xác, ' +
          'bằng tiếng Việt, và CHỈ dựa vào dữ liệu tool trả về — không tự suy đoán hay bịa số liệu. ' +
          'Nếu tool báo không tìm thấy hoặc lỗi, nói rõ với người dùng thay vì đoán.',
        tools: [{ functionDeclarations: [checkInventoryDeclaration] }],
      },
    })

    let response = await chat.sendMessage({ message: question })

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const calls = response.functionCalls
      if (!calls || calls.length === 0) break

      const responseParts: Part[] = []
      for (const call of calls) {
        const output = await this.runTool(call.name ?? '', (call.args as Record<string, unknown>) ?? {})
        responseParts.push({ functionResponse: { id: call.id, name: call.name, response: output as Record<string, unknown> } })
      }
      response = await chat.sendMessage({ message: responseParts })
    }

    return response.text ?? 'Xin lỗi, tôi chưa trả lời được câu hỏi này.'
  }
}
