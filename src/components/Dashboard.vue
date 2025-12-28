<template>
  <div class="space-y-6">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white rounded-lg shadow-md p-6">
        <p class="text-sm text-gray-600 mb-1">总成本</p>
        <p class="text-2xl font-bold text-red-600">
          ${{ stats?.totalCost?.toFixed(2) || '0.00' }}
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <p class="text-sm text-gray-600 mb-1">总出售额</p>
        <p class="text-2xl font-bold text-green-600">
          ${{ stats?.totalSellAmount?.toFixed(2) || '0.00' }}
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <p class="text-sm text-gray-600 mb-1">总盈亏</p>
        <p class="text-2xl font-bold" :class="(stats?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
          ${{ stats?.profit?.toFixed(2) || '0.00' }}
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <p class="text-sm text-gray-600 mb-1">饰品种类</p>
        <p class="text-2xl font-bold text-blue-600">
          {{ stats?.itemCount || 0 }}
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <p class="text-sm text-gray-600 mb-1">交易次数</p>
        <p class="text-2xl font-bold text-purple-600">
          {{ stats?.transactionCount || 0 }}
        </p>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 月度趋势 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-bold mb-4 text-gray-800">月度收支趋势</h3>
        <div ref="trendChartRef" class="h-80"></div>
      </div>

      <!-- 交易状态分布 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-bold mb-4 text-gray-800">交易状态分布</h3>
        <div ref="pieChartRef" class="h-80"></div>
      </div>
    </div>

    <!-- 饰品排名表 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold mb-4 text-gray-800">饰品盈利排行 TOP 20</h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">饰品名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">购买时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成本</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出售额</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盈亏</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in ranking" :key="index" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ index + 1 }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {{ item.item_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ item.date }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                ${{ item.cost.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                ${{ item.sell_amount.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="item.profit >= 0 ? 'text-green-600' : 'text-red-600'">
                ${{ item.profit.toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!ranking || ranking.length === 0" class="text-center py-8 text-gray-500">
          暂无数据
        </div>
      </div>
    </div>

    <!-- 亏损排名表 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold mb-4 text-gray-800">亏损排行 TOP 20</h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-red-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">排名</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">饰品名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">购买时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">成本</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">出售额</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">亏损金额</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in lossRanking" :key="index" class="hover:bg-red-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ index + 1 }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {{ item.item_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ item.date }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                ${{ item.cost.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                ${{ item.sell_amount.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700">
                ${{ item.profit.toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!lossRanking || lossRanking.length === 0" class="text-center py-8 text-gray-500">
          暂无亏损数据
        </div>
      </div>
    </div>

    <!-- 库存排名表 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold mb-4 text-gray-800">当前库存 TOP 20</h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-blue-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">排名</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">饰品名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">总成本</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">数量</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in stockRanking" :key="index" class="hover:bg-blue-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ index + 1 }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {{ item.item_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                ${{ item.total_cost.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.count }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!stockRanking || stockRanking.length === 0" class="text-center py-8 text-gray-500">
          暂无库存数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
])

const props = defineProps({
  refreshTrigger: Number
})

const stats = ref(null)
const ranking = ref([])
const lossRanking = ref([])
const stockRanking = ref([])
const trendChartRef = ref(null)
const pieChartRef = ref(null)

let trendChart = null
let pieChart = null

const loadData = async () => {
  try {
    stats.value = await window.electronAPI.getStats()
    ranking.value = await window.electronAPI.getItemRanking(20)
    lossRanking.value = await window.electronAPI.getLossRanking(20)
    stockRanking.value = await window.electronAPI.getStockRanking(20)

    const trendData = await window.electronAPI.getMonthlyTrend()
    const typeData = await window.electronAPI.getTypeDistribution()

    renderTrendChart(trendData)
    renderPieChart(typeData)
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const renderTrendChart = (data) => {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const months = data.map(d => d.month)
  const costData = data.map(d => d.cost)
  const sellData = data.map(d => d.sell)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['成本', '出售']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '${value}'
      }
    },
    series: [
      {
        name: '成本',
        type: 'bar',
        data: costData,
        itemStyle: {
          color: '#ef4444'
        }
      },
      {
        name: '出售',
        type: 'bar',
        data: sellData,
        itemStyle: {
          color: '#22c55e'
        }
      }
    ]
  }

  trendChart.setOption(option)
}

const renderPieChart = (data) => {
  if (!pieChartRef.value) return

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }

  const statusMap = {
    sell: '出售',
    consume: '消耗',
    stock: '库存'
  }

  const pieData = data.map(d => ({
    name: statusMap[d.status] || d.status,
    value: d.count
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '交易状态',
        type: 'pie',
        radius: '50%',
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  pieChart.setOption(option)
}

onMounted(() => {
  loadData()

  window.addEventListener('resize', () => {
    trendChart?.resize()
    pieChart?.resize()
  })
})

watch(() => props.refreshTrigger, () => {
  loadData()
})
</script>
