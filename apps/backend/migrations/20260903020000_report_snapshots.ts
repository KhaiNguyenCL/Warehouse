import type { Knex } from 'knex'

// Lịch sử hàng ngày cho sparkline/delta ở trang Báo cáo — trước đây không có cách nào biết
// "giá trị tồn kho 14 ngày trước" vì inventory/pipeline chỉ có giá trị TẠI THỜI ĐIỂM ĐỌC, không
// lưu lịch sử. 1 row/ngày (unique snapshot_date), upsert bởi cron job (scheduler.ts) mỗi ngày —
// xem report.repository.ts::captureSnapshot(). fulfillment_rate KHÔNG lưu, tính lại từ
// pipeline_delivered_value/pipeline_total_value lúc đọc để khỏi lệch làm tròn giữa 2 nơi.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('report_snapshots', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.date('snapshot_date').notNullable().unique()
    t.decimal('total_inventory_value', 15, 2).notNullable().defaultTo(0)
    t.decimal('pipeline_total_value', 15, 2).notNullable().defaultTo(0)
    t.decimal('pipeline_backlog_value', 15, 2).notNullable().defaultTo(0)
    t.decimal('pipeline_delivered_value', 15, 2).notNullable().defaultTo(0)
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_snapshots')
}
