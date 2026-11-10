import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MountainScene from './components/MountainScene.jsx';
import GoalForm from './components/GoalForm.jsx';
import TopicPanel from './components/TopicPanel.jsx';
import CampPanel from './components/CampPanel.jsx';
import Hud from './components/Hud.jsx';
import { mockRoadmap } from '../shared/mockRoadmap.js';
import { ensureDifficultyAndRests } from '../shared/normalize.js';
import { buildCamps, durationMs, hoursProgress, isCampReached, newClock, simTime } from './lib/schedule.js';
import { getLocalTimeInfo } from './lib/timeOfDay.js';
import { localizeRoadmap, STRINGS } from './lib/i18n.js';
import { lofi } from './lib/lofi.js';
import { generateRoadmapClient, getClientApiKey } from './lib/geminiClient.js';

const STORAGE_KEY = 'knowledge-mountain-v1';

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s?.roadmap?.nodes?.length) {
      ensureDifficultyAndRests(s.roadmap.nodes);
      return s;
    }
  } catch {}
  return null;
}
const saved = loadSaved();

export default function App() {
  const [lang, setLang] = useState(saved?.lang || 'en');
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [roadmap, setRoadmap] = useState(saved?.roadmap ?? null);
  const [completed, setCompleted] = useState(saved?.completed ?? []);
  const [aiRestNotes, setAiRestNotes] = useState(saved?.aiRestNotes ?? {});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCampId, setSelectedCampId] = useState(null);
  const [restingCampId, setRestingCampId] = useState(saved?.restingCampId ?? null);
  const [overrideHour, setOverrideHour] = useState(null); // null = live local timezone clock
  const [showForm, setShowForm] = useState(!saved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  const prevSpeedRef = useRef(1);
  const [clock, setClock] = useState(
    saved ? saved.clock ?? newClock(Date.parse(saved.roadmap.createdAt) || Date.now()) : null
  );
  const [realNow, setRealNow] = useState(Date.now());

  const s = STRINGS[lang] || STRINGS.en;
  const viewRoadmap = useMemo(() => localizeRoadmap(roadmap, lang), [roadmap, lang]);

  useEffect(() => {
    const id = setInterval(() => setRealNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (roadmap) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lang, roadmap, completed, clock, restingCampId, aiRestNotes })
      );
    }
  }, [lang, roadmap, completed, clock, restingCampId, aiRestNotes]);

  const camps = useMemo(
    () => (roadmap ? buildCamps(roadmap.nodes, aiRestNotes, lang) : []),
    [roadmap, aiRestNotes, lang]
  );

  // Local timezone time-of-day (recomputed once per minute or when overrideHour changes).
  const minuteBucket = Math.floor(realNow / 60000);
  const timeInfo = useMemo(
    () => getLocalTimeInfo(overrideHour, new Date(minuteBucket * 60000)),
    [overrideHour, minuteBucket]
  );

  useEffect(() => {
    lofi.setMood({ resting: Boolean(restingCampId), night: Boolean(timeInfo?.isNight) });
  }, [restingCampId, timeInfo?.isNight]);

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'en' ? 'ja' : 'en'));
  }, []);

  const toggleLofi = useCallback(() => {
    setLofiPlaying(lofi.toggle());
  }, []);

  // ---- Countdown / pace ----
  const total = roadmap ? durationMs(roadmap) : 1;
  const simNow = clock ? simTime(clock, realNow) : realNow;
  const elapsed = clock ? Math.min(total, Math.max(0, simNow - clock.startedAt)) : 0;
  const paceFrac = Math.round((elapsed / total) * 10000) / 10000;
  const timeUp = roadmap && elapsed >= total;

  // Stop fast-forwarding once the deadline is reached.
  useEffect(() => {
    if (timeUp && clock?.speed > 1) {
      setClock((c) => ({ ...c, anchorReal: Date.now(), anchorSim: c.startedAt + total, speed: 1 }));
    }
  }, [timeUp, clock?.speed, total]);

  const setSpeed = useCallback((speed) => {
    if (speed > 0) setRestingCampId(null);
    setClock((c) => {
      const now = Date.now();
      return { ...c, anchorReal: now, anchorSim: simTime(c, now), speed };
    });
  }, []);

  const restartClock = () => {
    setRestingCampId(null);
    setClock(newClock());
  };

  const selectTopic = useCallback((id) => {
    setSelectedId(id);
    if (id) setSelectedCampId(null);
  }, []);

  const selectCamp = useCallback((campId) => {
    setSelectedCampId(campId);
    if (campId) setSelectedId(null);
  }, []);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const pauseAtCamp = useCallback((campId) => {
    setClock((c) => {
      if (!c) return c;
      if (c.speed > 0) prevSpeedRef.current = c.speed;
      const now = Date.now();
      return { ...c, anchorReal: now, anchorSim: simTime(c, now), speed: 0 };
    });
    setRestingCampId(campId);
  }, []);

  const toggleRestAtCamp = (campId) => {
    if (restingCampId === campId) {
      setRestingCampId(null);
      setSpeed(prevSpeedRef.current || 1);
      showToast(s.toastPackedUp);
    } else {
      pauseAtCamp(campId);
      const campName = campId === 'base' ? s.baseCamp : camps.find((c) => c.id === campId)?.name || 'Camp';
      showToast(s.toastRestingAt(campName));
    }
  };

  const resumeClimb = () => {
    if (!restingCampId) return;
    setRestingCampId(null);
    setSpeed(prevSpeedRef.current || 1);
    showToast(s.toastResumed);
  };

  const doneSet = useMemo(() => new Set(completed), [completed]);
  const isDone = useCallback((id) => doneSet.has(id), [doneSet]);
  const statusOf = useCallback(
    (n) => (doneSet.has(n.id) ? 'completed' : n.prerequisites.every((p) => doneSet.has(p)) ? 'available' : 'locked'),
    [doneSet]
  );

  // Study hours accumulated since the most recent rest camp in `completed`.
  const hoursSinceRest = useMemo(() => {
    if (!roadmap) return 0;
    const campNodeIds = new Set(camps.map((c) => c.nodeId));
    let sum = 0;
    for (const id of completed) {
      const n = roadmap.nodes.find((x) => x.id === id);
      if (n) sum += n.hours;
      if (campNodeIds.has(id)) sum = 0;
    }
    return sum;
  }, [roadmap, completed, camps]);

  const generate = async (input) => {
    setLoading(true);
    setError('');
    let rm;
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, lang }),
      });
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct?.includes('application/json')) throw new Error(`Server returned ${res.status}`);
      rm = await res.json();
    } catch {
      if (getClientApiKey()) {
        try {
          rm = await generateRoadmapClient({ ...input, lang });
        } catch {
          rm = { ...mockRoadmap(input), warning: 'AI call failed — showing demo roadmap instead.' };
        }
      } else {
        rm = { ...mockRoadmap(input), warning: roadmap ? undefined : 'Running in demo mode (ready for Firebase).' };
      }
    }
    ensureDifficultyAndRests(rm.nodes);
    setLoading(false);
    setRoadmap(rm);
    setCompleted([]);
    setAiRestNotes({});
    setRestingCampId(null);
    setClock(newClock());
    setSelectedId(null);
    setSelectedCampId(null);
    setShowForm(false);
    showToast(rm.warning || s.toastReady(rm.nodes.length));
  };

  const complete = (id, opts = {}) => {
    const node = viewRoadmap.nodes.find((n) => n.id === id);
    const prevFrac = hoursProgress(roadmap.nodes, completed).frac;
    const next = [...completed, id];
    const nextFrac = hoursProgress(roadmap.nodes, next).frac;
    setCompleted(next);

    const isLast = next.length === roadmap.nodes.length;
    const shouldRest = !isLast && Boolean(opts.shouldRest ?? node.restAfter);
    let nextRestNotes = aiRestNotes;
    if (shouldRest && opts.restReason) {
      nextRestNotes = { ...aiRestNotes, [id]: opts.restReason };
      setAiRestNotes(nextRestNotes);
    }

    const updatedCamps = buildCamps(roadmap.nodes, nextRestNotes, lang);
    const directCamp = updatedCamps.find((c) => c.nodeId === id);
    const crossedCamp =
      directCamp ||
      [...updatedCamps]
        .reverse()
        .find((c) => !isCampReached(c, completed, prevFrac) && isCampReached(c, next, nextFrac));

    const unlocked = roadmap.nodes.filter(
      (n) => !next.includes(n.id) && n.prerequisites.includes(id) && n.prerequisites.every((p) => next.includes(p))
    );

    if (isLast) {
      if (restingCampId) {
        setRestingCampId(null);
        setSpeed(prevSpeedRef.current || 1);
      }
      showToast(s.toastSummit);
    } else if (shouldRest && crossedCamp) {
      pauseAtCamp(crossedCamp.id);
      setSelectedId(null);
      setSelectedCampId(crossedCamp.id);
      showToast(s.toastToughTestRest(node.difficulty || 4, crossedCamp.name));
    } else {
      if (restingCampId) {
        setRestingCampId(null);
        setSpeed(prevSpeedRef.current || 1);
      }
      showToast(s.toastClimbed(node.title, unlocked.length));
    }
  };

  const undo = (id) => setCompleted((c) => c.filter((x) => x !== id));

  const selected = viewRoadmap?.nodes.find((n) => n.id === selectedId) || null;
  const canUndo = selected ? !roadmap.nodes.some((n) => doneSet.has(n.id) && n.prerequisites.includes(selected.id)) : false;
  const phaseLabel = timeInfo ? s.phases[timeInfo.phase] || timeInfo.phase : '';

  return (
    <div className="app">
      {viewRoadmap && (
        <MountainScene
          lang={lang}
          roadmap={viewRoadmap}
          camps={camps}
          timeInfo={timeInfo}
          statusOf={statusOf}
          completed={completed}
          selectedId={selectedId}
          onSelect={selectTopic}
          paceFrac={paceFrac}
          restingCampId={restingCampId}
          onSelectCamp={selectCamp}
        />
      )}
      {!viewRoadmap && <div className="empty-bg" />}

      {viewRoadmap && !showForm && (
        <>
          <Hud
            lang={lang}
            onToggleLang={toggleLang}
            lofiPlaying={lofiPlaying}
            onToggleLofi={toggleLofi}
            roadmap={viewRoadmap}
            camps={camps}
            timeInfo={timeInfo}
            overrideHour={overrideHour}
            onOverrideHour={setOverrideHour}
            completed={completed}
            statusOf={statusOf}
            onSelect={selectTopic}
            onNew={() => setShowForm(true)}
            remainingMs={total - elapsed}
            paceFrac={paceFrac}
            speed={clock?.speed ?? 1}
            onSpeed={setSpeed}
            onRestart={restartClock}
            restingCampId={restingCampId}
            onSelectCamp={selectCamp}
            onResumeClimb={resumeClimb}
          />
          <TopicPanel
            lang={lang}
            node={selected}
            roadmap={viewRoadmap}
            statusOf={statusOf}
            isDone={isDone}
            canUndo={canUndo}
            hoursSinceRest={hoursSinceRest}
            onComplete={complete}
            onUndo={undo}
            onSelect={selectTopic}
            onClose={() => setSelectedId(null)}
          />
          <CampPanel
            lang={lang}
            campId={selectedCampId}
            camps={camps}
            roadmap={viewRoadmap}
            completed={completed}
            restingCampId={restingCampId}
            onToggleRest={toggleRestAtCamp}
            onSelectTopic={selectTopic}
            onClose={() => setSelectedCampId(null)}
          />
          <div className="hint-bar">{s.hintBar(timeInfo.icon, timeInfo.timeStr, phaseLabel)}</div>
        </>
      )}

      {showForm && (
        <GoalForm
          lang={lang}
          onToggleLang={toggleLang}
          onGenerate={generate}
          loading={loading}
          error={error}
          onCancel={roadmap ? () => setShowForm(false) : null}
        />
      )}

      {toast && <div className="toast glass">{toast}</div>}
    </div>
  );
}
