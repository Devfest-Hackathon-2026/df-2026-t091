import React from 'react';
import { DAY, isCampReached, splitDuration } from '../lib/schedule.js';
import { STRINGS } from '../lib/i18n.js';

const SUMMIT_METERS = 8848;
const pad = (n) => String(n).padStart(2, '0');

export default function Hud({
  lang = 'en',
  onToggleLang,
  lofiPlaying = false,
  onToggleLofi,
  roadmap,
  camps = [],
  timeInfo,
  overrideHour,
  onOverrideHour,
  completed,
  statusOf,
  onSelect,
  onNew,
  remainingMs,
  paceFrac,
  speed,
  onSpeed,
  onRestart,
  restingCampId,
  onSelectCamp,
  onResumeClimb,
}) {
  const s = STRINGS[lang] || STRINGS.en;
  const done = new Set(completed);
  const doneHours = roadmap.nodes.filter((n) => done.has(n.id)).reduce((sum, n) => sum + n.hours, 0);
  const totalHours = roadmap.nodes.reduce((sum, n) => sum + n.hours, 0) || 1;
  const progress = doneHours / totalHours;
  const altitude = Math.round(progress * SUMMIT_METERS);
  const next = roadmap.nodes.filter((n) => statusOf(n) === 'available').slice(0, 4);

  const t = splitDuration(remainingMs);
  const totalDays = roadmap.months * 30;
  const curDay = Math.min(totalDays, Math.floor((totalDays * DAY - remainingMs) / DAY) + 1);
  const diffDays = Math.round((progress - paceFrac) * totalDays);
  const summitDone = completed.length === roadmap.nodes.length;
  const timeUp = remainingMs <= 0;
  const pace = summitDone
    ? { cls: 'ahead', text: timeUp ? s.summitReached : s.summitSpare(t.d) }
    : timeUp
      ? { cls: 'behind', text: s.timeUpKeepClimbing }
      : diffDays > 0
        ? { cls: 'ahead', text: s.aheadPace(diffDays) }
        : diffDays < 0
          ? { cls: 'behind', text: s.behindPace(-diffDays) }
          : { cls: 'even', text: s.onPace };

  const speeds = [
    { label: '⏸', value: 0, title: s.pause },
    { label: '1×', value: 1, title: s.realTime },
    { label: lang === 'ja' ? '1日/秒' : '1 day/s', value: 86400 },
    { label: lang === 'ja' ? '1週/秒' : '1 wk/s', value: 604800 },
  ];

  const timePresets = [
    { label: s.liveTz, value: null },
    { label: '🌅 06:00', value: 6 },
    { label: '☀️ 13:00', value: 13 },
    { label: '🌇 18:00', value: 18 },
    { label: '🌙 22:00', value: 22 },
  ];

  const phaseLabel = timeInfo ? s.phases[timeInfo.phase] || timeInfo.phase : '';

  return (
    <div className="hud glass">
      <div className="hud-top-actions">
        <button type="button" className="lang-switch" onClick={onToggleLang} title="Switch language / 言語切替">
          <span className={lang === 'en' ? 'active' : ''}>EN</span>
          <span className={lang === 'ja' ? 'active' : ''}>日本語</span>
        </button>
        <button
          type="button"
          className={`lofi-btn ${lofiPlaying ? 'active' : ''}`}
          onClick={onToggleLofi}
          title="Chill Lo-Fi + Campfire BGM"
        >
          {lofiPlaying ? s.lofiOn : s.lofiOff}
        </button>
        <button className="secondary small" onClick={onNew} style={{ marginLeft: 'auto' }}>
          {s.newGoal}
        </button>
      </div>

      <div className="hud-head">
        <div>
          <div className="eyebrow">{s.climbing}</div>
          <h2>{roadmap.goal}</h2>
        </div>
      </div>

      {timeInfo && (
        <div className="tz-box">
          <div className="tz-top">
            <span>
              {timeInfo.icon} <b>{timeInfo.timeStr}</b> · {phaseLabel}
            </span>
            <span className="tz-name">{overrideHour == null ? timeInfo.tz : s.preview}</span>
          </div>
          <div className="speed-row">
            {timePresets.map((p) => (
              <button
                key={String(p.value)}
                className={`speed ${overrideHour === p.value ? 'active' : ''}`}
                onClick={() => onOverrideHour(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="countdown-box">
        <div className="eyebrow">{s.timeLeft(roadmap.months, curDay, totalDays)}</div>
        <div className={`countdown ${timeUp ? 'over' : ''}`}>
          <div><b>{t.d}</b><span>{s.days}</span></div>
          <div><b>{pad(t.h)}</b><span>{s.hrs}</span></div>
          <div><b>{pad(t.m)}</b><span>{s.min}</span></div>
          <div><b>{pad(t.s)}</b><span>{s.sec}</span></div>
        </div>
        <div className={`pace ${pace.cls}`}>{pace.text}</div>
        {restingCampId && (
          <div className="rest-status">
            <span>{s.restingTimerPaused}</span>
            <button className="speed active" onClick={onResumeClimb}>
              {s.resumeBtn}
            </button>
          </div>
        )}
        <div className="speed-row">
          <span className="speed-label">{s.demoTime}</span>
          {speeds.map((sp) => (
            <button
              key={sp.value}
              title={sp.title || sp.label}
              className={`speed ${speed === sp.value ? 'active' : ''}`}
              onClick={() => onSpeed(sp.value)}
              disabled={timeUp && sp.value > 1}
            >
              {sp.label}
            </button>
          ))}
          <button className="speed" title={s.restartCountdown} onClick={onRestart}>
            ↺
          </button>
        </div>
      </div>

      <div className="altitude">
        <span className="alt-num">{altitude.toLocaleString()} m</span>
        <span className="alt-total">/ {SUMMIT_METERS.toLocaleString()} m</span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        {camps.map((c) => (
          <i
            key={c.id}
            className={`camp-tick ${isCampReached(c, completed, progress) ? 'lit' : ''}`}
            style={{ left: `${c.f * 100}%` }}
            title={`${c.name} — ${c.nodeTitle} (${c.difficulty}/5)`}
          />
        ))}
      </div>
      <div className="eyebrow">{s.aiRestStops}</div>
      <div className="camps-row">
        {[{ id: 'base', name: s.baseShort, f: 0 }, ...camps].map((c) => {
          const reached = isCampReached(c, completed, progress);
          const resting = restingCampId === c.id;
          return (
            <button
              key={c.id}
              className={`camp-chip ${reached ? 'reached' : ''} ${resting ? 'resting' : ''}`}
              onClick={() => onSelectCamp(c.id)}
              title={
                c.id === 'base'
                  ? `${s.baseCamp} (0 m)`
                  : `${c.name}: ${c.nodeTitle} (${c.difficulty}/5)`
              }
            >
              {reached ? '🔥' : '⛺'} {c.name}
            </button>
          );
        })}
      </div>
      <div className="stats">
        <div>
          <b>
            {completed.length}/{roadmap.nodes.length}
          </b>
          <span>{s.topicsStat}</span>
        </div>
        <div>
          <b>{doneHours}h</b>
          <span>{s.investedStat}</span>
        </div>
        <div>
          <b>{Math.round(progress * 100)}%</b>
          <span>{s.ofClimbStat}</span>
        </div>
      </div>

      {roadmap.summary && <p className="summary">{roadmap.summary}</p>}

      {next.length > 0 && (
        <>
          <div className="eyebrow">{s.nextOnTrail}</div>
          <ul className="next-list">
            {next.map((n) => (
              <li key={n.id}>
                <button onClick={() => onSelect(n.id)}>
                  <span className="dot" /> {n.title}
                  <em>
                    {n.hours}h · ⚡{n.difficulty || 3}/5
                  </em>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="legend">
        <span>
          <i className="lg completed" /> {s.climbed}
        </span>
        <span>
          <i className="lg available" /> {s.ready}
        </span>
        <span>
          <i className="lg locked" /> {s.locked}
        </span>
        <span>
          <i className="lg pace-dot" /> {s.pace}
        </span>
        <span className={`badge ${roadmap.source === 'ai' ? 'ai' : 'demo'}`}>
          {roadmap.source === 'ai' ? '✨ AI' : s.demoShort}
        </span>
      </div>
    </div>
  );
}
