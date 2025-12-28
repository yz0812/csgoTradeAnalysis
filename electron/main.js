import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import Loki from 'lokijs'
import Papa from 'papaparse'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

let db
let transactions
let mainWindow

// 初始化数据库
function initDatabase() {
  return new Promise((resolve) => {
    const dbPath = path.join(app.getPath('userData'), 'transactions.db')

    db = new Loki(dbPath, {
      autoload: true,
      autoloadCallback: () => {
        // 获取或创建 transactions 集合
        transactions = db.getCollection('transactions')
        if (!transactions) {
          transactions = db.addCollection('transactions', {
            indices: ['date', 'item_name', 'type']
          })
        }
        resolve()
      },
      autosave: true,
      autosaveInterval: 4000
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 禁用菜单栏
  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    // mainWindow.webContents.openDevTools() // 已关闭自动打开，可按 Ctrl+Shift+I 手动打开
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close()
    app.quit()
  }
})

// IPC 处理器

// 选择文件（支持 CSV 和 Excel）
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Data Files', extensions: ['csv', 'xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ]
  })

  if (result.canceled) return null
  return result.filePaths[0]
})

// 解析并导入文件（支持 CSV 和 Excel）
ipcMain.handle('import-csv', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase()
    let rawData = []

    // 根据文件类型选择解析方式
    if (ext === '.csv') {
      // CSV 解析
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      await new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            rawData = results.data
            resolve()
          },
          error: (error) => {
            reject(error)
          }
        })
      })
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Excel 解析
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0] // 读取第一个工作表
      const worksheet = workbook.Sheets[sheetName]
      rawData = XLSX.utils.sheet_to_json(worksheet)
    } else {
      return { success: false, error: '不支持的文件格式' }
    }

    // 打印原始数据前3条用于调试
    console.log('=== 原始数据示例 ===')
    console.log('总行数:', rawData.length)
    console.log('前3条:', JSON.stringify(rawData.slice(0, 3), null, 2))
    if (rawData.length > 0) {
      console.log('列名:', Object.keys(rawData[0]))
    }

    // 清洗数据
    const cleanedData = []
    const failedRows = []

    rawData.forEach((row, index) => {
      // 优先使用出售时间，如果没有则使用购买时间
      const date = parseDate(
        row['出售时间'] || row.出售时间 ||
        row.Date || row.date || row.时间 ||
        row.购买时间 || row['购买时间']
      )
      const itemName = cleanName(row['Item Name'] || row.item_name || row.饰品名称 || row.道具名称 || row['道具名称'])

      // 获取成本和出售金额
      const cost = parsePrice(row.Price || row.price || row.价格 || row.金额 || row['金额'])
      const sellAmount = parsePrice(row['出售金额'] || row.出售金额 || row['Sell Amount'])

      // 状态判断
      const statusField = row.Type || row.type || row.类型 || row.状态 || row['状态']
      let status
      if (statusField) {
        const normalized = String(statusField).toLowerCase().trim()
        if (normalized.includes('出售') || normalized.includes('sell')) {
          status = 'sell'
        } else if (normalized.includes('消耗') || normalized.includes('consume')) {
          status = 'consume'
        } else {
          status = 'stock'
        }
      } else {
        // 没有状态字段 = 库存
        status = 'stock'
      }

      // 计算盈亏
      let profit = 0
      if (status === 'sell' && sellAmount !== null) {
        profit = sellAmount - (cost || 0)
      } else if (status === 'consume') {
        profit = -(cost || 0)
      } else if (status === 'stock') {
        profit = 0 // 库存不计盈亏
      }

      // 记录解析结果
      const parsed = {
        date,
        item_name: itemName,
        status,
        cost: cost || 0,
        sell_amount: sellAmount || 0,
        profit
      }

      // 检查是否所有必要字段都有效
      if (date && itemName && status && cost !== null) {
        cleanedData.push(parsed)
      } else {
        failedRows.push({
          index: index + 1,
          original: row,
          parsed,
          reason: {
            date: !date ? '日期解析失败' : '✓',
            itemName: !itemName ? '饰品名称为空' : '✓',
            status: !status ? '状态解析失败' : '✓',
            cost: cost === null ? '成本解析失败' : '✓'
          }
        })
      }
    })

    // 打印清洗结果
    console.log('=== 清洗结果 ===')
    console.log('成功:', cleanedData.length)
    console.log('失败:', failedRows.length)

    if (failedRows.length > 0) {
      console.log('=== 失败示例（前5条）===')
      failedRows.slice(0, 5).forEach(fail => {
        console.log(`\n行 ${fail.index}:`)
        console.log('原始:', fail.original)
        console.log('解析:', fail.parsed)
        console.log('失败原因:', fail.reason)
      })
    }

    // 批量插入
    transactions.insert(cleanedData)

    return {
      success: true,
      imported: cleanedData.length,
      total: rawData.length
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 获取统计数据
ipcMain.handle('get-stats', async () => {
  try {
    const allTransactions = transactions.find()

    // 总成本
    const totalCost = allTransactions.reduce((sum, t) => sum + (t.cost || 0), 0)

    // 总出售额（仅出售记录）
    const totalSellAmount = allTransactions
      .filter(t => t.status === 'sell')
      .reduce((sum, t) => sum + (t.sell_amount || 0), 0)

    // 总盈亏（出售记录盈亏 + 消耗记录盈亏，库存不计）
    const totalProfit = allTransactions
      .filter(t => t.status !== 'stock')
      .reduce((sum, t) => sum + (t.profit || 0), 0)

    // 饰品种类数
    const itemCount = new Set(allTransactions.map(t => t.item_name)).size

    // 交易记录数
    const transactionCount = allTransactions.length

    // 各状态统计
    const sellCount = allTransactions.filter(t => t.status === 'sell').length
    const consumeCount = allTransactions.filter(t => t.status === 'consume').length
    const stockCount = allTransactions.filter(t => t.status === 'stock').length

    return {
      totalCost,
      totalSellAmount,
      profit: totalProfit,
      itemCount,
      transactionCount,
      sellCount,
      consumeCount,
      stockCount
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return null
  }
})

// 获取月度趋势
ipcMain.handle('get-monthly-trend', async () => {
  try {
    const allTransactions = transactions.find()

    // 按月份分组
    const monthlyData = {}
    allTransactions.forEach(t => {
      const month = t.date.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, cost: 0, sell: 0 }
      }

      // 所有记录的成本
      monthlyData[month].cost += t.cost || 0

      // 仅出售记录的出售额
      if (t.status === 'sell') {
        monthlyData[month].sell += t.sell_amount || 0
      }
    })

    // 转换为数组并排序
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  } catch (error) {
    console.error('获取月度趋势失败:', error)
    return []
  }
})

