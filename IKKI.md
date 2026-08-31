# Ikki Miya — The Delegation (local fork)

Open-source multi-agent 3D office based on [arturitu/the-delegation](https://github.com/arturitu/the-delegation).

Live: https://umidbaxtiyorvich.github.io/the-delegation/

## Run

```bash
npm install
npm run dev
```

Open: http://localhost:3000/

OpenAI API kaliti kerak. Lokalda `.env` faylga yozing, saytda esa **API kalit** tugmasi orqali kiriting
(production build'da kalit bundle'ga qo'shilmaydi — har bir foydalanuvchi o'zinikini kiritadi).

```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
```

## Ikki Miya upgrades (v0.2.1-ikki)

- LLM provayderi **Gemini → OpenAI** (`OpenAIProvider`, ChatGPT modellari va DALL·E)
- Interfeys **o'zbek tilida** (`src/i18n/uz.ts`)
- Default jamoa: **Ikki Miya** — 7 agentli nested Startup Lab (CEO → Product/Growth/Tech + Analyst/Content/Finance)
- `MAX_AGENTS` 5 → 12
- Shared **Team Knowledge Base** (`share_insight` tool + Knowledge UI)
- `request_peer_review` tool — agentlar bir-birining ishini tekshirishi mumkin
- **`hire_agent` tool** — direktor ish jarayonida yangi mutaxassis yollashi mumkin (pastda batafsil)
- GitHub Pages deploy Actions workflow orqali (`.github/workflows/deploy.yml`)

## Yangi agent yollash (`hire_agent`)

Foydalanuvchi direktorga "buxgalter oling" desa, direktor **o'zi** rol vazifalarini
tahlil qiladi va yangi agent yaratadi — foydalanuvchidan tushuntirish so'ramaydi.

Oqim:

1. `hire_agent` tooli jamoa daraxtiga yangi `AgentNode` qo'shadi
   (bo'sh index, ranг, model va graf pozitsiyasi avtomatik tanlanadi).
2. `teamStore` yangilanadi → `SceneManager` jamoa tarkibi o'zgarganini sezadi.
3. `AgentSimulation.syncAgents()` mavjud agentlarni buzmasdan yangi `AgentHost` qo'shadi.
4. 3D instans buferi kengayadi va yangi personaj ofisda paydo bo'ladi.
5. `scheduleOnboarding()` direktor navbatini tugatishini kutib, unga yangi agent uchun
   vazifa berishni eslatadi — shunda yangi agent darhol ishga tushadi.

Cheklovlar: bir xil nomli rol ikki marta yollanmaydi, `MAX_AGENTS` (12) dan oshmaydi.
