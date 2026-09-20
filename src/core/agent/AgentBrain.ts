import { LLMMessage } from '../llm/types';
import { createProviderFor, resolveApiKey, resolveProviderId } from '../llm/providers/createProvider';
import { DEFAULT_MODELS, inferProviderFromModel } from '../llm/constants';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';
import { ToolRegistry } from './ToolRegistry';
import { PromptBuilder } from './PromptBuilder';
import { AGENTIC_SETS, AgentNode } from '../../data/agents';

export interface BrainHost {
  data: AgentNode;
  simulation: {
    getAllAgents: () => any[];
    processScheduledTasks: () => void;
  };
  getCurrentTaskId: () => string | null;
}

export interface ThinkOptions {
  isChat?: boolean;
  tools?: any[];
  silent?: boolean;
}

export class AgentBrain {
  private history: LLMMessage[] = [];
  public isThinking: boolean = false;

  constructor(private readonly host: BrainHost) {
    this.refreshFromStore();
  }

  public async think(prompt: string, options: ThinkOptions = {}): Promise<{ text: string, toolCalls: any[] }> {
    if (this.isThinking) return { text: '', toolCalls: [] };
    this.isThinking = true;

    try {
      this.refreshFromStore();
      const core = useCoreStore.getState();
      const llmConfig = useUiStore.getState().llmConfig;
      const providerId = resolveProviderId(llmConfig, this.host.data);
      if (!resolveApiKey(llmConfig, providerId)) {
        throw new Error(
          providerId === 'openai'
            ? 'OpenAI API kaliti kerak'
            : providerId === 'gemini'
              ? 'Gemini API kaliti kerak'
              : 'Claude API kaliti kerak',
        );
      }
      const { provider, model } = createProviderFor(llmConfig, this.host.data);
      const teamId = useTeamStore.getState().selectedAgentSetId;
      const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === teamId)
        || AGENTIC_SETS.find(s => s.id === teamId);

      const lastUserMeta = [...this.history].reverse().find((m) => m.role === 'user');
      const attachedImages = (lastUserMeta?.metadata?.attachments || [])
        .map((a: any) => a?.dataUrl)
        .filter((u: string) => typeof u === 'string' && u.startsWith('data:image'));
      const hasVisionSupport =
        activeTeam?.outputType === 'image' ||
        activeTeam?.outputType === 'video' ||
        attachedImages.length > 0;

      // 1. Manage Message History
      if (!options.isChat) {
        const userMsg: LLMMessage = {
          role: 'user',
          content: prompt,
          metadata: options.silent ? { internal: true } : undefined
        };
        
        // Attach reference images if VISION is supported for this project type
        if (hasVisionSupport && core.referenceImages.length > 0) {
          userMsg.images = core.referenceImages;
        }
        if (attachedImages.length) {
          userMsg.images = [...(userMsg.images || []), ...attachedImages];
        }

        this.history.push(userMsg);
        this.syncToStore();
      }

      // 2. Prepare context
      // Widen the window backwards so it never starts mid tool-call sequence,
      // which OpenAI rejects (orphaned 'tool' messages).
      let start = Math.max(0, this.history.length - 10);
      while (start > 0 && this.history[start].role === 'tool') start--;
      let messages: LLMMessage[] = this.history.slice(start);

      // In chat mode, ensure the latest user message also carries images if it's the brief phase
      if (options.isChat && (hasVisionSupport || attachedImages.length)) {
        messages = messages.map((m, idx) => {
          if (idx === messages.length - 1 && m.role === 'user') {
            const imgs = [
              ...(attachedImages || []),
              ...(hasVisionSupport ? core.referenceImages : []),
            ];
            return { ...m, images: imgs.length ? imgs : m.images };
          }
          return m;
        });
      }
      const allAgents = this.host.simulation.getAllAgents();
      const systemPrompt = PromptBuilder.buildSystemPrompt(this.host.data, core.phase, core.userBrief, allAgents);
      const toolDefs = options.tools || ToolRegistry.getDefinitions(this.host.data.index, core.phase, this.host.data.subagents?.length || 0);

      // 3. Log and Execute LLM Call
      core.addRequestLog({
        agentIndex: this.host.data.index,
        agentName: this.host.data.name,
        systemInstruction: systemPrompt,
        contents: messages,
        systemTools: toolDefs,
        taskId: this.host.getCurrentTaskId() || undefined
      });

      const response = await provider.generateCompletion(
        messages,
        toolDefs,
        systemPrompt,
        model
      );

      // 4. Log Response
      core.addResponseLog({
        agentIndex: this.host.data.index,
        agentName: this.host.data.name,
        content: response.content || '',
        tool_calls: response.tool_calls,
        usage: response.usage,
        raw: response.raw,
        taskId: this.host.getCurrentTaskId() || undefined
      });

      // 5. Parse Tool Calls
      const text = response.content || '';
      // Kept index-aligned with response.tool_calls so every call can be answered.
      const parsedCalls = (response.tool_calls || []).map(tc => {
        try {
          return { id: tc.id, name: tc.function.name, args: JSON.parse(tc.function.arguments), ok: true };
        } catch (e) {
          console.error('[AgentBrain] Failed to parse tool arguments', tc.function.arguments);
          return { id: tc.id, name: tc.function.name, args: {}, ok: false };
        }
      });
      const toolCalls = parsedCalls.filter(tc => tc.ok).map(tc => ({ name: tc.name, args: tc.args })) as any[];

      // 6. Final Message Construction
      const isInternalTrigger = options.silent;
      const hasToolCallsOnly = !text && toolCalls.length > 0;
      const isBrief = toolCalls.some(tc => tc.name === 'set_user_brief');
      const isResolution = false;
      let finalContent = text;
      const isMalformed = response.finishReason === 'MALFORMED_FUNCTION_CALL';

      if (isMalformed) {
        finalContent = 'XATO: Notoʻgʻri funksiya chaqiruvi. Qayta urinib koʻring.';
        console.warn(`[AgentBrain:${this.host.data.name}] Malformed function call detected.`);
      } else if (hasToolCallsOnly && !isInternalTrigger) {
        finalContent = isBrief
          ? 'Loyiha brifi belgilandi. Boshlaymiz!'
          : 'Ishlayapman...';
      } else if (!text && toolCalls.length === 0 && !isInternalTrigger) {
        finalContent = '...';
      }

      // UI/UX handling for chat auto-closing
      if (options.isChat && (isBrief || isResolution)) {
        setTimeout(() => {
          if (useUiStore.getState().isChatting) useUiStore.getState().setChatting(false);
          useUiStore.getState().setSelectedNpc(null);
        }, 3000);
      }

      const isInternalMessage = isInternalTrigger || (hasToolCallsOnly && isInternalTrigger);
      this.history.push({
        role: 'assistant',
        content: finalContent,
        tool_calls: response.tool_calls,
        metadata: isInternalMessage ? { internal: true } : undefined
      });
      this.syncToStore();

      // 7. Process Actions (Tools) + OpenAI tool-result messages
      for (const call of parsedCalls) {
        let content: string;
        let handled = false;

        if (!call.ok) {
          content = `FAILED: ${call.name} — argumentlar notoʻgʻri JSON`;
        } else {
          const toolResult = await ToolRegistry.process(this.host as any, {
            name: call.name,
            args: call.args,
          });
          handled = toolResult.ok;
          content = toolResult.result;
        }

        this.history.push({
          role: 'tool',
          name: call.id,
          content,
          metadata: { internal: true },
        });

        if (call.ok && call.name === 'deliver_project' && handled) {
          this.handleFinalAssetGeneration(call.args.output);
        }
      }
      this.syncToStore();

      return { text, toolCalls };
    } catch (error) {
      console.error(`[AgentBrain:${this.host.data.name}] Logic error:`, error);
      const errMsg = error instanceof Error ? error.message : String(error);
      useUiStore.getState().setBYOKOpen(true, errMsg);
      throw error;
    } finally {
      this.isThinking = false;
      this.host.simulation.processScheduledTasks();
    }
  }

  /** Autonomous Intent: Start the project strategy. */
  public async spark() {
    return this.think('Loyihani boshlang: dastlabki vazifalarni taklif qiling.', { silent: true });
  }

  /** Daily social autopost while the app tab is open. */
  public async sparkAutoPost() {
    return this.think(
      'KUNLIK AVTO-POST: Instagram insights oʻqing (instagram_insights). Mavzu tanlang, qisqa caption yozing. Agar ochiq image URL boʻlsa instagram_publish_photo bilan joylang; boʻlmasa caption + mavzuni share_insight qiling va Telegram default chatga qisqa xabar yuboring. MAX 30 soʻz chat.',
      { silent: true },
    );
  }

  /** Autonomous Intent: Work on a specific task. */
  public async executeTask(taskId: string) {
    return this.think(`Vazifani bajaring: ${taskId}`, { silent: true });
  }

  /** Autonomous Intent: Finalize and deliver the project results. */
  public async concludeProject() {
    return this.think('All tasks are complete! Use the deliver_project tool to fulfill the final delivery with the project result.', { silent: true });
  }

  private async handleFinalAssetGeneration(prompt: string) {
    const core = useCoreStore.getState();
    const teamId = useTeamStore.getState().selectedAgentSetId;
    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === teamId)
      || AGENTIC_SETS.find(s => s.id === teamId);

    if (!activeTeam) return;

    // Check if we need manual approval
    if (activeTeam.outputAutoApprove === false) {
      core.setPendingOutputPrompt(prompt);

      // Prepare default params based on output type
      const defaultParams: any = { model: activeTeam.outputModel };
      if (activeTeam.outputType === 'image') {
        defaultParams.aspectRatio = '16:9';
        defaultParams.imageSize = '1K';
      } else if (activeTeam.outputType === 'video') {
        defaultParams.resolution = '720p';
        defaultParams.aspectRatio = '16:9';
        defaultParams.durationSeconds = 4;
      }

      core.setPendingOutputParams(defaultParams);
      core.setReviewingOutput(true);
      return;
    }

    // Standard auto-approve flow
    await this.processFinalAsset(prompt, { model: activeTeam.outputModel });
  }

  public async processFinalAsset(prompt: string, options: any) {
    const core = useCoreStore.getState();
    const teamId = useTeamStore.getState().selectedAgentSetId;
    const activeTeam = useTeamStore.getState().customSystems.find(s => s.id === teamId)
      || AGENTIC_SETS.find(s => s.id === teamId);

    if (!activeTeam) return;

    core.setIsGeneratingAsset(true);
    core.setReviewingOutput(false);

    try {
      const llmConfig = useUiStore.getState().llmConfig;
      let model = options.model || activeTeam.outputModel || llmConfig.model;
      if (
        (activeTeam.outputType === 'video' || activeTeam.outputType === 'music') &&
        inferProviderFromModel(model) !== 'gemini'
      ) {
        model = DEFAULT_MODELS[activeTeam.outputType];
      }
      const providerId = inferProviderFromModel(model);
      if (!resolveApiKey(llmConfig, providerId)) {
        throw new Error(
          providerId === 'openai'
            ? 'Rasm generatsiya uchun OpenAI API kaliti kerak'
            : providerId === 'gemini'
              ? 'Rasm/video/musiqa generatsiya uchun Gemini API kaliti kerak'
              : 'Bu model uchun Claude API kaliti kerak',
        );
      }
      const { provider } = createProviderFor(
        { ...llmConfig, provider: providerId },
        { provider: providerId, model },
      );
      const generator = provider as any;

      core.addLogEntry({
        agentIndex: -1,
        action: `Generating final ${activeTeam.outputType} using ${model}...`,
        taskId: undefined
      });

      let assetContent: string = '';
      let usage: any = undefined;

      if (activeTeam.outputType === 'image') {
        const result = await generator.generateImage(prompt, model, (msg: string) => {
          console.log(`[System:Image] ${msg}`);
        }, options, core.referenceImages);
        assetContent = result.data || '';
        usage = result.usage;
      } else if (activeTeam.outputType === 'music') {
        const result = await generator.generateAudio(prompt, model, (msg: string) => {
          console.log(`[System:Audio] ${msg}`);
        });
        assetContent = result.data || '';
        usage = result.usage;
      } else if (activeTeam.outputType === 'video') {
        const result = await generator.generateVideo(prompt, model, (msg: string) => {
          console.log(`[System:Video] ${msg}`);
        }, options, core.referenceImages);
        assetContent = result.videoUrl || '';
        usage = result.usage;
      } else if (activeTeam.outputType === 'text') {
        // For text, the prompt is the final output
        core.setFinalOutput(prompt);
        core.setPhase('done');
        core.setFinalOutputOpen(true);
        core.setIsGeneratingAsset(false);
        return;
      }

      core.addResponseLog({
        agentIndex: -1,
        agentName: 'System',
        content: `Final ${activeTeam.outputType} generated successfully.`,
        usage: usage,
        raw: { model, ...usage },
        taskId: undefined
      });

      core.setFinalOutput(prompt);
      core.setFinalAsset(activeTeam.outputType === 'music' ? 'audio' : activeTeam.outputType as any, assetContent);
      core.setPhase('done');
      core.setFinalOutputOpen(true);
    } catch (error) {
      console.error('[AgentBrain] Final asset generation failed:', error);
      core.setIsGeneratingAsset(false);
      const errMsg = error instanceof Error ? error.message : String(error);
      useUiStore.getState().setBYOKOpen(true, errMsg);
      core.addLogEntry({
        agentIndex: 0,
        action: `Error generating final ${activeTeam.outputType}: ${errMsg}`,
        taskId: undefined
      });
    }
  }

  public appendHistory(message: LLMMessage) {
    this.refreshFromStore();
    this.history.push(message);
    this.syncToStore();
  }

  private refreshFromStore() {
    const history = useCoreStore.getState().agentHistories[this.host.data.index];
    if (history) this.history = [...history];
  }

  private syncToStore() {
    useCoreStore.getState().setAgentHistory(this.host.data.index, this.history);
  }
}
