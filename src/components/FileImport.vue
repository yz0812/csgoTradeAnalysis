<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800">数据导入</h2>
      <button
        @click="showImport = !showImport"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
      >
        {{ showImport ? '隐藏导入' : '显示导入' }}
      </button>
    </div>

    <div v-show="showImport" class="space-y-4">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div class="mb-4">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <button
          @click="handleSelectFile"
          :disabled="importing"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {{ importing ? '导入中...' : '选择文件' }}
        </button>

        <p class="mt-2 text-sm text-gray-500">支持 CSV、Excel (.xlsx/.xls) 格式</p>
      </div>

      <div v-if="selectedFile" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-gray-700">
          <span class="font-medium">已选择：</span>
          {{ selectedFile }}
        </p>
      </div>

      <div v-if="result" class="rounded-lg p-4" :class="result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <p class="text-sm font-medium" :class="result.success ? 'text-green-800' : 'text-red-800'">
          {{ result.message }}
        </p>
      </div>

      <div class="flex gap-4">
        <button
          @click="handleClearDatabase"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          清空数据库
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['import-complete'])

const showImport = ref(false)
const selectedFile = ref(null)
const importing = ref(false)
const result = ref(null)

const handleSelectFile = async () => {
  try {
    const filePath = await window.electronAPI.selectFile()

    if (!filePath) return

    selectedFile.value = filePath
    importing.value = true
    result.value = null

    const response = await window.electronAPI.importCSV(filePath)

    if (response.success) {
      result.value = {
        success: true,
        message: `成功导入 ${response.imported} 条记录（共 ${response.total} 条）`
      }
      emit('import-complete')
    } else {
      result.value = {
        success: false,
        message: `导入失败: ${response.error}`
      }
    }
  } catch (error) {
    result.value = {
      success: false,
      message: `发生错误: ${error.message}`
    }
  } finally {
    importing.value = false
  }
}

const handleClearDatabase = async () => {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return

  try {
    const response = await window.electronAPI.clearDatabase()

    if (response.success) {
      result.value = {
        success: true,
        message: '数据库已清空'
      }
      selectedFile.value = null
      emit('import-complete')
    } else {
      result.value = {
        success: false,
        message: `清空失败: ${response.error}`
      }
    }
  } catch (error) {
    result.value = {
      success: false,
      message: `发生错误: ${error.message}`
    }
  }
}
</script>
