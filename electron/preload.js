const { contextBridge, ipcRenderer } = require('electron')

// 仅暴露必要的 API，遵循最小权限原则
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  importCSV: (filePath) => ipcRenderer.invoke('import-csv', filePath),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getMonthlyTrend: () => ipcRenderer.invoke('get-monthly-trend'),
  getItemRanking: (limit) => ipcRenderer.invoke('get-item-ranking', limit),
  getLossRanking: (limit) => ipcRenderer.invoke('get-loss-ranking', limit),
  getStockRanking: (limit) => ipcRenderer.invoke('get-stock-ranking', limit),
  getTypeDistribution: () => ipcRenderer.invoke('get-type-distribution'),
  clearDatabase: () => ipcRenderer.invoke('clear-database')
})
