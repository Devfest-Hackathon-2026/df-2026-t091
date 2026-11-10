import React, { useEffect, useState } from 'react';
import { STRINGS } from '../lib/i18n.js';

export default function GoalForm({ lang = 'en', onToggleLang, onGenerate, loading, error, onCancel }) {
  const t = STRINGS[lang] || STRINGS.en;
  const [goal, setGoal] = useState(lang === 'ja' ? '人工知能 (AI)' : 'Artificial Intelligence');
  const [months, setMonths] = useState(4);
  const [level, setLevel] = useState('beginner');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => {
        const ct = r.headers.get('content-type');
        if (!r.ok || !ct?.includes('application/json')) throw new Error('Not JSON');
        return r.json();
      })
      .then(setHealth)
      .catch(() => {
        const key = import.meta.env.VITE_GEMINI_API_KEY?.trim() || localStorage.getItem('user_gemini_key');
        setHealth({ ok: true, ai: Boolean(key), model: key ? 'Gemini (Client)' : null });
      });
  }, []);

  // Swap default goal text when toggling EN <-> JA if unchanged
  useEffect(() => {
    if (lang === 'ja' && goal === 'Artificial Intelligence') setGoal('人工知能 (AI)');
    if (lang === 'en' && goal === '人工知能 (AI)') setGoal('Artificial Intelligence');
  }, [lang]);

  const submit = (e) => {
    e.preventDefault();
    if (!goal.trim() || loading) return;
    onGenerate({ goal: goal.trim(), months: Number(months), level, hoursPerDay: Number(hoursPerDay) });
  };

  return (
    <div className="form-backdrop">
      <form className="goal-card glass" onSubmit={submit}>
        <div className="brand">
          <span className="brand-icon">🏔️</span>
          <div style={{ flex: 1 }}>
            <h1>{t.appTitle}</h1>
            <p className="tagline">{t.tagline}</p>
          </div>
          <button type="button" className="lang-switch" onClick={onToggleLang} title="Switch language / 言語切替">
            <span className={lang === 'en' ? 'active' : ''}>EN</span>
            <span className={lang === 'ja' ? 'active' : ''}>日本語</span>
          </button>
        </div>

        <label className="field">
          <span>{t.learningGoal}</span>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t.goalPlaceholder} maxLength={120} autoFocus />
        </label>
        <div className="chips">
          {t.suggestions.map((s) => (
            <button type="button" key={s} className={`chip ${goal === s ? 'active' : ''}`} onClick={() => setGoal(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="row">
          <label className="field">
            <span>{t.timeAvailable}</span>
            <select value={months} onChange={(e) => setMonths(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 9, 12].map((m) => (
                <option key={m} value={m}>
                  {t.monthsUnit(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t.currentLevel}</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="beginner">{t.levels.beginner}</option>
              <option value="intermediate">{t.levels.intermediate}</option>
              <option value="advanced">{t.levels.advanced}</option>
            </select>
          </label>
          <label className="field">
            <span>{t.hoursPerDay}</span>
            <input type="number" min={0.5} max={12} step={0.5} value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} />
          </label>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> {t.surveying}
            </>
          ) : (
            t.generateBtn
          )}
        </button>

        <div className="form-footer">
          <span className={`badge ${health?.ai ? 'ai' : 'demo'}`}>
            {health == null ? t.checkingAi : health.ai ? `✨ Gemini (${health.model})` : t.demoBadgeForm}
          </span>
          {onCancel && (
            <button type="button" className="link" onClick={onCancel}>
              {t.backToMountain}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
