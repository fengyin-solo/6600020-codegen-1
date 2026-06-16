export interface ModbusRegister {
  address: number
  name: string
  type: 'coil' | 'discrete' | 'holding' | 'input'
  value: number | boolean
  unit: string
  updatedAt: number
}

export interface Device {
  id: string
  name: string
  area: string
  ip: string
  port: number
  slaveId: number
  online: boolean
  lastCollectTime: number
  registers: ModbusRegister[]
}

export interface AreaSummary {
  area: string
  total: number
  online: number
  offline: number
  criticalAlarms: number
  warningAlarms: number
  lastCollectTime: number
}

export interface Alarm {
  id: string
  deviceId: string
  register: string
  message: string
  level: 'info' | 'warning' | 'critical'
  timestamp: number
  acknowledged: boolean
}