// 获取饰品排名（单笔交易独立显示）
ipcMain.handle('get-item-ranking', async (event, limit = 10) => {
  try {
    const allTransactions = transactions.find()

    // 直接使用单笔交易，不聚合
    const ranking = allTransactions
      .filter(t => t.status === 'sell' || t.status === 'consume') // 只显示已完成的交易
      .map(t => ({
        item_name: t.item_name,
        date: t.date,
        cost: t.cost || 0,
        sell_amount: t.sell_amount || 0,
        profit: t.profit || 0
      }))
      .sort((a, b) => b.profit - a.profit) // 按盈利降序
      .slice(0, limit)

    return ranking
  } catch (error) {
    console.error('获取饰品排名失败:', error)
    return []
  }
})

// 获取交易类型分布
ipcMain.handle('get-type-distribution', async () => {
  try {
    const allTransactions = transactions.find()

    // 按状态分组
    const statusData = {}
    allTransactions.forEach(t => {
      if (!statusData[t.status]) {
        statusData[t.status] = {
          status: t.status,
          count: 0
        }
      }

      statusData[t.status].count++
    })

    return Object.values(statusData)
  } catch (error) {
    console.error('获取交易类型分布失败:', error)
    return []
  }
})

// 获取亏损排名（单笔交易独立显示）
ipcMain.handle('get-loss-ranking', async (event, limit = 20) => {
  try {
    const allTransactions = transactions.find()

    // 直接使用单笔交易，不聚合
    const ranking = allTransactions
      .filter(t => (t.status === 'sell' || t.status === 'consume') && t.profit < 0) // 只显示亏损的已完成交易
      .map(t => ({
        item_name: t.item_name,
        date: t.date,
        cost: t.cost || 0,
        sell_amount: t.sell_amount || 0,
        profit: t.profit || 0
      }))
      .sort((a, b) => a.profit - b.profit) // 按亏损升序（最亏的在前）
      .slice(0, limit)

    return ranking
  } catch (error) {
    console.error('获取亏损排名失败:', error)
    return []
  }
})

