<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">CSGO 饰品交易分析工具</h1>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div class="space-y-8">
        <FileImport @import-complete="handleImportComplete" />
        <Dashboard :refresh-trigger="refreshTrigger" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FileImport from './components/FileImport.vue'
import Dashboard from './components/Dashboard.vue'

const refreshTrigger = ref(0)

const handleImportComplete = () => {
  refreshTrigger.value++
}
</script>
