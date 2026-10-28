// 디스코드에 슬래시 명령어를 등록한다 (명령어를 바꿀 때마다 한 번 실행).
// 사용법: DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/discord-register.ts
import { DISCORD_COMMANDS } from '../src/discord.ts'

const appId = process.env.DISCORD_APP_ID
const token = process.env.DISCORD_BOT_TOKEN
if (!appId || !token) {
  console.error('DISCORD_APP_ID 와 DISCORD_BOT_TOKEN 이 필요합니다')
  process.exit(1)
}

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(DISCORD_COMMANDS),
})
const body = await res.text()
if (!res.ok) {
  console.error(`등록 실패 (HTTP ${res.status}): ${body}`)
  process.exit(1)
}
const names = (JSON.parse(body) as { name: string; name_localizations?: { ko?: string } }[]).map(
  (c) => `/${c.name_localizations?.ko ?? c.name}`,
)
console.log(`등록 완료: ${names.join(', ')}`)
