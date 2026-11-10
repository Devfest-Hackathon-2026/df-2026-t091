// Normalizes any roadmap (from Gemini or the demo generator) into a safe shape:
// unique ids, prerequisites that only point to EARLIER topics (guarantees a DAG),
// numeric hours/weeks, difficulty (1..5), AI-chosen rest points, bilingual (EN/JA) fields, and computed graph levels.

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'topic';

const KNOWN_JA = {
  python: ['Pythonプログラミング基礎', '変数、関数、ループ、データ構造など、AI開発で最も使われるPythonの基礎を固めます。'],
  'python-for-ai': ['AIのためのPython基礎', 'AI・データサイエンス開発に必要なPython構文、データ構造、ライブラリ活用の基礎を習得します。'],
  'linear-algebra': ['線形代数の基礎', 'ベクトル・行列・内積など、データやモデルの重みを表現する数学の基礎を学びます。'],
  'linear-algebra-calculus': ['線形代数と微分積分', '機械学習の土台となるベクトル・行列演算と、勾配降下法を支える微分の基礎を学びます。'],
  probability: ['確率・統計の基礎', '確率分布、期待値、ベイズの定理など、機械学習における不確実性を扱う数学を学びます。'],
  'probability-statistics': ['確率・統計の基礎', 'データの分布、仮説検定、ベイズ推論など、モデル理解に不可欠な確率統計を学びます。'],
  calculus: ['機械学習のための微分積分', '勾配降下法や誤差逆伝播法のエンジンとなる偏微分と連鎖律を理解します。'],
  'numpy-pandas': ['NumPy・Pandasによるデータ処理', '実世界のデータセットを効率よく読み込み、前処理・可視化・探索する手法を身につけます。'],
  'ml-intro': ['機械学習入門', '特徴量、ラベル、訓練データとテストデータの分割など、データから学ぶ仕組みを理解します。'],
  'intro-to-ml': ['機械学習入門', '教師あり・教師なし学習の全体像と、データから予測モデルを作る基本フローを学びます。'],
  supervised: ['教師あり学習', 'scikit-learnを用いた回帰と分類（線形モデル、決定木、ランダムフォレストなど）を実装します。'],
  'supervised-learning': ['教師あり学習', '線形回帰、ロジスティック回帰、決定木、SVMなどの代表的な予測モデルを構築します。'],
  unsupervised: ['教師なし学習', 'クラスタリングや次元削減（PCA）など、ラベルなしデータから構造を発見する手法を学びます。'],
  'unsupervised-learning': ['教師なし学習', 'k-meansクラスタリングや主成分分析（PCA）を用いてデータの隠れた構造を発見します。'],
  evaluation: ['モデル評価と過学習対策', '交差検証、評価指標、バイアスとバリアンスなど、モデルの実力を正しく測る方法を習得します。'],
  'model-evaluation-tuning': ['モデル評価とハイパーパラメータ調整', '交差検証、適合率・再現率、過学習対策とチューニング手法を身につけます。'],
  'neural-networks': ['ニューラルネットワークと逆伝播', 'ニューロン、層、活性化関数、そして誤差逆伝播法によってネットワークが学習する仕組みを解き明かします。'],
  'intro-to-dl': ['ディープラーニング入門', '多層ニューラルネットワークの構造、活性化関数、誤差逆伝播法と最適化の基礎を学びます。'],
  pytorch: ['PyTorchによるディープラーニング', 'テンソル演算、自動微分、学習ループを使って実践的な深層学習モデルを構築します。'],
  cnn: ['CNNによる画像認識', '畳み込みニューラルネットワーク（CNN）と転移学習による画像分類モデルを構築します。'],
  'convolutional-nns': ['畳み込みニューラルネットワーク (CNN)', '画像認識・コンピュータビジョンの核となるCNNの構造と転移学習を学びます。'],
  transformers: ['系列モデルとTransformer', '現代の生成AIの核となるAttention機構とTransformerアーキテクチャを深く理解します。'],
  'recurrent-nns-transformers': ['系列モデル・RNN・Transformer', '自然言語や時系列データを扱うRNNと、現代AIの主流であるTransformerを学びます。'],
  llms: ['大規模言語モデル (LLM) とプロンプト', 'LLMの仕組み、プロンプトエンジニアリング、埋め込み、AI API活用を学びます。'],
  'ethics-in-ai': ['AI倫理と安全性', 'バイアス、公平性、説明可能性（XAI）など、責任あるAI開発に不可欠な視点を学びます。'],
  'mlops-deployment': ['MLOpsとモデルのデプロイ', '学習済みモデルをAPI・クラウド環境にデプロイし、運用・監視する手法を習得します。'],
  capstone: ['卒業制作：AIプロジェクト開発', 'これまでの登山で身につけた全スキルを統合し、独自のAIアプリケーションを完成させて公開します。'],
  'ai-capstone-project': ['集大成：AIキャップストーン・プロジェクト', '学んだ知識を総動員し、データ収集から学習・デプロイまで一貫したAIプロダクトを完成させます。'],
};

