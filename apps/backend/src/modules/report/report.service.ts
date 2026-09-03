import { Knex } from 'knex'
import { ReportRepository } from './report.repository'

export class ReportService {
  private repo: ReportRepository

  constructor(private db: Knex) {
    this.repo = new ReportRepository(db)
  }

  inventorySummary(warehouseId?: string) {
    return this.repo.inventorySummary(warehouseId)
  }

  inventoryByCategory(warehouseId?: string) {
    return this.repo.inventoryByCategory(warehouseId)
  }

  revenueSummary(from?: string, to?: string) {
    return this.repo.revenueSummary(from, to)
  }

  revenueTimeSeries(from?: string, to?: string, groupBy: 'day' | 'month' = 'day') {
    return this.repo.revenueTimeSeries(from, to, groupBy)
  }

  topProducts(from?: string, to?: string, limit = 10) {
    return this.repo.topProducts(from, to, limit)
  }

  dashboard() {
    return this.repo.dashboard()
  }

  salesPipeline() {
    return this.repo.salesPipeline()
  }

  backlogQuotations(limit = 20) {
    return this.repo.backlogQuotations(limit)
  }

  stockFlow(from?: string, to?: string, groupBy: 'day' | 'month' = 'day') {
    return this.repo.stockFlow(from, to, groupBy)
  }

  lowStockItems(limit = 20) {
    return this.repo.lowStockItems(limit)
  }

  inventoryByWarehouse() {
    return this.repo.inventoryByWarehouse()
  }

  slowMovingStock(days = 60, limit = 10) {
    return this.repo.slowMovingStock(days, limit)
  }

  kpiTrend(days = 14) {
    return this.repo.kpiTrend(days)
  }
}
