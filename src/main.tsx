import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initializeDatabase, requestPersistentStorage } from './db'
import './styles.css'

async function start() {
  await initializeDatabase()
  requestPersistentStorage().catch(() => false)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start().catch((error) => {
  console.error(error)
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<main class="fatal-error"><h1>Fashion Archive</h1><p>アプリを開始できませんでした。Safariを閉じて、もう一度お試しください。</p></main>'
})
