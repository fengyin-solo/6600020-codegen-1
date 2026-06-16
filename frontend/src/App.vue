<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-64 bg-gray-900 p-4 flex flex-col gap-3 border-r border-gray-800 overflow-y-auto">
      <h1 class="text-lg font-bold text-orange-400">Modbus 工业监控</h1>
      <div class="flex gap-2">
        <button @click="startPoll" :disabled="store.isPolling" class="flex-1 bg-green-700 py-1.5 rounded text-xs hover:bg-green-600 disabled:opacity-50">
          {{ store.isPolling ? '采集中...' : '开始采集' }}
        </button>
        <button @click="stopPoll" :disabled="!store.isPolling" class="flex-1 bg-red-700 py-1.5 rounded text-xs hover:bg-red-600 disabled:opacity-50">
          停止
        </button>
      </div>
      <div>
        <label class="text-gray-400 text-xs">轮询间隔: {{ store.pollInterval }}ms</label>
        <input type="range" v-model.number="store.pollInterval" min="200" max="5000" step="100" class="w-full" />
      </div>

      <h3 class="text-gray-400 text-xs mt-2">设备列表</h3>
      <div v-for="area in store.areas" :key="area" class="mb-2">
        <div class="text-xs text-gray-500 mb-1 flex justify-between">
          <span>{{ area }}</span>
          <span>{{ store.devicesByArea[area]?.filter(d => d.online).length }}/{{ store.devicesByArea[area]?.length }}</span>
        </div>
        <div v-for="d in store.devicesByArea[area]" :key="d.id" @click="store.selectedDevice = d"
          class="bg-gray-800 rounded p-2 cursor-pointer text-sm mb-1"
          :class="store.selectedDevice?.id === d.id ? 'ring-1 ring-orange-500' : ''">
          <div class="flex justify-between">
            <span class="truncate">{{ d.name }}</span>
            <span class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" :class="d.online ? 'bg-green-500' : 'bg-red-500'"></span>
          </div>
          <div class="text-xs text-gray-500 truncate">{{ d.ip }}:{{ d.port }} [{{ d.slaveId }}]</div>
        </div>
      </div>

      <div v-if="store.criticalAlarms.length" class="bg-red-900/50 rounded p-2 mt-2">
        <h4 class="text-red-400 text-xs font-bold">⚠ 严重告警 {{ store.criticalAlarms.length }}</h4>
        <div v-for="a in store.criticalAlarms.slice(0, 3)" :key="a.id" class="text-xs text-red-300 mt-1 truncate">
          {{ a.message }}
        </div>
      </div>

      <div class="text-xs text-gray-600 mt-auto">
        在线: {{ store.onlineDevices.length }}/{{ store.devices.length }}
      </div>
    </div>

    <!-- Main Dashboard -->
    <div class="flex-1 flex flex-col p-4 overflow-hidden">
      <div class="flex gap-2 mb-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm rounded-lg transition-colors"
          :class="activeTab === tab.key
            ? 'bg-orange-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-show="activeTab === 'monitor'" class="flex-1 flex flex-col gap-3 overflow-y-auto">
        <div class="grid grid-cols-4 gap-3">
          <template v-for="d in store.filteredDevices" :key="d.id">
            <div v-for="r in d.registers" :key="`${d.id}_${r.address}`"
              class="bg-gray-900 rounded-xl p-3">
              <div class="text-xs text-gray-400">{{ d.name }}</div>
              <div class="text-2xl font-bold" :class="d.online ? 'text-orange-400' : 'text-gray-600'">
                {{ typeof r.value === 'number' ? r.value.toFixed(r.value > 100 ? 0 : 1) : r.value ? 'ON' : 'OFF' }}
              </div>
              <div class="text-xs text-gray-500">{{ r.name }} {{ r.unit }}</div>
            </div>
          </template>
        </div>

        <div class="bg-gray-900 rounded-xl p-3 flex-1">
          <h3 class="text-sm text-gray-400 mb-2">
            实时趋势 — {{ store.selectedDevice?.name || '选择设备' }}
          </h3>
          <TrendChart />
        </div>

        <div class="bg-gray-900 rounded-xl p-3 max-h-48 overflow-y-auto">
          <h3 class="text-sm text-gray-400 mb-2">告警记录</h3>
          <div v-for="a in store.alarms.slice(0, 10)" :key="a.id"
            class="flex justify-between text-xs bg-gray-800 rounded p-2 mb-1"
            :class="{ 'border-l-4 border-red-500': a.level === 'critical', 'border-l-4 border-yellow-500': a.level === 'warning' }">
            <span>{{ a.message }}</span>
            <div class="flex gap-2">
              <span class="text-gray-500">{{ new Date(a.timestamp).toLocaleTimeString() }}</span>
              <button v-if="!a.acknowledged" @click="store.acknowledgeAlarm(a.id)" class="text-blue-400 hover:underline">确认</button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'topology'" class="flex-1 overflow-hidden">
        <DeviceTopology />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useModbusStore } from './store/modbus'
import TrendChart from './components/TrendChart.vue'
import DeviceTopology from './components/DeviceTopology.vue'

const store = useModbusStore()
let timer: number | null = null

const tabs = [
  { key: 'monitor', label: '实时监控' },
  { key: 'topology', label: '设备拓扑' }
]
const activeTab = ref('topology')

function startPoll() {
  store.isPolling = true
  timer = window.setInterval(() => store.simulatePoll(), store.pollInterval)
}

function stopPoll() {
  store.isPolling = false
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(() => store.initMockDevices())
onUnmounted(() => stopPoll())
</script>
