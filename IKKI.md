# Ikki Miya — The Delegation (local fork)

Open-source multi-agent 3D office based on [arturitu/the-delegation](https://github.com/arturitu/the-delegation).

## Run

```bash
npm install
npm run dev
```

Open: http://localhost:3000/the-delegation/

Gemini API key kerak (BYOK): app ichida **API Key** tugmasi yoki `.env` ichida `GEMINI_API_KEY`.

## Ikki Miya upgrades (v0.2.1-ikki)

- Default team: **Ikki Miya** — 7 agentli nested Startup Lab (CEO → Product/Growth/Tech + Analyst/Content/Finance)
- `MAX_AGENTS` 5 → 8
- Shared **Team Knowledge Base** (`share_insight` tool + Knowledge UI)
- `request_peer_review` tool — agentlar bir-birining ishini tekshirishi mumkin
- PromptBuilder knowledge context + peer-review guidance
