import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Database, Eye, FolderCog, Info, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db, getStorageEstimate } from '../db'
import { navigate } from '../hooks/useRoute'
import { fileSize, formatDate } from '../utils/format'

export function SettingsScreen() {
  const lastBackup = useLiveQuery(() => db.settings.get('lastBackupAt'), [], undefined)
  const showPrices = useLiveQuery(() => db.settings.get('showPricesInCollection'), [], undefined)
  const trashCount = useLiveQuery(() => db.items.filter((item) => item.deletedAt !== null).count(), [], 0)
  const [storage, setStorage] = useState<{ usage?: number; quota?: number } | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => { getStorageEstimate().then(setStorage).catch(() => setStorage(null)) }, [])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return (
    <main className="screen screen--with-nav settings-screen">
      <AppHeader title="設定" />
      <section className="settings-heading"><span>SETTINGS</span><h1>設定</h1><p>コレクションとデータを整えます。</p></section>
      <SettingsGroup title="コレクション設定">
        <SettingLink icon={<FolderCog />} label="カテゴリー管理" detail="追加・名称変更・並べ替え" onClick={() => navigate('categories')} />
        <label className="setting-toggle"><Eye aria-hidden="true" /><div><strong>一覧に購入価格を表示</strong><span>オフにしても詳細画面と統計には表示されます</span></div><input type="checkbox" checked={showPrices?.value !== false} onChange={(event) => db.settings.put({ key: 'showPricesInCollection', value: event.target.checked })} /></label>
      </SettingsGroup>
      <SettingsGroup title="データ管理">
        <SettingLink icon={<Database />} label="バックアップと復元" detail={lastBackup?.value ? `最終バックアップ ${formatDate(String(lastBackup.value).slice(0, 10))}` : 'バックアップはまだありません'} onClick={() => navigate('backup')} />
        <div className="setting-static"><RefreshCw aria-hidden="true" /><div><strong>端末内の保存容量</strong><span>{storage ? `${fileSize(storage.usage)} / ${fileSize(storage.quota)}` : '確認中…'}</span></div></div>
      </SettingsGroup>
      <SettingsGroup title="整理">
        <SettingLink icon={<Trash2 />} label="ゴミ箱" detail={`${trashCount}件`} onClick={() => navigate('trash')} danger={trashCount > 0} />
      </SettingsGroup>
      <SettingsGroup title="アプリ">
        <div className={online ? 'setting-static connection-state' : 'setting-static connection-state offline'}>{online ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}<div><strong>{online ? 'オンライン' : 'オフライン'}</strong><span>{online ? '更新の確認ができます' : '登録・検索・集計はそのまま使えます'}</span></div></div>
        <div className="setting-static"><Info aria-hidden="true" /><div><strong>Fashion Archive</strong><span>Version {__APP_VERSION__} · 端末内保存</span></div></div>
      </SettingsGroup>
      <p className="settings-note">登録内容と写真はこのiPhone内に保存されます。Safariのデータ消去や機種変更に備え、定期的にバックアップしてください。</p>
    </main>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="settings-group"><h2>{title}</h2><div>{children}</div></section>
}

function SettingLink({ icon, label, detail, onClick, danger = false }: { icon: React.ReactNode; label: string; detail: string; onClick: () => void; danger?: boolean }) {
  return <button className={danger ? 'setting-link danger' : 'setting-link'} type="button" onClick={onClick}>{icon}<div><strong>{label}</strong><span>{detail}</span></div><ChevronRight aria-hidden="true" /></button>
}
