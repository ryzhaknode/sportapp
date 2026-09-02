import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'

const PORT = 3000
const DOCKER_BRIDGE_PREFIX = '192.168.64.'

const isValidLanIp = (ip) => {
  if (!ip || ip.startsWith('127.') || ip.startsWith(DOCKER_BRIDGE_PREFIX)) {
    return false
  }

  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d+\.\d+$/.test(ip)
}

const getIpFromInterface = (name) => {
  try {
    const ip = execSync(`ipconfig getifaddr ${name}`, { encoding: 'utf8' }).trim()
    return isValidLanIp(ip) ? ip : null
  } catch {
    return null
  }
}

const getIpFromNetworkInterfaces = () => {
  const interfaces = os.networkInterfaces()
  const preferred = ['en0', 'en1', 'wlan0', 'eth0']

  for (const name of preferred) {
    const addrs = interfaces[name]
    if (!addrs) continue

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && isValidLanIp(addr.address)) {
        return addr.address
      }
    }
  }

  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && isValidLanIp(addr.address)) {
        return addr.address
      }
    }
  }

  return null
}

const detectLanIp = () => {
  const preferredInterfaces = ['en0', 'en1', 'wlan0', 'eth0']

  for (const iface of preferredInterfaces) {
    const ip = getIpFromInterface(iface)
    if (ip) return ip
  }

  return getIpFromNetworkInterfaces()
}

const updateEnvFile = (mobileUrl) => {
  const envPath = join(process.cwd(), '.env')
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''

  const lines = existing
    .split('\n')
    .filter((line) => !line.startsWith('MOBILE_URL=') && !line.startsWith('NEXT_PUBLIC_MOBILE_URL='))

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  lines.push(`MOBILE_URL=${mobileUrl}`)
  lines.push(`NEXT_PUBLIC_MOBILE_URL=${mobileUrl}`)
  lines.push('')

  writeFileSync(envPath, lines.join('\n'))
}

const ip = detectLanIp()

if (!ip) {
  console.error('Could not detect LAN IP. Connect to Wi-Fi and try again.')
  process.exit(1)
}

const mobileUrl = `http://${ip}:${PORT}`
updateEnvFile(mobileUrl)
console.log(`MOBILE_URL set to ${mobileUrl}`)
