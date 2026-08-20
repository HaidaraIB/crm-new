import React, { useEffect } from 'react';
import { useWorkSessionTracker } from '../../hooks/useWorkSessionTracker';
import { setWorkSessionSnapshot } from './workSessionStore';
import { WorkIdleModal } from './WorkIdleModal';

/**
 * Runs measured working-hours tracking for the whole app.
 *
 * Mounted once as a leaf next to the other global listener hosts rather than living in
 * AppContext: the activity listeners fire constantly, and anything the provider exposes
 * re-renders every consumer. As a leaf, re-renders stay here and in the Header pill, and
 * the whole feature can be removed by deleting one line from App.tsx.
 *
 * Renders nothing until the user actually goes idle.
 */
export const WorkSessionTrackerHost = () => {
  const { state, todaySeconds, idleTimeoutMinutes, resume } = useWorkSessionTracker();

  useEffect(() => {
    setWorkSessionSnapshot({ state, todaySeconds });
  }, [state, todaySeconds]);

  return (
    <WorkIdleModal
      isOpen={state === 'paused'}
      idleTimeoutMinutes={idleTimeoutMinutes}
      onResume={resume}
    />
  );
};
