import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useReports() {
  const [warehouseId, setWarehouseId] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([undefined, undefined])
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [topLimit, setTopLimit] = useState(10)
  const [from, to] = dateRange

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data,
  })

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  })

  const { data: invSummary, isLoading: invSummaryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'summary', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/summary', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: invByCategory, isLoading: invByCategoryLoading } = useQuery({
    queryKey: ['reports', 'inventory', 'by-category', warehouseId],
    queryFn: async () => (await api.get('/reports/inventory/by-category', { params: { warehouse_id: warehouseId } })).data,
  })

  const { data: revSummary, isLoading: revSummaryLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'summary', from, to],
    queryFn: async () => (await api.get('/reports/revenue/summary', { params: { from, to } })).data,
  })

  const { data: revSeries, isLoading: revSeriesLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'timeseries', from, to, groupBy],
    queryFn: async () => (await api.get('/reports/revenue/timeseries', { params: { from, to, group_by: groupBy } })).data,
  })

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['reports', 'revenue', 'top-products', from, to, topLimit],
    queryFn: async () => (await api.get('/reports/revenue/top-products', { params: { from, to, limit: topLimit } })).data,
  })

  return {
    warehouseId, setWarehouseId,
    dateRange, setDateRange,
    groupBy, setGroupBy,
    topLimit, setTopLimit,
    from, to,
    warehouses,
    dashboard, dashboardLoading,
    invSummary, invSummaryLoading,
    invByCategory, invByCategoryLoading,
    revSummary, revSummaryLoading,
    revSeries, revSeriesLoading,
    topProducts, topProductsLoading,
  }
}
