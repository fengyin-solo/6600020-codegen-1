<template>
  <div class="flex flex-col h-full gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm text-gray-400">设备拓扑总览</h3>
      <div class="flex gap-1">
        <button
          v-for="area in ['全部', ...store.areas]"
          :key="area"
          @click="store.selectedArea = area === '全部' ? null : area"
          class="px-2 py-1 text-xs rounded transition-colors"
          :class="(area === '全部' && !store.selectedArea) || store.selectedArea === area
            ? 'bg-orange-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        >
          {{ area }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3">
      <div
        v-for="summary in displaySummaries"
        :key="summary.area"
        @click="store.selectedArea = summary.area"
        class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition-colors border"
        :class="store.selectedArea === summary.area ? 'border-orange-500' : 'border-transparent'"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-200">{{ summary.area }}</span>
          <span class="text-xs text-gray-500">{{ formatTime(summary.lastCollectTime) }}</span>
        </div>
        <div class="flex items-end gap-2 mb-2">
          <span class="text-2xl font-bold text-green-400">{{ summary.online }}</span>
          <span class="text-sm text-gray-500">/ {{ summary.total }} 在线</span>
        </div>
        <div class="flex gap-3 text-xs">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            <span class="text-gray-400">离线 {{ summary.offline }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-600"></span>
            <span class="text-gray-400">严重 {{ summary.criticalAlarms }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span class="text-gray-400">警告 {{ summary.warningAlarms }}</span>
          </div>
        </div>
        <div class="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
            :style="{ width: summary.total > 0 ? (summary.online / summary.total * 100) + '%' : '0%' }"
          ></div>
        </div>
      </div>
    </div>

    <div class="flex-1 bg-gray-900 rounded-xl p-3 overflow-hidden">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm text-gray-400">
          拓扑视图 - {{ store.selectedArea || '全部区域' }}
          <span class="ml-2 text-gray-600">({{ displayDevices.length }} 台设备)</span>
        </h4>
        <div class="flex gap-3 text-xs text-gray-500">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>在线</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            <span>离线</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>有告警</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-3 h-[calc(100%-40px)] overflow-y-auto">
        <div
          v-for="device in displayDevices"
          :key="device.id"
          @click="store.selectedDevice = device"
          class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition-all border"
          :class="{
            'border-orange-500': store.selectedDevice?.id === device.id,
            'border-transparent': store.selectedDevice?.id !== device.id,
            'opacity-60': !device.online
          }"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="device.online ? 'bg-green-500' : 'bg-red-500'"
              ></span>
              <span class="text-sm font-medium text-gray-200 truncate">{{ device.name }}</span>
            </div>
            <div v-if="getDeviceAlarmCount(device.id) > 0" class="flex items-center gap-1">
              <span class="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">
                {{ getDeviceAlarmCount(device.id) }}
              </span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mb-2">{{ device.area }} · {{ device.ip }}</div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div v-for="reg in device.registers.slice(0, 2)" :key="reg.address" class="text-xs">
              <div class="text-gray-500">{{ reg.name }}</div>
              <div class="text-gray-300 font-medium">
                <span v-if="typeof reg.value === 'number'">
                  {{ reg.value.toFixed(reg.value > 100 ? 0 : 1) }}
                </span>
                <span v-else>{{ reg.value ? 'ON' : 'OFF' }}</span>
                <span class="text-gray-500 ml-0.5">{{ reg.unit }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-700">
            <span>最近采集</span>
            <span :class="device.online ? 'text-gray-400' : 'text-red-400'">
              {{ formatRelativeTime(device.lastCollectTime) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useModbusStore } from '../store/modbus'

const store = useModbusStore()

const displaySummaries = computed(() => {
  if (!store.selectedArea) return store.areaSummaries
  return store.areaSummaries.filter(s => s.area === store.selectedArea)
})

const displayDevices = computed(() => store.filteredDevices)

function getDeviceAlarmCount(deviceId: string): number {
  return store.alarms.filter(a => a.deviceId === deviceId && !a.acknowledged).length
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '--'
  const d = new Date(timestamp)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '--'
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  return Math.floor(diff / 86400000) + ' 天前'
}
</script>
