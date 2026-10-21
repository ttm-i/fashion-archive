import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ShieldAlert, X } from 'lucide-react'
import { db } from '../db'
import { navigate } from '../hooks/useRoute'

const DAY = 24 * 60 * 60 * 1000

export function BackupReminder() {
  const itemCount = useLiveQuery(() => db.items.filter((item) => item.deletedAt === null).count(), [], 0)
  const lastBackup = useLiveQuery(() => db.settings.get('lastBackupAt'), [], undefined)
  const changes = useLiveQuery(() => db.settings.get('changesSinceBackup'), [], undefined)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('backupReminderDismissed') === '1')

  const message = useMemo(() => {
    const changeCount = Number(changes?.value ?? 0)
    const lastBackupAt = lastBackup?.value ? new Date(String(lastBackup.value)) : null
    if (!lastBackupAt && itemCount >= 3) return '最初のバックアップを作成して、写真と記録を守りましょう。'
    if (changeCount >= 5) return 'バックアップ後に複数の変更があります。最新の状態を保存しましょう。'
    if (changeCount > 0 && lastBackupAt && Date.now() - lastBackupAt.getTime() >= 30 * DAY) return '前回のバックアップから30日以上経過しています。'
    return ''
  }, [changes?.value, itemCount, lastBackup?.value])

  if (!message || dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem('backupReminderDismissed', '1')
    setDismissed(true)
  }

  return <aside className="backup-reminder" role="status"><ShieldAlert aria-hidden="true" /><div><strong>バックアップをおすすめします</strong><span>{message}</span><button type="button" onClick={() => navigate('backup')}>バックアップ画面へ</button></div><button className="backup-reminder__close" type="button" onClick={dismiss} aria-label="今回は閉じる"><X aria-hidden="true" /></button></aside>
}
