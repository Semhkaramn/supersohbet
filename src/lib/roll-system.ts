// Roll Sistemi - Hafıza Tabanlı (Python bot benzeri)

interface UserData {
  name: string
  count: number
  lastActive: number
}

interface RollState {
  status: 'active' | 'paused' | 'stopped' | 'break' | 'locked'
  activeDuration: number // dakika
  currentStep: number
  stepsData: Record<number, Record<string, UserData>> // {1: {userId: userData}, 2: {...}}
  tempActiveUsers: Record<string, UserData> // Henüz adıma kaydedilmemiş
  previousStatus: 'active' | 'paused' | null
  groupId: string
}

// Her grup için ayrı state (bellekte)
const rollStates: Record<string, RollState> = {}

export function getRollState(groupId: string): RollState {
  if (!rollStates[groupId]) {
    rollStates[groupId] = {
      status: 'stopped',
      activeDuration: 2,
      currentStep: 0,
      stepsData: {},
      tempActiveUsers: {},
      previousStatus: null,
      groupId
    }
  }
  return rollStates[groupId]
}

export function startRoll(groupId: string, duration: number): void {
  const state = getRollState(groupId)
  state.status = 'active'
  state.activeDuration = Math.max(1, duration)
  state.currentStep = 0
  state.stepsData = {}
  state.tempActiveUsers = {}
  state.previousStatus = null
}

export function pauseRoll(groupId: string): void {
  const state = getRollState(groupId)
  if (state.status === 'active') {
    state.status = 'paused'
  }
}

export function lockRoll(groupId: string): void {
  const state = getRollState(groupId)
  if (state.status === 'active' || state.status === 'paused') {
    state.status = 'locked'
  }
}

export function unlockRoll(groupId: string): void {
  const state = getRollState(groupId)
  if (state.status === 'locked') {
    state.status = 'active'
  }
}

export function startBreak(groupId: string): void {
  const state = getRollState(groupId)
  if (state.status !== 'stopped') {
    state.previousStatus = state.status as 'active' | 'paused'
    state.status = 'break'

    // Tüm kullanıcıların zamanlarını güncelle
    const now = Date.now()

    for (const uid in state.tempActiveUsers) {
      state.tempActiveUsers[uid].lastActive = now
    }

    for (const step in state.stepsData) {
      for (const uid in state.stepsData[step]) {
        state.stepsData[step][uid].lastActive = now
      }
    }
  }
}

export function resumeRoll(groupId: string): void {
  const state = getRollState(groupId)

  if (state.status === 'break') {
    state.status = state.previousStatus || 'active'
    state.previousStatus = null
  } else if (state.status === 'paused') {
    state.status = 'active'
  }

  // Tüm kullanıcıların zamanlarını güncelle
  const now = Date.now()

  for (const uid in state.tempActiveUsers) {
    state.tempActiveUsers[uid].lastActive = now
  }

  for (const step in state.stepsData) {
    for (const uid in state.stepsData[step]) {
      state.stepsData[step][uid].lastActive = now
    }
  }
}

export function stopRoll(groupId: string): void {
  const state = getRollState(groupId)
  state.status = 'stopped'
  // Verileri temizleme, bitir komutu sonuçları gösterecek
}

export function saveStep(groupId: string): { success: boolean; message: string; stepNumber: number } {
  const state = getRollState(groupId)

  if (state.status === 'stopped') {
    return { success: false, message: '⚠️ Roll aktif değil.', stepNumber: 0 }
  }

  // SADECE ACTIVE DURUMUNDA TEMİZLİK YAP
  if (state.status === 'active') {
    cleanInactiveUsers(groupId)
  }

  if (Object.keys(state.tempActiveUsers).length === 0) {
    return { success: false, message: '📭 Kaydedilecek aktif kullanıcı yok.', stepNumber: 0 }
  }

  // Yeni adım oluştur
  state.currentStep += 1
  state.stepsData[state.currentStep] = {}

  // Geçici aktif kullanıcıları bu adıma kaydet
  for (const uid in state.tempActiveUsers) {
    state.stepsData[state.currentStep][uid] = { ...state.tempActiveUsers[uid] }
  }

  // Geçici listeyi temizle
  state.tempActiveUsers = {}

  // Roll'u duraklat
  state.status = 'paused'

  return { success: true, message: '✅ Adım kaydedildi!', stepNumber: state.currentStep }
}

