import React, { useEffect, useState } from 'react';
import { STRINGS } from '../lib/i18n.js';

export default function TopicPanel({
  lang = 'en',
  node,
  roadmap,
  statusOf,
  isDone,
  canUndo,
  hoursSinceRest = 0,
  onComplete,
  onUndo,
  onSelect,
  onClose,
}) {
  const s = STRINGS[lang] || STRINGS.en;
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setQuiz(null);
    setLoadingQuiz(false);
    setAnswers({});
    setSubmitted(false);
  }, [node?.id, lang]);

  if (!node) return null;
  const status = statusOf(node);
  const byId = (id) => roadmap.nodes.find((n) => n.id === id);
  const unlocks = roadmap.nodes.filter((n) => n.prerequisites.includes(node.id));
  const diff = node.difficulty || 3;

  const startTest = async () => {
    setLoadingQuiz(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: node.title,
          description: node.description,
          goal: roadmap.goal,
          difficulty: diff,
          hoursSinceRest,
          lang,
        }),
      });
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct?.includes('application/json')) throw new Error('Not JSON');
      const data = await res.json();
      setQuiz(data);
    } catch {
      setQuiz({
        testDifficulty: diff,
        restIfPassed: diff >= 4,
        restAdvicePassed:
          lang === 'ja'
            ? diff >= 4
              ? `「${node.title}」は難易度 ${diff}/5 のハードなテストでした！知識を定着させるためAIキャンプで休憩しましょう。`
              : `素晴らしい登破です！難易度 ${diff}/5 なので、まだ余力をもって次に進めます。`
            : diff >= 4
              ? `That was a steep Level ${diff}/5 test on "${node.title}". AI recommends resting at camp so these concepts sink in.`
              : `Great climb! This test was difficulty ${diff}/5 — you're fresh enough to keep ascending.`,
        restAdviceStruggled:
          lang === 'ja'
            ? `「${node.title}」（難易度 ${diff}/5）は手強いテストでした。AIキャンプで休憩して復習しましょう。`
            : `This "${node.title}" test was tough (${diff}/5). AI recommends resting at camp now to recharge and review.`,
        questions: [
          {
            q: lang === 'ja' ? `「${node.title}」の最も重要な目的は何ですか？` : `What is the core objective of "${node.title}"?`,
            options:
              lang === 'ja'
                ? [
                    node.description || `「${node.title}」の核心を理解し応用できるようにする。`,
                    '前提知識をすべて飛ばす。',
                    '実践演習を行わない。',
                    '他のトピックとの関連を無視する。',
                  ]
                : [
                    node.description || `Understanding and applying ${node.title}.`,
                    'Skipping foundational prerequisites.',
                    'Avoiding practical exercises.',
                    'Ignoring how it connects to the rest of the roadmap.',
                  ],
            answer: 0,
            explanation:
              lang === 'ja'
                ? '核心概念をマスターすることで次のステージへの道が開けます。'
                : 'Mastering the core concept unlocks the next stage of the climb.',
          },
        ],
      });
    } finally {
      setLoadingQuiz(false);
    }
  };

  const questions = quiz?.questions || [];
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0);
  const struggled = submitted && score < questions.length;
  const testDiff = quiz?.testDifficulty || diff;
  const aiSaysRest =
    Boolean(node.restAfter) ||
    Boolean(quiz?.restIfPassed) ||
    testDiff >= 4 ||
    struggled ||
    hoursSinceRest + node.hours >= 40;
  const aiAdvice = struggled ? quiz?.restAdviceStruggled : quiz?.restAdvicePassed || node.restReason;

  const finishWithTest = () => {
    onComplete(node.id, {
      shouldRest: aiSaysRest,
      restReason:
        aiAdvice ||
        (lang === 'ja'
          ? `「${node.title}」（テスト難易度 ${testDiff}/5、スコア ${score}/${questions.length}）の結果に基づき、AIがここでの休憩を推奨しました。`
          : `AI evaluated "${node.title}" (Test difficulty ${testDiff}/5, score ${score}/${questions.length}) and recommends a rest stop here.`),
    });
  };

  return (
    <aside className="topic-panel glass">
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className={`status-pill ${status}`}>
        {status === 'completed' ? s.statusClimbed : status === 'available' ? s.statusReady : s.statusLocked}
      </div>
      <h2>{node.title}</h2>
      <div className="meta">
        <span>{s.weekNum(node.week)}</span>
        <span>⏱ {node.hours}h</span>
        <span>{s.stageNum(node.level + 1)}</span>
        <span className={`diff-badge d${diff}`}>{s.diffBadge(diff, s.diffLabels[diff])}</span>
      </div>
      <p className="desc">{node.description}</p>

      {(node.restAfter || diff >= 4) && (
        <div className="ai-rest-box">
          <b>{s.aiRestDecision}</b> {node.restReason || s.defaultRestReason(diff)}
        </div>
      )}

      {!quiz && node.prerequisites.length > 0 && (
        <section>
          <h3>{s.beforeThisLearn}</h3>
          <ul className="topic-links">
            {node.prerequisites.map((id) => (
              <li key={id}>
                <button onClick={() => onSelect(id)} className={isDone(id) ? 'done' : ''}>
                  {isDone(id) ? '✓' : '○'} {byId(id)?.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!quiz && node.resources.length > 0 && (
        <section>
          <h3>{s.resources}</h3>
          <ul className="resources">
            {node.resources.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {!quiz && unlocks.length > 0 && (
        <section>
          <h3>{s.unlocks}</h3>
          <ul className="topic-links">
            {unlocks.map((n) => (
              <li key={n.id}>
                <button onClick={() => onSelect(n.id)}>↑ {n.title}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {quiz && (
        <section className="quiz-box">
          <div className="quiz-head">
            <h3>{s.aiCheckpointTest}</h3>
            <span className={`diff-badge d${testDiff}`}>{s.hardness(testDiff)}</span>
          </div>
          {questions.map((q, qi) => (
            <div key={qi} className="quiz-q">
              <p className="q-text">
                {qi + 1}. {q.q}
              </p>
              <div className="q-opts">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const isRight = submitted && oi === q.answer;
                  const isWrong = submitted && chosen && oi !== q.answer;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={submitted}
                      className={`q-opt ${chosen ? 'chosen' : ''} ${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="q-exp">💡 {q.explanation}</p>}
            </div>
          ))}

          {submitted && (
            <div className={`ai-verdict ${aiSaysRest ? 'rest' : 'go'}`}>
              <b>{aiSaysRest ? s.verdictRest : s.verdictGo}</b>
              <p>{aiAdvice}</p>
            </div>
          )}
        </section>
      )}

      <div className="panel-actions">
        {status === 'available' && !quiz && (
          <>
            <button className="primary" onClick={startTest} disabled={loadingQuiz}>
              {loadingQuiz ? (
                <>
                  <span className="spinner" /> {s.preparingTest}
                </>
              ) : (
                s.takeTestBtn
              )}
            </button>
            <button
              className="secondary"
              onClick={() => onComplete(node.id, { shouldRest: Boolean(node.restAfter || diff >= 4) })}
              title={s.quickClimbTitle}
            >
              {s.quickClimbBtn}
            </button>
          </>
        )}
        {status === 'available' && quiz && !submitted && (
          <button className="primary" disabled={!allAnswered} onClick={() => setSubmitted(true)}>
            {s.gradeTestBtn}
          </button>
        )}
        {status === 'available' && quiz && submitted && (
          <button className="primary" onClick={finishWithTest}>
            {aiSaysRest ? s.climbAndRestBtn : s.completeAndContinueBtn}
          </button>
        )}
        {status === 'locked' && <p className="hint">{s.lockedHint}</p>}
        {status === 'completed' && (
          <button
            className="secondary"
            onClick={() => onUndo(node.id)}
            disabled={!canUndo}
            title={canUndo ? '' : s.undoDisabledTitle}
          >
            {s.undoBtn}
          </button>
        )}
      </div>
    </aside>
  );
}
