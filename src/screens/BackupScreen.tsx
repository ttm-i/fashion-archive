import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, Download, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { db } from '../db'
import { navigate } from '../hooks/useRoute'
import type { BackupManifest } from '../types'
import { createBackup, downloadBackup, exportCsv, inspectBackup, restoreBackup } from '../utils/backup'
import { formatDate } from '../utils/format'

export function BackupScreen() {
  const itemCount = useLiveQuery(() => db.items.count(), [], 0)
  const imageCount = useLiveQuery(() => db.images.count(), [], 0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<{ file: File; manifest: BackupManifest } | null>(null)

  const backup = async () => {
    setBusy(true); setError(''); setMessage('バックアップを作成しています…')
    try {
      const result = await createBackup()
      downloadBackup(result.blob, result.manifest.createdAt)
      setMessage('バックアップを作成しました。「ファイル」に保存されたことをご確認ください。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'バックアップを作成できませんでした。')
      setMessage('')
    } finally { setBusy(false) }
  }

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true); setError(''); setMessage('バックアップを確認しています…'); setSelected(null)
    try {
      const contents = await inspectBackup(file)
      setSelected({ file, manifest: contents.manifest })
      setMessage('バックアップを確認しました。内容を確認して復元してください。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'バックアップを読み込めませんでした。')
      setMessage('')
    } finally { setBusy(false) }
  }

  const restore = async () => {
    if (!selected) return
    if (!window.confirm('現在のデータをバックアップ内のデータで置き換えます。先に現在のバックアップを保存しましたか？')) return
    setBusy(true); setError(''); setMessage('復元しています。画面を閉じないでください…')
    try {
      const manifest = await restoreBackup(selected.file)
      setMessage(`${manifest.itemCount}件のアイテムを復元しました。`)
      setSelected(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '復元できませんでした。現在のデータは変更されていません。')
      setMessage('')
    } finally { setBusy(false) }
  }

  return <main className="screen sub-screen backup-screen"><AppHeader title="バックアップと復元" back={() => navigate('settings')} />
    <section className="sub-heading"><span>DATA SAFETY</span><h1>データを守る</h1><p>写真を含む完全バックアップを定期的に保存してください。</p></section>
    <section className="backup-summary"><ShieldCheck aria-hidden="true" /><div><strong>{itemCount} items · {imageCount} photos</strong><span>このiPhoneに保存されています</span></div></section>
    <section className="backup-card"><div className="backup-card__icon"><Download aria-hidden="true" /></div><div><span>COMPLETE BACKUP</span><h2>バックアップを作成</h2><p>アイテム、写真、カテゴリー、設定を1つのZIPファイルにまとめます。</p></div><button className="primary-button block" type="button" onClick={backup} disabled={busy}>バックアップを作成</button></section>
    <section className="backup-card"><div className="backup-card__icon"><ArchiveRestore aria-hidden="true" /></div><div><span>RESTORE</span><h2>バックアップから復元</h2><p>現在のデータを、選択したバックアップの内容で置き換えます。</p></div><input ref={fileRef} className="sr-only" type="file" accept=".zip,application/zip" onChange={(event) => choose(event.target.files?.[0])} /><button className="secondary-button block" type="button" onClick={() => fileRef.current?.click()} disabled={busy}><Upload aria-hidden="true" />ファイルを選択</button>
      {selected && <div className="restore-preview"><span>バックアップ日時</span><strong>{formatDate(selected.manifest.createdAt.slice(0, 10))}</strong><p>{selected.manifest.itemCount} items · {selected.manifest.imageCount} photos</p><button className="danger-button block" type="button" onClick={restore} disabled={busy}>置き換えて復元</button></div>}
    </section>
    <section className="backup-card compact"><div className="backup-card__icon"><FileSpreadsheet aria-hidden="true" /></div><div><span>CSV</span><h2>一覧を書き出す</h2><p>写真を除くアイテム情報を表計算用に保存します。</p></div><button className="secondary-button block" type="button" onClick={() => exportCsv().catch((reason) => setError(reason instanceof Error ? reason.message : 'CSVを書き出せませんでした。'))} disabled={busy}>CSVを書き出す</button></section>
    {message && <p className="status-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </main>
}
