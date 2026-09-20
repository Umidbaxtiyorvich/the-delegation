import { useEffect, useRef } from 'react';
import { useIntegrationsStore } from '../integration/store/integrationsStore';
import { useSceneManager } from '../simulation/SceneContext';

/**
 * While the app tab is open, trigger lead-agent autopost once per local day
 * when autoPost.enabled and the local hour matches.
 */
export function AutoPostScheduler() {
  const scene = useSceneManager();
  const running = useRef(false);

  useEffect(() => {
    const tick = async () => {
      const { autoPost, instagram } = useIntegrationsStore.getState();
      if (!autoPost.enabled || !instagram.accessToken || !(instagram.username || instagram.igUserId)) return;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (autoPost.lastPostedDate === today) return;
      if (now.getHours() !== autoPost.hourLocal) return;

      const brain = scene?.getLeadBrain();
      if (!brain || brain.isThinking || running.current) return;

      running.current = true;
      try {
        await brain.sparkAutoPost();
        useIntegrationsStore.getState().markAutoPostedToday();
      } catch (e) {
        console.warn('[AutoPostScheduler]', e);
      } finally {
        running.current = false;
      }
    };

    const id = window.setInterval(tick, 60_000);
    tick();
    return () => window.clearInterval(id);
  }, [scene]);

  return null;
}
