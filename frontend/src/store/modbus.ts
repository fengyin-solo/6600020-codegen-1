import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Device, Alarm, ModbusRegister, AreaSummary } from '../types'

const STORAGE_KEY_AREA = 'modbus_selected_area'
const STORAGE_KEY_DEVICE = 'modbus_selected_device_id'

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export const useModbusStore = defineStore('modbus', () => {
  const devices = ref<Device[]>([])
  const alarms = ref<Alarm[]>([])
  const historyData = ref<Record<string, { time: number[]; values: number[] }>>({})
  const isPolling = ref(false)
  const pollInterval = ref(1000)
  const selectedDevice = ref<Device | null>(null)
  const selectedArea = ref<string | null>(loadFromStorage(STORAGE_KEY_AREA, null))
  const savedDeviceId = ref<string | null>(loadFromStorage(STORAGE_KEY_DEVICE, null))

  const criticalAlarms = computed(() => alarms.value.filter(a => a.level === 'critical' && !a.acknowledged))
  const onlineDevices = computed(() => devices.value.filter(d => d.online))

  const areas = computed(() => {
    const set = new Set(devices.value.map(d => d.area))
    return Array.from(set).sort()
  })

  const devicesByArea = computed(() => {
    const map: Record<string, Device[]> = {}
    for (const d of devices.value) {
      if (!map[d.area]) map[d.area] = []
      map[d.area].push(d)
    }
    return map
  })

  const areaSummaries = computed<AreaSummary[]>(() => {
    return areas.value.map(area => {
      const areaDevices = devicesByArea.value[area] || []
      const online = areaDevices.filter(d => d.online).length
      const areaDeviceIds = areaDevices.map(d => d.id)
      const areaAlarms = alarms.value.filter(a => areaDeviceIds.includes(a.deviceId) && !a.acknowledged)
      const criticalAlarms = areaAlarms.filter(a => a.level === 'critical').length
      const warningAlarms = areaAlarms.filter(a => a.level === 'warning').length
      const lastCollectTimes = areaDevices.map(d => d.lastCollectTime)
      const lastCollectTime = lastCollectTimes.length > 0 ? Math.max(...lastCollectTimes) : 0
      return {
        area,
        total: areaDevices.length,
        online,
        offline: areaDevices.length - online,
        criticalAlarms,
        warningAlarms,
        lastCollectTime
      }
    })
  })

  const filteredDevices = computed(() => {
    if (!selectedArea.value) return devices.value
    return devices.value.filter(d => d.area === selectedArea.value)
  })

  function initMockDevices() {
    const now = Date.now()
    devices.value = [
      {
        id: 'dev1', name: '温湿度传感器-1号', area: 'A区', ip: '192.168.1.101', port: 502, slaveId: 1, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '温度', type: 'holding', value: 25.6, unit: '°C', updatedAt: now },
          { address: 1, name: '湿度', type: 'holding', value: 62.3, unit: '%RH', updatedAt: now },
          { address: 2, name: '露点', type: 'holding', value: 17.8, unit: '°C', updatedAt: now },
        ]
      },
      {
        id: 'dev2', name: '压力变送器-1号', area: 'B区', ip: '192.168.1.102', port: 502, slaveId: 2, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '管道压力', type: 'holding', value: 3.45, unit: 'MPa', updatedAt: now },
          { address: 1, name: '差压', type: 'holding', value: 0.12, unit: 'kPa', updatedAt: now },
        ]
      },
      {
        id: 'dev3', name: '电机控制器-1号', area: 'C区', ip: '192.168.1.103', port: 502, slaveId: 3, online: false, lastCollectTime: now - 300000,
        registers: [
          { address: 0, name: '转速', type: 'holding', value: 1480, unit: 'RPM', updatedAt: now - 300000 },
          { address: 1, name: '电流', type: 'holding', value: 12.5, unit: 'A', updatedAt: now - 300000 },
          { address: 2, name: '运行状态', type: 'coil', value: true, unit: '', updatedAt: now - 300000 },
        ]
      },
      {
        id: 'dev4', name: '流量计-1号', area: 'D区', ip: '192.168.1.104', port: 502, slaveId: 4, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '瞬时流量', type: 'holding', value: 156.7, unit: 'L/min', updatedAt: now },
          { address: 1, name: '累计流量', type: 'holding', value: 98234, unit: 'L', updatedAt: now },
        ]
      },
      {
        id: 'dev5', name: '温湿度传感器-2号', area: 'A区', ip: '192.168.1.105', port: 502, slaveId: 5, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '温度', type: 'holding', value: 27.1, unit: '°C', updatedAt: now },
          { address: 1, name: '湿度', type: 'holding', value: 58.7, unit: '%RH', updatedAt: now },
        ]
      },
      {
        id: 'dev6', name: '压力变送器-2号', area: 'B区', ip: '192.168.1.106', port: 502, slaveId: 6, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '管道压力', type: 'holding', value: 2.89, unit: 'MPa', updatedAt: now },
        ]
      },
      {
        id: 'dev7', name: '电机控制器-2号', area: 'C区', ip: '192.168.1.107', port: 502, slaveId: 7, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '转速', type: 'holding', value: 2960, unit: 'RPM', updatedAt: now },
          { address: 1, name: '电流', type: 'holding', value: 8.3, unit: 'A', updatedAt: now },
        ]
      },
      {
        id: 'dev8', name: '阀门控制器', area: 'A区', ip: '192.168.1.108', port: 502, slaveId: 8, online: true, lastCollectTime: now,
        registers: [
          { address: 0, name: '阀门开度', type: 'holding', value: 75.5, unit: '%', updatedAt: now },
          { address: 1, name: '开关状态', type: 'coil', value: true, unit: '', updatedAt: now },
        ]
      },
    ]
    if (savedDeviceId.value) {
      const savedDevice = devices.value.find(d => d.id === savedDeviceId.value)
      selectedDevice.value = savedDevice || devices.value[0]
    } else {
      selectedDevice.value = devices.value[0]
    }
  }

  watch(selectedArea, (newVal) => {
    saveToStorage(STORAGE_KEY_AREA, newVal)
  })

  watch(selectedDevice, (newVal) => {
    if (newVal) {
      saveToStorage(STORAGE_KEY_DEVICE, newVal.id)
    }
  })

  function simulatePoll() {
    const now = Date.now()
    for (const dev of devices.value) {
      if (!dev.online) continue
      dev.lastCollectTime = now
      for (const reg of dev.registers) {
        if (typeof reg.value === 'number') {
          const noise = (Math.random() - 0.5) * reg.value * 0.02
          reg.value = Math.round((reg.value + noise) * 100) / 100
          reg.updatedAt = Date.now()
          const key = `${dev.id}_${reg.address}`
          if (!historyData.value[key]) historyData.value[key] = { time: [], values: [] }
          historyData.value[key].time.push(Date.now())
          historyData.value[key].values.push(reg.value)
          if (historyData.value[key].time.length > 100) {
            historyData.value[key].time.shift()
            historyData.value[key].values.shift()
          }
          // Check thresholds
          if (reg.name === '温度' && reg.value > 28) {
            alarms.value.unshift({
              id: `a_${Date.now()}`, deviceId: dev.id, register: reg.name,
              message: `${dev.name} ${reg.name}超限: ${reg.value}${reg.unit}`,
              level: reg.value > 30 ? 'critical' : 'warning',
              timestamp: Date.now(), acknowledged: false
            })
          }
        }
      }
    }
    if (alarms.value.length > 50) alarms.value = alarms.value.slice(0, 50)
  }

  function acknowledgeAlarm(id: string) {
    const a = alarms.value.find(a => a.id === id)
    if (a) a.acknowledged = true
  }

  function toggleDevice(id: string) {
    const d = devices.value.find(d => d.id === id)
    if (d) d.online = !d.online
  }

  return {
    devices, alarms, historyData, isPolling, pollInterval, selectedDevice, selectedArea,
    criticalAlarms, onlineDevices, areas, devicesByArea, areaSummaries, filteredDevices,
    initMockDevices, simulatePoll, acknowledgeAlarm, toggleDevice
  }
})
