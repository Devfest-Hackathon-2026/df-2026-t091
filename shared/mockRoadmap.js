// Demo-mode roadmap generator (bilingual EN + JA): used when no GEMINI_API_KEY is set or the AI call fails.
import { normalizeRoadmap } from './normalize.js';

export const AI_TOPICS = [
  {
    id: 'python',
    title: 'Python Programming Basics',
    titleJa: 'Pythonプログラミング基礎',
    w: 3,
    diff: 2,
    p: [],
    d: 'Variables, functions, loops and data structures — the language most AI work is written in.',
    dJa: '変数、関数、ループ、データ構造など、AI開発で最も使われるPythonの基礎を固めます。',
    r: ['Python.org official tutorial', 'CS50P (Harvard, free)'],
    rJa: ['Python公式チュートリアル (日本語)', 'Harvard CS50P'],
  },
  {
    id: 'linear-algebra',
    title: 'Linear Algebra Essentials',
    titleJa: '線形代数の基礎',
    w: 2,
    diff: 3,
    p: [],
    d: 'Vectors, matrices and dot products: how data and model weights are represented.',
    dJa: 'ベクトル・行列・内積など、データやモデルの重みを表現する数学の基礎を学びます。',
    r: ['3Blue1Brown – Essence of Linear Algebra', 'Khan Academy Linear Algebra'],
    rJa: ['3Blue1Brown – 線形代数のエッセンス', 'Khan Academy 線形代数'],
  },
  {
    id: 'probability',
    title: 'Probability & Statistics',
    titleJa: '確率・統計の基礎',
    w: 2,
    diff: 3,
    p: [],
    d: 'Distributions, expectation and Bayes’ rule — the language of uncertainty in ML.',
    dJa: '確率分布、期待値、ベイズの定理など、機械学習における不確実性を扱う数学を学びます。',
    r: ['StatQuest (YouTube)', 'Khan Academy Statistics'],
    rJa: ['StatQuest (YouTube)', '統計WEB (BellCurve)'],
  },
  {
    id: 'calculus',
    title: 'Calculus for ML',
    titleJa: '機械学習のための微分積分',
    w: 1.5,
    diff: 3,
    p: [],
    d: 'Derivatives and the chain rule, which power gradient descent and backpropagation.',
    dJa: '勾配降下法や誤差逆伝播法のエンジンとなる偏微分と連鎖律（チェインルール）を理解します。',
    r: ['3Blue1Brown – Essence of Calculus'],
    rJa: ['3Blue1Brown – 微積分のエッセンス'],
  },
  {
    id: 'numpy-pandas',
    title: 'Data Handling with NumPy & Pandas',
    titleJa: 'NumPy・Pandasによるデータ処理',
    w: 2,
    diff: 2,
    p: ['python'],
    d: 'Load, clean, and explore real datasets efficiently.',
    dJa: '実世界のデータセットを効率よく読み込み、前処理・可視化・探索する手法を身につけます。',
    r: ['Kaggle Learn – Pandas', 'NumPy quickstart'],
    rJa: ['Kaggle Learn – Pandas', 'NumPy クイックスタート'],
  },
  {
    id: 'ml-intro',
    title: 'Intro to Machine Learning',
    titleJa: '機械学習入門',
    w: 2,
    diff: 3,
    p: ['numpy-pandas', 'probability'],
    d: 'What learning from data means: features, labels, training and testing.',
    dJa: '特徴量、ラベル、訓練データとテストデータの分割など、データから学ぶ仕組みを理解します。',
    r: ['Google ML Crash Course', 'Kaggle Learn – Intro to ML'],
    rJa: ['Google 機械学習クラッシュコース', 'Kaggle Learn – Intro to ML'],
  },
  {
    id: 'supervised',
    title: 'Supervised Learning',
    titleJa: '教師あり学習',
    w: 3,
    diff: 4,
    restAfter: true,
    restReason: 'Supervised Learning has a steep Level 4/5 test covering regression, trees & ensembles — AI placed Camp I here to consolidate.',
    restReasonJa: '回帰・決定木・アンサンブルを扱う難易度4/5の重要関門です。知識を定着させるためAIが第1キャンプを配置しました。',
    p: ['ml-intro', 'linear-algebra'],
    d: 'Regression and classification with scikit-learn: linear models, trees, ensembles.',
    dJa: 'scikit-learnを用いた回帰と分類（線形モデル、決定木、ランダムフォレストなど）を実装します。',
    r: ['scikit-learn user guide', 'Andrew Ng – Machine Learning Specialization'],
    rJa: ['scikit-learn 公式ガイド', 'Andrew Ng 機械学習コース'],
  },
  {
    id: 'unsupervised',
    title: 'Unsupervised Learning',
    titleJa: '教師なし学習',
    w: 1.5,
    diff: 3,
    p: ['ml-intro'],
    d: 'Clustering and dimensionality reduction for finding structure without labels.',
    dJa: 'クラスタリングや次元削減（PCA）など、ラベルなしデータから構造を発見する手法を学びます。',
    r: ['scikit-learn clustering docs'],
    rJa: ['scikit-learn クラスタリング解説'],
  },
  {
    id: 'evaluation',
    title: 'Model Evaluation & Overfitting',
    titleJa: 'モデル評価と過学習対策',
    w: 1.5,
    diff: 3,
    p: ['supervised'],
    d: 'Cross-validation, metrics, bias/variance — knowing whether a model actually works.',
    dJa: '交差検証、評価指標、バイアスとバリアンスなど、モデルの実力を正しく測る方法を習得します。',
    r: ['Google ML Crash Course – Generalization'],
    rJa: ['Google ML – 汎化と過学習'],
  },
  {
    id: 'neural-networks',
    title: 'Neural Networks & Backprop',
    titleJa: 'ニューラルネットワークと逆伝播',
    w: 3,
    diff: 5,
    restAfter: true,
    restReason: 'Backpropagation is one of the toughest conceptual tests (5/5) — AI recommends resting at Camp II before Deep Learning.',
    restReasonJa: '誤差逆伝播法は最難関（難易度5/5）の理論テストです。深層学習へ進む前にAIが第2キャンプでの休憩を推奨しています。',
    p: ['supervised', 'calculus'],
    d: 'Neurons, layers, activations, and how networks learn through backpropagation.',
    dJa: 'ニューロン、層、活性化関数、そして誤差逆伝播法によってネットワークが学習する仕組みを解き明かします。',
    r: ['3Blue1Brown – Neural Networks', 'Karpathy – Zero to Hero'],
    rJa: ['3Blue1Brown – ニューラルネットワーク', 'Karpathy – Neural Networks: Zero to Hero'],
  },
  {
    id: 'pytorch',
    title: 'Deep Learning with PyTorch',
    titleJa: 'PyTorchによるディープラーニング',
    w: 3,
    diff: 4,
    p: ['neural-networks'],
    d: 'Build and train real models with tensors, autograd, and training loops.',
    dJa: 'テンソル演算、自動微分（autograd）、学習ループを使って実践的な深層学習モデルを構築します。',
    r: ['PyTorch official tutorials', 'fast.ai Practical Deep Learning'],
    rJa: ['PyTorch公式チュートリアル', 'fast.ai 実践ディープラーニング'],
  },
  {
    id: 'cnn',
    title: 'Computer Vision with CNNs',
    titleJa: 'CNNによる画像認識・コンピュータビジョン',
    w: 2,
    diff: 4,
    p: ['pytorch'],
    d: 'Convolutional networks for image classification and transfer learning.',
    dJa: '畳み込みニューラルネットワーク（CNN）と転移学習による画像分類モデルを構築します。',
    r: ['CS231n lecture notes'],
    rJa: ['スタンフォード CS231n 講義ノート'],
  },
  {
    id: 'transformers',
    title: 'Sequence Models & Transformers',
    titleJa: '系列モデルとTransformer',
    w: 3,
    diff: 5,
    restAfter: true,
    restReason: 'Self-Attention & Transformers (Difficulty 5/5) is a steep high-altitude test — rest at Camp III before the final push.',
    restReasonJa: '自己注意機構とTransformer（難易度5/5）は山頂直前の高難度テストです。最終アタック前に第3キャンプで休息しましょう。',
    p: ['pytorch'],
    d: 'Attention and the transformer architecture behind modern AI.',
    dJa: '現代の生成AIの核となるAttention機構とTransformerアーキテクチャを深く理解します。',
    r: ['The Illustrated Transformer (Jay Alammar)', 'Hugging Face course'],
    rJa: ['The Illustrated Transformer', 'Hugging Face NLPコース'],
  },
  {
    id: 'llms',
    title: 'Large Language Models & Prompting',
    titleJa: '大規模言語モデル (LLM) とプロンプト設計',
    w: 2,
    diff: 4,
    p: ['transformers'],
    d: 'How LLMs work, prompting, embeddings, and building with AI APIs.',
    dJa: 'LLMの仕組み、プロンプトエンジニアリング、埋め込み（Embeddings）、AI API活用を学びます。',
    r: ['Google AI Studio docs', 'Hugging Face LLM course'],
    rJa: ['Google AI Studio ドキュメント', 'Hugging Face LLMコース'],
  },
  {
    id: 'capstone',
    title: 'Capstone: Build an AI Project',
    titleJa: '卒業制作：AIプロジェクト開発',
    w: 4,
    diff: 5,
    p: ['evaluation', 'cnn', 'llms', 'unsupervised'],
    d: 'Ship an end-to-end project that proves everything you climbed through.',
    dJa: 'これまでの登山で身につけた全スキルを統合し、独自のAIアプリケーションを完成させて公開します。',
    r: ['Kaggle competitions', 'Publish on GitHub + write-up'],
    rJa: ['Kaggleコンペティション', 'GitHubで公開＆技術記事執筆'],
  },
];