// 获取库存排名
ipcMain.handle('get-stock-ranking', async (event, limit = 20) => {
  try {
    const allTransactions = transactions.find()

    // 按饰品名称分组，仅统计库存状态
    const itemData = {}
    allTransactions.forEach(t => {
      if (t.status === 'stock') {
        if (!itemData[t.item_name]) {
          itemData[t.item_name] = {
            item_name: t.item_name,
            total_cost: 0,
            count: 0
          }
        }

        itemData[t.item_name].total_cost += t.cost || 0
        itemData[t.item_name].count++
      }
    })

    // 按成本降序排序
    const ranking = Object.values(itemData)
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, limit)

    return ranking
  } catch (error) {
    console.error('获取库存排名失败:', error)
    return []
  }
})

// 清空数据库
ipcMain.handle('clear-database', async () => {
  try {
    transactions.clear()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 数据清洗工具函数

function parseDate(dateStr) {
  if (!dateStr) return null

  // 如果是 Excel 日期序列号（数字）
  if (typeof dateStr === 'number') {
    // Excel 日期从 1900-01-01 开始计算
    // JavaScript 日期从 1970-01-01 开始
    // Excel 1900-01-01 对应序列号 1
    const excelEpoch = new Date(1899, 11, 30) // 1899-12-30
    const date = new Date(excelEpoch.getTime() + dateStr * 86400000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // 字符串格式日期
  const str = String(dateStr)

  // 尝试多种日期格式
  const formats = [
    /(\d{4})\.(\d{2})\.(\d{2})(\d{2}):(\d{2}):(\d{2})/, // YYYY.MM.DDHH:mm:ss (无空格)
    /(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, // YYYY.MM.DD HH:mm:ss
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/, // MM/DD/YYYY HH:mm
    /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/, // ISO format
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/ // YYYY-MM-DD HH:mm
  ]

  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      if (format === formats[0]) {
        // YYYY.MM.DDHH:mm:ss (无空格)
        return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
      } else if (format === formats[1]) {
        // YYYY.MM.DD HH:mm:ss
        return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
      } else if (format === formats[2]) {
        // MM/DD/YYYY HH:mm
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')} ${match[4].padStart(2, '0')}:${match[5]}`
      } else {
        // 其他格式已经是标准格式
        return str.substring(0, 16).replace('T', ' ')
      }
    }
  }

  return null
}

function cleanName(name) {
  if (!name) return null
  return name.trim().replace(/\s+/g, ' ').normalize('NFC')
}

function cleanType(type) {
  if (!type) return null
  const normalized = String(type).toLowerCase().trim()

  if (normalized.includes('buy') || normalized.includes('购买')) return 'buy'
  if (normalized.includes('sell') || normalized.includes('出售')) return 'sell'
  if (normalized.includes('消耗')) return 'buy' // 消耗视为购买（支出）

  return normalized
}

function parsePrice(priceStr) {
  if (priceStr === null || priceStr === undefined) return null

  // 如果已经是数字，直接返回
  if (typeof priceStr === 'number') {
    return priceStr
  }

  // 提取数字部分
  const match = String(priceStr).match(/[\d,.]+/)
  if (!match) return null

  const num = parseFloat(match[0].replace(/,/g, ''))
  return isNaN(num) ? null : num
}
