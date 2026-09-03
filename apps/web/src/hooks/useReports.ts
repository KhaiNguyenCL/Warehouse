import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import dayjs from 'dayjs'

export function useReports() {
  const [warehouseId, setWarehouseId] = useState<string | undefined>()
  const [flowGroupBy, setFlowGroupBy] = useState<'day' | 'month'>('day')
  const [revGroupBy, setRevGroupBy] = useState<'day' | 'month'>('day')
  const [topLimit, setTopLimit] = useState(10)

  // Default date range: last 30 days
  const defaultFrom = dayjs().subtract(29, 'day').format('YYYY-MM-DD')
  const defaultTo   = dayjs().format('YYYY-MM-DD')
  const [flowFrom, setFlowFrom] = useState(defaultFrom)
  const [flowTo,   setFlowTo]   = useState(defaultTo)
  const [revFrom,  setRevFrom]  = useState(defaultFrom)
  const [revTo,    setRevTo]    = useState(defaultTo)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ['reports', 'pipeline'],
    queryFn: async () => (await api.get('/reports/pipeline')).data,
    refetchInterval: 60_000,
  })

  const { data: kpiTrend, isLoading: kpiTrendLoading } = useQuery({
    queryKey: ['reports', 'kpi-trend'],
    queryFn: async () => (await api.get('/reports/kpi-trend', { params: { days: 14 } })).data,
    refetchInterval: 60_000,
  })

  const { data: invSummary, isLoading: invSummaryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'summary', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/summary', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: invByCategory, isLoading: invByCategoryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'by-category', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/by-category', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: invByWarehouse, isLoading: invByWarehouseLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'by-warehouse'],
    queryFn: async () => (await api.get('/reports/inventory/by-warehouse')).data,
  })

  const { data: slowMovingStock, isLoading: slowMovingStockLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'slow-moving'],
    queryFn: async () => (await api.get('/reports/inventory/slow-moving', { params: { days: 60, limit: 8 } })).data,
  })

  const { data: stockFlow, isLoading: stockFlowLoading } = useQuery({
    queryKey: ['reports', 'stock-flow', flowFrom, flowTo, flowGroupBy],
    queryFn: async () => (await api.get('/reports/stock-flow', { params: { from: flowFrom, to: flowTo, group_by: flowGroupBy } })).data,
  })

  const { data: revSummary, isLoading: revSummaryLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'summary', revFrom, revTo],
    queryFn: async () => (await api.get('/reports/revenue/summary', { params: { from: revFrom, to: revTo } })).data,
  })

  const { data: revSeries, isLoading: revSeriesLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'timeseries', revFrom, revTo, revGroupBy],
    queryFn: async () => (await api.get('/reports/revenue/timeseries', { params: { from: revFrom, to: revTo, group_by: revGroupBy } })).data,
  })

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'top-products', revFrom, revTo, topLimit],
    queryFn: async () => (await api.get('/reports/revenue/top-products', { params: { from: revFrom, to: revTo, limit: topLimit } })).data,
  })

  return {
    warehouses,
    warehouseId, setWarehouseId,
    flowGroupBy, setFlowGroupBy,
    revGroupBy, setRevGroupBy,
    topLimit, setTopLimit,
    flowFrom, flowTo, setFlowFrom, setFlowTo,
    revFrom, revTo, setRevFrom, setRevTo,
    pipeline, pipelineLoading,
    kpiTrend, kpiTrendLoading,
    invSummary, invSummaryLoading,
    invByCategory, invByCategoryLoading,
    invByWarehouse, invByWarehouseLoading,
    slowMovingStock, slowMovingStockLoading,
    stockFlow, stockFlowLoading,
    revSummary, revSummaryLoading,
    revSeries, revSeriesLoading,
    topProducts, topProductsLoading,
  }
}
