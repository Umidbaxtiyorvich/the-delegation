import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

/**
 * Lets an agent request a peer review from another agent by creating
 * a follow-up review task linked to an existing deliverable.
 */
export function requestPeerReview(
  agent: AgentActionContext,
  args: { taskId: string; reviewerAgentId: number; focus: string }
): boolean {
  const store = useCoreStore.getState();
  const { taskId, reviewerAgentId, focus } = args;
  const source = store.tasks.find((t) => t.id === taskId);
  if (!source || !focus?.trim() || !(reviewerAgentId > 0)) return false;

  const reviewTask = store.addTask({
    title: `Peer review: ${source.title}`,
    description: `Review task "${source.title}" with focus: ${focus.trim()}\n\nSource output:\n${source.output || source.draftOutput || '(not finished yet)'}`,
    assignedAgentId: reviewerAgentId,
    status: 'scheduled',
    parentTaskId: source.id,
    requiresUserApproval: false,
  });

  store.addLogEntry({
    agentIndex: agent.data.index,
    action: `requested peer review from agent ${reviewerAgentId}`,
    taskId: reviewTask.id,
  });

  return true;
}