export const genericTopics = (g, gJa = g) => [
  { id: 'why', title: `What is ${g}? Big Picture`, titleJa: `${gJa}の全体像と基礎概念`, w: 1, diff: 1, p: [], d: `A map of the field: key ideas, vocabulary and what people do with ${g}.`, dJa: `${gJa}の全体マップ、基本用語、活用事例を把握します。`, r: ['Wikipedia overview', 'Intro YouTube series'], rJa: ['入門解説記事・動画'] },
  { id: 'tools', title: 'Set Up Your Tools', titleJa: '学習・開発環境のセットアップ', w: 1, diff: 2, p: [], d: 'Install and get comfortable with the tools and resources you will use daily.', dJa: '毎日使うツールや環境を整え、基本操作に慣れます。', r: ['Official getting-started guide'], rJa: ['公式スタートガイド'] },
  { id: 'fundamentals-1', title: `${g} Fundamentals I`, titleJa: `${gJa}の基礎 I`, w: 3, diff: 2, p: ['why'], d: 'The first core building blocks everything else depends on.', dJa: 'すべての土台となる最初の重要コンセプトを学びます。', r: ['Beginner textbook / course chapter 1-3'], rJa: ['入門テキスト 第1〜3章'] },
  { id: 'fundamentals-2', title: `${g} Fundamentals II`, titleJa: `${gJa}の基礎 II`, w: 3, diff: 4, restAfter: true, restReason: 'Completing the core fundamentals test (4/5) warrants a rest at Camp I.', restReasonJa: '基礎の総仕上げテスト（難易度4/5）突破後に第1キャンプで知識を整理します。', p: ['fundamentals-1', 'tools'], d: 'Deepen the basics and connect them together.', dJa: '基礎知識を深め、複数の概念を組み合わせて使えるようにします。', r: ['Beginner course chapter 4-6'], rJa: ['入門テキスト 第4〜6章'] },
  { id: 'practice-1', title: 'Guided Practice', titleJa: 'ガイド付き実践演習', w: 2, diff: 3, p: ['fundamentals-2'], d: 'Small exercises to turn knowledge into skill.', dJa: '小規模な演習問題を通して、知識を実践スキルへと変えます。', r: ['Exercise sets', 'Flashcards'], rJa: ['実践問題集'] },
  { id: 'core-a', title: 'Core Technique A', titleJa: '中級コア技術 A', w: 3, diff: 4, p: ['fundamentals-2'], d: 'The first major intermediate technique in the field.', dJa: '現場で必須となる中級レベルの主要テクニックを習得します。', r: ['Intermediate course module'], rJa: ['中級コース モジュールA'] },
  { id: 'core-b', title: 'Core Technique B', titleJa: '中級コア技術 B', w: 3, diff: 5, restAfter: true, restReason: 'Core Techniques A & B are a steep 5/5 checkpoint — rest at Camp II.', restReasonJa: '中級コア技術は難易度5/5の急斜面です。第2キャンプで休息を取りましょう。', p: ['fundamentals-2'], d: 'A complementary technique that broadens your toolkit.', dJa: '応用範囲を広げるもう一つの重要アプローチを身につけます。', r: ['Intermediate course module'], rJa: ['中級コース モジュールB'] },
  { id: 'mini-project', title: 'Mini Project', titleJa: 'ミニプロジェクト制作', w: 3, diff: 4, p: ['practice-1', 'core-a'], d: 'Build/produce something small and real on your own.', dJa: '自分の力で小さな作品をゼロから形にしてみます。', r: ['Community project ideas'], rJa: ['ハンズオン制作課題'] },
  { id: 'advanced', title: `Advanced ${g}`, titleJa: `${gJa}の応用・発展`, w: 3, diff: 5, restAfter: true, restReason: 'Advanced concepts (5/5) push your limits — recharge at Camp III before the summit.', restReasonJa: '発展トピック（難易度5/5）を突破したら、頂上アタック前に第3キャンプで休養します。', p: ['core-a', 'core-b'], d: 'Explore advanced topics and how experts approach problems.', dJa: '上級者が使う高度な手法や問題解決のアプローチを探求します。', r: ['Advanced book / lectures'], rJa: ['専門書・応用講義'] },
  { id: 'real-world', title: 'Real-World Application', titleJa: '実社会ケーススタディ', w: 2, diff: 4, p: ['advanced'], d: 'Apply your skills to an authentic situation or dataset.', dJa: '実際の課題やデータに対してスキルを適用し、検証します。', r: ['Case studies'], rJa: ['実践ケーススタディ'] },
  { id: 'capstone', title: `Capstone: Master ${g}`, titleJa: `集大成プロジェクト：${gJa}マスター`, w: 4, diff: 5, p: ['mini-project', 'real-world'], d: 'A final showcase that demonstrates the whole climb.', dJa: 'これまでの登山の集大成となるポートフォリオ作品を完成させます。', r: ['Portfolio / presentation'], rJa: ['ポートフォリオ公開・発表'] },
];

