import { AgentNode, AGENTIC_SETS } from '../../data/agents';
import { RUFLO_AGENTS } from '../../data/rufloAgents';
import { isLiteVideoModel } from '../llm/constants';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';

export class PromptBuilder {
  /**
   * Builds the system prompt for an agent based on their role and current project context.
   */
  public static buildSystemPrompt(agent: AgentNode, phase: string, brief: string, allAgents: any[]): string {
    const isLead = agent.index === 1;
    const team = allAgents
      .map((a: any) => `[${a.data.index}] ${a.data.name}`)
      .join(', ');

    const objectives = {
      idle: isLead ? 'Chat with [0] to define brief, then set_user_brief.' : 'Wait for Lead to start.',
      working: isLead ? 'Manage board. deliver_project when all Done.' : 'Complete tasks.',
      done: 'Project finished.'
    };

    const hiringRule = isLead
      ? `\n7. HIRING: When the user names a role or a skill is missing, call hire_agent. Prefer Ruflo catalog roles (${RUFLO_AGENTS.map((a) => a.id).join(', ')}). YOU write 'responsibilities'. NEVER ask the user what the role does. After hiring, give the newcomer a first task with propose_task.`
      : '';

    const tasks = useCoreStore.getState().tasks;
    const board = tasks.length > 0
      ? tasks.map(t => {
          const agentName = allAgents.find((a: any) => a.data.index === t.assignedAgentId)?.data?.name || `Agent ${t.assignedAgentId}`;
          
          const feedbackStr = t.reviewComments 
            ? `\n   >> USER FEEDBACK / REVISION REQUESTED: "${t.reviewComments}"` 
            : '';
            
          const outputStr = (t.status === 'done' && t.output)
            ? `\n   >> FINAL APPROVED WORK:\n   """\n   ${t.output}\n   """` 
            : '';

          return `* [${t.status.toUpperCase()}] ${t.title} (Owner: ${agentName})${feedbackStr}${outputStr}`;
        }).join('\n\n')
      : 'Empty';

    const selectedTeamId = useTeamStore.getState().selectedAgentSetId;
    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === selectedTeamId) 
      || AGENTIC_SETS.find(s => s.id === selectedTeamId);
      
    const referenceImages = useCoreStore.getState().referenceImages;
    const hasImages = referenceImages.length > 0 && (activeTeam?.outputType === 'image' || activeTeam?.outputType === 'video');
    
    let modelLimitInfo = '';
    if (activeTeam?.outputType === 'video') {
      if (isLiteVideoModel(activeTeam.outputModel)) {
        modelLimitInfo = ` Note: The current model (${activeTeam.outputModel}) supports only 1 reference image for animation.`;
      } else {
        modelLimitInfo = ` Note: The current model (${activeTeam.outputModel}) supports up to 3 reference images for style and content guidance.`;
      }
    }

    const imageInstruction = hasImages
      ? `\n6. REFERENCE IMAGES: The user has provided ${referenceImages.length} reference image(s). You MUST use these as a visual guide for the project's style, mood, and content. Your team should analyze these to ensure the final ${activeTeam?.outputType} aligns with the inspiration.${modelLimitInfo}`
      : '';

    const outputInstruction = activeTeam?.outputType !== 'text' 
      ? `\n4. TEAM OUTPUT: ${activeTeam?.outputType?.toUpperCase()}. Your 'deliver_project' output MUST be a highly detailed PROMPT for a ${activeTeam?.outputType} generator model (${activeTeam?.outputModel}).
CRITICAL: You MUST synthesize all subagent findings, research results, and any user feedback into this final prompt. DO NOT just repeat your initial brief.
The generation model expects a SINGLE prompt to produce a SINGLE ${activeTeam?.outputType}. Be precise.`
      : '';

    const pendingReviews = tasks.filter(t => t.assignedAgentId === agent.index && t.reviewComments);
    const reviewContext = pendingReviews.length > 0
      ? `\nREVISION REQUESTED:\n${pendingReviews.map(t => `- [${t.title}] Feedback: ${t.reviewComments}`).join('\n')}`
      : '';

    const knowledge = useCoreStore.getState().sharedKnowledge;
    const mine = knowledge.filter(
      (k) => !k.assignedAgentIndexes?.length || k.assignedAgentIndexes.includes(agent.index),
    );
    const shared = knowledge.filter(
      (k) => k.assignedAgentIndexes?.length && !k.assignedAgentIndexes.includes(agent.index),
    );
    const pick = [...mine.slice(-16), ...shared.slice(-6)];
    const knowledgeBlock = pick.length > 0
      ? `\nTEAM KNOWLEDGE BASE (${knowledge.length} total, showing ${pick.length} for you):\n${pick.map(k => {
          const mineTag = k.assignedAgentIndexes?.includes(agent.index) ? ' [YOUR BRAIN]' : '';
          return `* [${k.authorName}]${mineTag} ${k.topic}: ${k.insight}${k.tags.length ? ` #${k.tags.join(' #')}` : ''}`;
        }).join('\n')}`
      : '\nTEAM KNOWLEDGE BASE: Empty. Use share_insight to publish durable findings for peers.';

    const summary = useCoreStore.getState().agentSummaries[agent.index];
    const summaryBlock = summary
      ? `\nYOUR BRAIN SUMMARY:\n${summary.slice(0, 1500)}`
      : '';

    return `ID: ${agent.name}. Role: ${agent.description}. Phase: ${phase}.
${brief ? `Brief: ${brief}` : ''}${reviewContext}${summaryBlock}
Team: User (0), ${team}
KANBAN:
${board}${knowledgeBlock}
RULES:
1. MAX 30 WORDS for chat. Systemic outputs ('complete_task', 'deliver_project', and the task titles/descriptions you create) MUST be under 100 WORDS. NO conversational filler, intros, outros, or self-attribution ("I have done..."). Focus exclusively on core data and synthesis.
2. Tools only in WORKING (except set_user_brief in IDLE).
3. QUALITY: If your node has 'Human-in-the-loop' enabled, your 'complete_task' result will be reviewed by the user before completion. 
4. NO META-TALK: Avoid "I have finished X", "Here is the result". Use the tool payload for content and Chat for conversation only.${outputInstruction}${imageInstruction}
5. LANGUAGE: Default language is Uzbek (Oʻzbekcha). Generate all systemic outputs (tasks, complete_task results, deliver_project, chat) in Uzbek unless the user clearly writes in another language — then match that language.
6. KNOWLEDGE: After meaningful research or decisions, call share_insight so other agents can reuse it. Prefer request_peer_review before high-risk delivery.${hiringRule}
8. SOCIAL: Instagram tools (instagram_publish_photo/reel, instagram_insights) and Telegram tools (telegram_send_message/photo, telegram_get_chat) are available when the user connected tokens in Integratsiyalar. Photos/reels need public HTTPS URLs — not base64. Use set_agent_model when the user asks to switch an agent to OpenAI, Gemini, or Claude.
9. MODELS: Each agent may have its own provider/model. Do not invent prefer_model — call set_agent_model instead.
10. FILES: If the user attached files and asked to do the work, call return_file with the SAME extension/mime they sent. Do the requested edit/generation. Do not only describe — deliver the file.
Goal: ${objectives[phase as keyof typeof objectives] || ''}`;
  }
}
