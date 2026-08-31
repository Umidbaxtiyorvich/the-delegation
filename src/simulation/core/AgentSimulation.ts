import { AgentNode, AgenticSystem, getAllAgents } from '../../data/agents';
import { useCoreStore } from '../../integration/store/coreStore';
import { AgentHost } from './AgentHost';
import { useUiStore } from '../../integration/store/uiStore';

/**
 * AgentSimulation — Autonomous Service Layer.
 * 
 * DESIGN PRINCIPLE: State-Driven Orchestration.
 * 1. Monitors the Store to trigger autonomous loops.
 * 2. Visuals are reflections of this state.
 * 3. Event-based Resilience: Re-checks for tasks when agents become idle.
 */
export class AgentSimulation {
  private agents: Map<number, AgentHost> = new Map();
  private system: AgenticSystem;
  private unsubs: (() => void)[] = [];
  private heartbeatInterval: any = null;
  private lastSparkTriggerTime: number = 0;

  constructor(system: AgenticSystem) {
    this.system = system;
    this.initializeAgents();
    this.startStateMonitoring();
  }

  private startStateMonitoring() {
    // 1. Heartbeat safety net (Periodically check for scheduled tasks and empty boards)
    this.heartbeatInterval = setInterval(() => {
      const state = useCoreStore.getState();
      if (state.phase === 'working' && state.tasks.length === 0) {
        this.triggerAutonomousStrategy();
      } else if (state.phase === 'working') {
        this.processScheduledTasks();
      }
    }, 5000);

    // 2. Core Store Monitoring
    this.unsubs.push(
      useCoreStore.subscribe((state, prevState) => {
        // A. Initial Strategy (Spark)
        if (state.phase === 'working' && prevState.phase === 'idle' && state.tasks.length === 0) {
          this.triggerAutonomousStrategy();
        }

        // B. Task Lifecycle: Process SCHEDULED tasks
        if (state.phase === 'working') {
          this.processScheduledTasks();
        }

        // C. Project Completion
        this.checkProjectCompletion();
      })
    );

    // 3. UI Store Monitoring (Cleanup)
    this.unsubs.push(
      useUiStore.subscribe((state, prevState) => {
        if (!state.isChatting && prevState.isChatting) {
          const core = useCoreStore.getState();
          if (core.phase === 'working' && core.tasks.length === 0) this.triggerAutonomousStrategy();
        }
      })
    );
  }

  /** Central method to check for and start available tasks. */
  public processScheduledTasks() {
    const state = useCoreStore.getState();
    if (state.phase !== 'working') return;

    state.tasks.filter(t => t.status === 'scheduled' || t.status === 'in_progress').forEach(task => {
      const agent = this.getAgent(task.assignedAgentId);
      const uiStatus = useUiStore.getState().agentStatuses[task.assignedAgentId];
      
      // Resilience check: only start if agent is truly idle and not currently thinking.
      // We check both internal state and UI status as safety.
      if (agent && (agent.state === 'idle' || uiStatus === 'idle') && !agent.isThinking) {
        this.startTaskExecution(task.assignedAgentId, task.id);
      }
    });
  }

  private async triggerAutonomousStrategy() {
    const lead = this.getAgent(1);
    const ui = useUiStore.getState();
    const core = useCoreStore.getState();

    // GUARD: Prevent duplication
    if (!lead || lead.isThinking || core.tasks.length > 0) return;
    if (ui.isChatting && ui.selectedNpcIndex === lead.data.index) return;
    
    if (Date.now() - this.lastSparkTriggerTime < 1000) return;
    this.lastSparkTriggerTime = Date.now();

    await lead.spark();
  }

  private async startTaskExecution(agentIndex: number, taskId: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent) return;