/** Ensures every node has a difficulty (1..5), bilingual fallbacks, and AI rest stops after the hardest tests. */
export function ensureDifficultyAndRests(nodes) {
  if (!nodes?.length) return nodes;
  const maxLvl = Math.max(1, ...nodes.map((n) => n.level || 0));
  const avgHours = nodes.reduce((s, n) => s + (n.hours || 4), 0) / nodes.length;

  nodes.forEach((n) => {
    if (!n.difficulty || n.difficulty < 1 || n.difficulty > 5) {
      const lvlScore = 1 + ((n.level || 0) / maxLvl) * 3;
      const hrBonus = (n.hours || 4) > avgHours * 1.15 ? 1 : 0;
      n.difficulty = Math.min(5, Math.max(1, Math.round(lvlScore + hrBonus)));
    }
    if (!n.titleJa && KNOWN_JA[n.id]) {
      n.titleJa = KNOWN_JA[n.id][0];
      n.descriptionJa = n.descriptionJa || KNOWN_JA[n.id][1];
    }
  });

  // If AI didn't explicitly mark restAfter (or on legacy saved roadmaps), pick the hardest checkpoints.
  const hasRests = nodes.some((n) => n.restAfter);
  if (!hasRests && nodes.length >= 4) {
    const candidates = nodes.slice(0, -1); // exclude final summit capstone
    const bands = [
      [0.15, 0.42],
      [0.42, 0.7],
      [0.7, 0.95],
    ];
    bands.forEach(([lo, hi]) => {
      const startIdx = Math.floor(lo * candidates.length);
      const endIdx = Math.max(startIdx + 1, Math.ceil(hi * candidates.length));
      const slice = candidates.slice(startIdx, endIdx);
      if (!slice.length) return;
      const hardest = slice.reduce((best, cur) =>
        cur.difficulty * 10 + cur.hours > best.difficulty * 10 + best.hours ? cur : best
      );
      hardest.restAfter = true;
      hardest.restReason =
        hardest.restReason ||
        `AI scheduled a rest stop after "${hardest.title}" (Difficulty ${hardest.difficulty}/5, ${hardest.hours}h) so you can recover after this tough test.`;
    });
  }

  nodes.forEach((n) => {
    if (n.restAfter && !n.restReasonJa) {
      const tJa = n.titleJa || n.title;
      n.restReasonJa = `「${tJa}」はテスト難易度 ${n.difficulty}/5（${n.hours}時間）の難関ポイントのため、AIが記憶定着と疲労回復のために休憩キャンプを配置しました。`;
    }
  });

  return nodes;
}

export function normalizeRoadmap(raw, input) {
  const months = Number(input.months) || 3;
  const hoursPerDay = Number(input.hoursPerDay) || 2;
  const totalHours = Math.round(months * 30 * hoursPerDay);
  const totalWeeks = Math.max(1, Math.round(months * 4.3));

  const seen = new Set();
  const idMap = new Map(); // raw id -> clean id
  const nodes = [];

  for (const n of raw?.nodes || []) {
    if (!n || !n.title) continue;
    let id = slug(n.id || n.title);
    while (seen.has(id)) id += '-x';
    seen.add(id);
    idMap.set(String(n.id ?? n.title), id);

    const prereqs = (Array.isArray(n.prerequisites) ? n.prerequisites : [])
      .map((p) => idMap.get(String(p)) || (seen.has(slug(p)) ? slug(p) : null))
      .filter((p) => p && p !== id);

    nodes.push({
      id,
      title: String(n.title).slice(0, 80),
      titleJa: n.titleJa ? String(n.titleJa).slice(0, 80) : undefined,
      description: String(n.description || '').slice(0, 500),
      descriptionJa: n.descriptionJa ? String(n.descriptionJa).slice(0, 500) : undefined,
      hours: Math.max(1, Math.round(Number(n.hours) || 4)),
      week: Math.min(totalWeeks, Math.max(1, Math.round(Number(n.week) || 1))),
      difficulty: Math.min(5, Math.max(1, Math.round(Number(n.difficulty) || 0))) || undefined,
      restAfter: Boolean(n.restAfter),
      restReason: String(n.restReason || '').slice(0, 260),
      restReasonJa: n.restReasonJa ? String(n.restReasonJa).slice(0, 260) : undefined,
      prerequisites: [...new Set(prereqs)],
      resources: (Array.isArray(n.resources) ? n.resources : []).map(String).slice(0, 4),
      resourcesJa: Array.isArray(n.resourcesJa) ? n.resourcesJa.map(String).slice(0, 4) : undefined,
    });
  }

  // Compute level = longest prerequisite chain depth.
  const level = {};
  for (const n of nodes) {
    level[n.id] = n.prerequisites.length ? 1 + Math.max(...n.prerequisites.map((p) => level[p])) : 0;
    n.level = level[n.id];
  }

  ensureDifficultyAndRests(nodes);

  const goalEn = String(raw?.goal || input.goal || 'My Goal');
  const isAiGoal = /\b(ai|a\.i\.|artificial intelligence)\b/i.test(goalEn);
  const goalJa = String(raw?.goalJa || input.goalJa || (isAiGoal ? '人工知能 (AI)' : goalEn));
  const summaryJa =
    raw?.summaryJa ||
    `1日${hoursPerDay}時間・${months}ヶ月間（計約${totalHours}時間）で「${goalJa}」を制覇する学習登山ルートです。麓の基礎から山頂の集大成プロジェクトまで一歩ずつ登りましょう。`;

  return {
    goal: goalEn,
    goalJa,
    summary: String(raw?.summary || ''),
    summaryJa,
    months,
    level: input.level || 'beginner',
    hoursPerDay,
    totalHours,
    totalWeeks,
    source: raw?.source || 'ai',
    createdAt: new Date().toISOString(),
    nodes,
  };
}