export function mockRoadmap(input) {
  const goal = String(input.goal || '').trim() || 'Artificial Intelligence';
  const isAI = /\b(ai|a\.i\.|artificial intelligence|machine learning|ml|deep learning)\b/i.test(goal) || /人工知能|機械学習|ディープラーニング/.test(goal);
  const goalEn = isAI ? 'Artificial Intelligence' : goal;
  const goalJa = isAI ? '人工知能 (AI)' : goal;
  const topics = isAI ? AI_TOPICS : genericTopics(goalEn, goalJa);

  const months = Number(input.months) || 3;
  const hoursPerDay = Number(input.hoursPerDay) || 2;
  const totalHours = Math.round(months * 30 * hoursPerDay);
  const totalWeeks = Math.max(1, Math.round(months * 4.3));
  const foundationFactor = { beginner: 1, intermediate: 0.5, advanced: 0.25 }[input.level] ?? 1;

  const weights = topics.map((t) => (t.p.length === 0 ? t.w * foundationFactor : t.w));
  const sum = weights.reduce((a, b) => a + b, 0);
  let cum = 0;

  const nodes = topics.map((t, i) => {
    const hours = Math.max(1, Math.round((weights[i] / sum) * totalHours));
    const week = 1 + Math.floor((cum / totalHours) * totalWeeks);
    cum += hours;
    return {
      id: t.id,
      title: t.title,
      titleJa: t.titleJa,
      description: t.d,
      descriptionJa: t.dJa,
      hours,
      week,
      difficulty: t.diff,
      restAfter: Boolean(t.restAfter),
      restReason: t.restReason || '',
      restReasonJa: t.restReasonJa || '',
      prerequisites: t.p,
      resources: t.r,
      resourcesJa: t.rJa,
    };
  });

  const levelJa = { beginner: '初心者', intermediate: '中級者', advanced: '上級者' }[input.level] || '初心者';

  return normalizeRoadmap(
    {
      source: 'demo',
      goal: goalEn,
      goalJa,
      summary: `A ${months}-month climb toward ${goalEn} at ${hoursPerDay}h/day (~${totalHours}h total), starting from a ${input.level || 'beginner'} level. Foundations sit at the base; your capstone waits at the summit.`,
      summaryJa: `${levelJa}レベルから始める、1日${hoursPerDay}時間・${months}ヶ月間（計約${totalHours}時間）の「${goalJa}」攻略ルートです。麓の基礎から一歩ずつ登り、山頂の集大成プロジェクトを目指しましょう。`,
      nodes,
    },
    { ...input, goal: goalEn, goalJa }
  );
}
