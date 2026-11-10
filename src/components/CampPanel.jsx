import React from 'react';
import { hoursProgress, isCampReached, scheduleSlices } from '../lib/schedule.js';
import { STRINGS } from '../lib/i18n.js';

const SUMMIT_METERS = 8848;

export default function CampPanel({
  lang = 'en',
  campId,
  camps = [],
  roadmap,
  completed,
  restingCampId,
  onToggleRest,
  onSelectTopic,
  onClose,
}) {
  if (!campId) return null;
  const s = STRINGS[lang] || STRINGS.en;
  const baseCamp = {
    id: 'base',
    name: s.baseCamp,
    f: 0,
    tagline: s.baseCampTagline,
  };
  const allCamps = [baseCamp, ...camps];
  const idx = allCamps.findIndex((c) => c.id === campId);
  const camp = allCamps[idx];
  if (!camp) return null;

  const prevF = idx > 0 ? allCamps[idx - 1].f : 0;
  const nextF = idx < allCamps.length - 1 ? allCamps[idx + 1].f : 1;
  const nextName = idx < allCamps.length - 1 ? allCamps[idx + 1].name : s.summitName;

  const { frac, doneHours, total } = hoursProgress(roadmap.nodes, completed);
  const reached = isCampReached(camp, completed, frac);
  const isRestingHere = restingCampId === camp.id;
  const doneSet = new Set(completed);
  const slices = scheduleSlices(roadmap.nodes);

  // Topics on the leg leading into this camp, and topics on the next leg after this camp.
  const legTopics =
    camp.id === 'base'
      ? roadmap.nodes.filter((n) => doneSet.has(n.id))
      : slices
          .filter((sl) => sl.start >= prevF - 0.001 && sl.end <= camp.f + 0.001)
          .map((sl) => roadmap.nodes.find((n) => n.id === sl.id))
          .filter(Boolean);

  const aheadTopics = slices
    .filter((sl) => sl.start >= camp.f - 0.001 && sl.start < nextF + 0.001)
    .map((sl) => roadmap.nodes.find((n) => n.id === sl.id))
    .filter((n) => n && !doneSet.has(n.id))
    .slice(0, 4);

  const campAlt = Math.round(camp.f * SUMMIT_METERS);
  const hoursNeeded = Math.max(0, Math.ceil(camp.f * total - doneHours));

  return (
    <aside className="topic-panel camp-panel glass">
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className={`status-pill ${reached ? 'completed' : 'locked'}`}>
        {reached
          ? isRestingHere
            ? s.restingByFirePill
            : s.restPointUnlockedPill
          : s.completeToUnlockPill(camp.nodeTitle)}
      </div>
      <h2>
        {reached ? '🔥 ' : '⛺ '}
        {camp.name}
      </h2>
      <div className="meta">
        <span>⛰ {campAlt.toLocaleString()} m</span>
        {camp.difficulty && (
          <span className={`diff-badge d${camp.difficulty}`}>{s.testDiffMeta(camp.difficulty)}</span>
        )}
        {camp.nodeTitle && <span>{s.afterTopicMeta(camp.nodeTitle)}</span>}
      </div>
      <div className="ai-rest-box">
        <b>{s.whyAiPlacedRest}</b> {camp.tagline}
      </div>

      {isRestingHere && <div className="rest-banner">{s.restBanner}</div>}

      {legTopics.length > 0 && (
        <section>
          <h3>{camp.id === 'base' ? s.conqueredSoFar : s.topicsOnStretch}</h3>
          <ul className="topic-links">
            {legTopics.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelectTopic(n.id)}
                  className={doneSet.has(n.id) ? 'done' : ''}
                >
                  {doneSet.has(n.id) ? '✓' : '○'} {n.title}{' '}
                  <em>
                    ({n.hours}h · ⚡{n.difficulty || 3}/5)
                  </em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aheadTopics.length > 0 && (
        <section>
          <h3>{s.nextLegTo(nextName)}</h3>
          <ul className="topic-links">
            {aheadTopics.map((n) => (
              <li key={n.id}>
                <button onClick={() => onSelectTopic(n.id)}>
                  ↑ {n.title}{' '}
                  <em>
                    ({n.hours}h · ⚡{n.difficulty || 3}/5)
                  </em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="panel-actions">
        {reached ? (
          <button
            className={isRestingHere ? 'secondary' : 'primary'}
            onClick={() => onToggleRest(camp.id)}
          >
            {isRestingHere ? s.leaveCampBtn : s.restAtCampBtn}
          </button>
        ) : (
          <p className="hint">{s.passCheckpointHint(camp.nodeTitle, hoursNeeded)}</p>
        )}
      </div>
    </aside>
  );
}