export function trackUserMessage(groupId: string, userId: string, username: string | null, firstName: string | null): void {
  const state = getRollState(groupId)

  // Sadece active veya locked durumunda izle
  if (state.status !== 'active' && state.status !== 'locked') return

  // Locked durumunda yeni kullanıcı girişine izin verme
  if (state.status === 'locked') {
    // Zaten listede olan kullanıcılar mesaj atabilir
    const existsInSteps = Object.values(state.stepsData).some(step => userId in step)
    const existsInTemp = userId in state.tempActiveUsers

    if (!existsInSteps && !existsInTemp) {
      return // Yeni kullanıcı giremez
    }
  }

  const name = username ? `@${username}` : firstName || 'Kullanıcı'
  const now = Date.now()

  // Kullanıcının hangi adımda olduğunu kontrol et
  let foundInStep = false

  for (const stepNum in state.stepsData) {
    if (userId in state.stepsData[stepNum]) {
      state.stepsData[stepNum][userId].lastActive = now
      state.stepsData[stepNum][userId].count += 1
      state.stepsData[stepNum][userId].name = name
      foundInStep = true
      break
    }
  }

  // Hiçbir adımda değilse, geçici listeye ekle
  if (!foundInStep) {
    if (userId in state.tempActiveUsers) {
      state.tempActiveUsers[userId].lastActive = now
      state.tempActiveUsers[userId].count += 1
      state.tempActiveUsers[userId].name = name
    } else {
      state.tempActiveUsers[userId] = {
        name,
        lastActive: now,
        count: 1
      }
    }
  }
}

export function cleanInactiveUsers(groupId: string): void {
  const state = getRollState(groupId)
  const now = Date.now()
  const timeout = state.activeDuration * 60 * 1000 // Milisaniye cinsine çevir

  // Geçici listeden temizle
  for (const uid in state.tempActiveUsers) {
    if (now - state.tempActiveUsers[uid].lastActive > timeout) {
      delete state.tempActiveUsers[uid]
    }
  }

  // Her adımdan temizle
  for (const stepNum in state.stepsData) {
    for (const uid in state.stepsData[stepNum]) {
      if (now - state.stepsData[stepNum][uid].lastActive > timeout) {
        delete state.stepsData[stepNum][uid]
      }
    }

    // Adım boşaldıysa sil
    if (Object.keys(state.stepsData[stepNum]).length === 0) {
      delete state.stepsData[stepNum]
    }
  }
}

export function formatRankedList(usersDict: Record<string, UserData>, showStep?: number): string {
  const users = Object.values(usersDict)

  if (users.length === 0) {
    return '📭 Kullanıcı yok.'
  }

  const sorted = users.sort((a, b) => b.count - a.count)
  const header = showStep ? `📍 Adım ${showStep}\n` : ''

  return header + sorted.map(u => `✅ ${u.name} • ${u.count} ✉️`).join('\n')
}

export function getStatusList(groupId: string): string {
  const state = getRollState(groupId)

  if (state.status === 'stopped') {
    return '📌 Roll şu anda aktif değil.'
  }

  // SADECE ACTIVE DURUMUNDA TEMİZLİK YAP
  if (state.status === 'active') {
    cleanInactiveUsers(groupId)
  }

  let statusText = ''
  switch (state.status) {
    case 'active':
      statusText = '▶️ Aktif'
      break
    case 'paused':
      statusText = '⏸ Duraklatıldı'
      break
    case 'break':
      statusText = '☕ Molada'
      break
    case 'locked':
      statusText = '🔒 Kilitli (Yeni Giriş Kapalı)'
      break
    default:
      statusText = '❓ Bilinmiyor'
  }

  const msgParts = [`📊 Roll Durumu: ${statusText} (⏳ ${state.activeDuration} dk kuralı)\n`]

  // Kaydedilmiş adımlar
  const sortedSteps = Object.keys(state.stepsData).map(Number).sort((a, b) => a - b)
  for (const stepNum of sortedSteps) {
    const stepList = formatRankedList(state.stepsData[stepNum], stepNum)
    msgParts.push(`\n${stepList}`)
  }

  // Henüz kaydedilmemiş aktif kullanıcılar
  if (Object.keys(state.tempActiveUsers).length > 0) {
    const nextStep = sortedSteps.length > 0 ? Math.max(...sortedSteps) + 1 : 1
    const tempList = formatRankedList(state.tempActiveUsers, nextStep)
    msgParts.push(`\n${tempList}`)
  }

  if (sortedSteps.length === 0 && Object.keys(state.tempActiveUsers).length === 0) {
    msgParts.push('\n📭 Henüz kullanıcı yok.')
  }

  return msgParts.join('')
}

export function getStepList(groupId: string): string {
  const state = getRollState(groupId)
  const msgParts: string[] = []

  // Tüm adımları göster
  const sortedSteps = Object.keys(state.stepsData).map(Number).sort((a, b) => a - b)
  for (const stepNum of sortedSteps) {
    const stepList = formatRankedList(state.stepsData[stepNum], stepNum)
    msgParts.push(stepList)
  }

  // Henüz kaydedilmemiş aktif kullanıcılar
  if (Object.keys(state.tempActiveUsers).length > 0) {
    const nextStep = sortedSteps.length > 0 ? Math.max(...sortedSteps) + 1 : 1
    const tempList = formatRankedList(state.tempActiveUsers, nextStep)
    msgParts.push(tempList)
  }

  return msgParts.join('\n\n')
}

export function clearRollData(groupId: string): void {
  const state = getRollState(groupId)
  state.stepsData = {}
  state.tempActiveUsers = {}
  state.currentStep = 0
}