    agent.setTask(taskId); 
    useCoreStore.getState().updateTaskStatus(taskId, 'in_progress');
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    try {
      if (!agent.isThinking) {
        await agent.executeTask(taskId);
      }
    } catch (err) {
      console.error(`[AgentSimulation] Agent ${agentIndex} failed:`, err);
    } finally {
      // Resilience check: only clear task if not waiting for review or meeting
      if (agent.state !== 'on_hold' && agent.state !== 'talking') {
        agent.setTask(null);
        agent.setState('idle');
      }
      
      // KEY: When finished, check if there are other scheduled tasks waiting
      this.processScheduledTasks();
      
      // AND check if the project is now ready for delivery 
      // (Resilience for 1-agent teams where lead is thinking when the last task finishes)
      this.checkProjectCompletion();
    }
  }

  private async checkProjectCompletion() {
    const state = useCoreStore.getState();
    const allTasksFinished = state.tasks.length > 0 && state.tasks.every(t => t.status === 'done');
    
    if (state.phase === 'working' && allTasksFinished && !state.isGeneratingAsset) {
      const lead = this.getAgent(this.system.leadAgent.index);
      if (lead && !lead.isThinking) {
        await lead.concludeProject();
      }
    }
  }

  private initializeAgents() {
    const allAgents = getAllAgents(this.system);
    for (const agentData of allAgents) {
      this.agents.set(agentData.index, new AgentHost(agentData, this));
    }
  }

  /**
   * Reconciles the live roster with `system` without tearing down existing hosts,
   * so agents hired mid-project keep working while the others stay untouched.
   * Returns the indices that were added.
   */
  public syncAgents(system: AgenticSystem): number[] {
    this.system = system;
    const roster = getAllAgents(system);
    const added: number[] = [];

    for (const agentData of roster) {
      if (!this.agents.has(agentData.index)) {
        this.agents.set(agentData.index, new AgentHost(agentData, this));
        added.push(agentData.index);
      }
    }

    const live = new Set(roster.map((a) => a.index));
    for (const [index, host] of this.agents) {
      if (!live.has(index)) {
        host.dispose();
        this.agents.delete(index);
      }
    }

    if (added.length > 0) {
      this.processScheduledTasks();
      this.scheduleOnboarding(added);
    }

    return added;
  }

  /**
   * A freshly hired agent has no task yet, and nothing else on the board triggers
   * the lead to give it one. Nudge the lead once it finishes its current turn —
   * hiring usually happens *inside* that turn, so we wait for it to settle.
   */
  private scheduleOnboarding(added: number[], attempt = 0) {
    if (attempt > 15) return;

    setTimeout(async () => {
      const core = useCoreStore.getState();
      if (core.phase !== 'working') return;

      const lead = this.getAgent(this.system.leadAgent.index);
      if (!lead) return;

      // Still mid-turn (or the newcomer already got picked up): wait, then re-check.
      if (lead.isThinking) {
        this.scheduleOnboarding(added, attempt + 1);
        return;
      }

      const pending = added.filter(
        (index) =>
          this.agents.has(index) &&
          !core.tasks.some((t) => t.assignedAgentId === index)
      );
      if (pending.length === 0) return;

      const names = pending
        .map((index) => `[${index}] ${this.getAgent(index)?.data.name ?? ''}`.trim())
        .join(', ');

      try {
        await lead.think(
          `Jamoaga yangi agent qoʻshildi: ${names}. Uning roliga mos aniq vazifani propose_task bilan darhol bering.`,
          { silent: true }
        );
      } catch (err) {
        console.error('[AgentSimulation] Onboarding nudge failed:', err);
      }
    }, 1200);
  }

  public getAgent(index: number): AgentHost | undefined {
    return this.agents.get(index);
  }

  public getAllAgents(): AgentHost[] {
    return Array.from(this.agents.values());
  }



  public async handleUserMessage(agentIndex: number, text: string) {
    const agent = this.getAgent(agentIndex);
    if (!agent || !agent.canChat()) return null;
    const response = await agent.think(text, { isChat: true });
    return response.text;
  }

  public dispose() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.agents.forEach(a => a.dispose());
  }
}
