export const uz = {
  // Header / global
  manageTeams: 'Jamoalarni boshqarish',
  knowledge: 'Bilimlar',
  apiKey: 'API kalit',
  openaiTitle: 'OpenAI API kalit',
  getApiKey: 'OpenAI kalit olish',
  keyHint: 'Kalit brauzeringizda saqlanadi va serverga yuborilmaydi.',
  apiError: 'API xatosi',
  clear: 'Tozalash',
  save: 'Saqlash',
  cancel: 'Bekor qilish',
  pasteKey: 'API kalitingizni shu yerga qoʻying',
  fullscreen: 'Butun ekran',
  viewOnGithub: 'GitHubda koʻrish',

  // Project view
  projectInfo: 'Loyiha maʼlumoti',
  userBrief: 'Foydalanuvchi brifi',
  readyToStart: 'Boshlashga tayyor',
  working: 'Ishlamoqda',
  noBrief: 'Faol brif yoʻq. Loyihani belgilash uchun bosh agent bilan gaplashing.',
  newProject: 'Yangi loyiha',
  briefReferences: 'Brif uchun namunalar',

  // Logs
  logs: 'Loglar',
  activity: 'Faoliyat',
  technical: 'Texnik',
  awaitingActions: 'Harakatlar kutilmoqda...',
  systemInstruction: 'Tizim koʻrsatmasi',
  responseDetails: 'Javob tafsilotlari',
  toolCalls: 'Tool chaqiruvlari',
  args: 'Argumentlar',
  noArgs: 'Argument yoʻq',
  rawResponse: 'Xom LLM javobi',
  copyToClipboard: 'Nusxa olish',
  filterByAgent: 'Agent boʻyicha filtr',
  downloadTxt: 'Hammasini .txt qilib yuklash',

  // Kanban
  scheduled: 'Rejada',
  onHold: 'Kutishda',
  inProgress: 'Jarayonda',
  done: 'Tugadi',
  empty: 'Boʻsh',
  removeTask: 'Vazifani oʻchirish',
  viewWorkDetails: 'Ish tafsilotlarini koʻrish',

  // Team output
  autoApprove: 'AVTO TASDIQ',
  manualReview: 'QOʻLDA TEKSHIRUV',
  generationModel: 'Generatsiya modeli',
  generationModelHint: 'Yakuniy generatsiya uchun OpenAI modelini tanlang. Mini modellar tezroq, katta modellar kuchliroq.',

  // Tokens / pricing
  tokenUsage: 'Token sarfi',
  totalEst: 'Jami taxminiy',
  pricingTitle: 'OpenAI API narxlari',
  pricingSubtitle: 'OpenAI rasmiy narxlari (taxminiy).',
  officialPricing: 'Rasmiy narx sahifasi',
  reasoningModels: 'Matn modellari',

  // Knowledge base
  teamKnowledge: 'Jamoa bilim bazasi',
  insights: 'ta bilim',
  noInsights: 'Hali umumiy bilim yoʻq.',
  knowledgeHint: 'Agentlar share_insight orqali umumiy xotira yozadi.',

  // Agent config
  selectAgent: 'Agentni tanlang',
  editTeam: 'Jamoani tahrirlash',
  teamColor: 'Jamoa rangi',
  teamName: 'Jamoa nomi',
  teamType: 'Jamoa turi',
  description: 'Tavsif',
  outputType: 'Natija turi',
  outputModel: 'Natija modeli',
  saveChanges: 'Oʻzgarishlarni saqlash',
  active: 'Faol',
  switch: 'Almashtirish',
  agentColor: 'Agent rangi',
  model: 'Model',
  modelHint: 'Bu agent ishlatadigan OpenAI modeli.',
  primaryUser: 'Asosiy foydalanuvchi',
  descriptionPlaceholder: 'Bu agent nimaga ixtisoslashgan? Asosiy maqsad va cheklovlari qanday?',
  noDescription: 'Tavsif berilmagan.',

  // Chat
  messagePlaceholder: 'Xabar (↵ yuborish)',

  // Review / audit
  requiresReview: 'Tekshiruv kerak',
  reviewRequested: 'Tekshiruv soʻralgan',
  activeReview: 'Faol tekshiruv',
  versionHistory: 'Versiyalar tarixi',
  yourFeedback: 'Sizning fikringiz',
  feedbackPlaceholder: 'Rad etishdan oldin nima oʻzgarishi kerakligini yozing...',
  projectReady: 'Loyiha tayyor',
  systemInformation: 'Tizim maʼlumoti',
  team: 'Jamoa',
  visualInspiration: 'Vizual namuna',
  promptPlaceholder: 'Yakuniy generatsiya promptini kiriting...',
  referenceImages: 'Namuna rasmlar',
  add: 'Qoʻshish',
} as const;

export type UzKey = keyof typeof uz;
