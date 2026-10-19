export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
  if (process.env.ITQAN_USE_D1 === '1') return
  const globalState = globalThis as typeof globalThis & { itqanBackupTimer?: ReturnType<typeof setInterval> }
  if (globalState.itqanBackupTimer) return
  const { runDailyBackup } = await import('./lib/system/backups')
  let running = false
  const tick = async () => { if (running) return; running = true; try { await runDailyBackup() } catch { console.error('Daily backup failed; inspect backup settings') } finally { running = false } }
  globalState.itqanBackupTimer = setInterval(() => void tick(), 60000)
  globalState.itqanBackupTimer.unref()
  void tick()
  }
}
