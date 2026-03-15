import { useState, useCallback } from 'react';

const TESTS = [1, 2, 3, 4, 5] as const;
const QUESTIONS_PER_TEST = 100;

type Mode = 'all-random' | 'test-sorted' | 'test-random';

interface Card {
  test: number;
  no: number;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(testNo: number, order: 'sorted' | 'random'): Card[] {
  const cards: Card[] = Array.from({ length: QUESTIONS_PER_TEST }, (_, i) => ({
    test: testNo,
    no: i + 1,
  }));
  return order === 'random' ? shuffle(cards) : cards;
}

function buildAllRandom(): Card[] {
  const cards: Card[] = TESTS.flatMap(t =>
    Array.from({ length: QUESTIONS_PER_TEST }, (_, i) => ({ test: t, no: i + 1 }))
  );
  return shuffle(cards);
}

function imgPath(test: number, no: number, side: 'question' | 'answer'): string {
  return `/data/${test}/${no}/${side}.png`;
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);

  const startMode = useCallback((m: Mode, test?: number) => {
    const d =
      m === 'all-random' ? buildAllRandom() :
      m === 'test-sorted' ? buildDeck(test!, 'sorted') :
      buildDeck(test!, 'random');
    setDeck(d);
    setIndex(0);
    setFlipped(false);
    setImgError(false);
    setMode(m);
    setSelectedTest(test ?? null);
  }, []);

  const navigate = (dir: -1 | 1) => {
    setFlipped(false);
    setImgError(false);
    setIndex(i => Math.max(0, Math.min(deck.length - 1, i + dir)));
  };

  const flip = () => {
    setFlipped(f => !f);
    setImgError(false);
  };

  const reset = () => { setMode(null); setSelectedTest(null); };

  if (!mode) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Flashcards</h1>

        <div style={s.modeCard} onClick={() => startMode('all-random')}>
          <div style={s.modeTitle}>🎲 Random — All 500</div>
          <div style={s.modeDesc}>Random questions from all 5 tests</div>
        </div>

        <h2 style={s.subtitle}>Choose a Test</h2>
        <div style={s.testGrid}>
          {TESTS.map(t => (
            <div key={t} style={s.testCard}>
              <div style={s.testLabel}>Test {t}</div>
              <button style={s.btn} onClick={() => startMode('test-sorted', t)}>In Order</button>
              <button style={s.btn} onClick={() => startMode('test-random', t)}>Random</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const card = deck[index];
  const side = flipped ? 'answer' : 'question';
  const modeLabel =
    mode === 'all-random' ? 'All 500 — Random' :
    mode === 'test-sorted' ? `Test ${selectedTest} — In Order` :
    `Test ${selectedTest} — Random`;
  const progress = ((index + 1) / deck.length) * 100;

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={reset}>← Back</button>
        <span style={s.modeTag}>{modeLabel}</span>
        <span style={s.counter}>{index + 1} / {deck.length}</span>
      </div>

      <div style={s.flashcard} onClick={flip}>
        {imgError ? (
          <div style={s.placeholder}>
            <div>{flipped ? 'Answer' : 'Question'}</div>
            <div style={s.placeholderSub}>Test {card.test} · Q{card.no}</div>
          </div>
        ) : (
          <img
            key={`${card.test}-${card.no}-${side}`}
            src={imgPath(card.test, card.no, side)}
            alt={side}
            style={s.img}
            onError={() => setImgError(true)}
          />
        )}
        <div style={s.flipHint}>{flipped ? 'Click to see question' : 'Click to flip'}</div>
      </div>

      <div style={s.navRow}>
        <button style={s.navBtn} onClick={() => navigate(-1)} disabled={index === 0}>← Prev</button>
        <button style={s.navBtn} onClick={flip}>{flipped ? 'Show Question' : 'Show Answer'}</button>
        <button style={s.navBtn} onClick={() => navigate(1)} disabled={index === deck.length - 1}>Next →</button>
      </div>

      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { fontSize: 32, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' },
  subtitle: { fontSize: 18, fontWeight: 600, margin: '24px 0 12px', color: '#94a3b8' },
  modeCard: {
    background: '#1e293b',
    border: '2px solid #334155',
    borderRadius: 16,
    padding: '24px 40px',
    cursor: 'pointer',
    textAlign: 'center',
    width: 320,
  },
  modeTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  modeDesc: { fontSize: 13, color: '#94a3b8' },
  testGrid: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  testCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'center',
    width: 110,
  },
  testLabel: { fontWeight: 700, marginBottom: 8 },
  btn: {
    display: 'block',
    width: '100%',
    marginTop: 6,
    padding: '6px 0',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    width: '100%',
    maxWidth: 640,
  },
  backBtn: {
    background: 'none',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
  },
  modeTag: { flex: 1, textAlign: 'center', fontWeight: 600, color: '#60a5fa' },
  counter: { color: '#64748b', fontSize: 14 },
  flashcard: {
    width: '100%',
    maxWidth: 640,
    minHeight: 380,
    background: '#1e293b',
    borderRadius: 20,
    border: '2px solid #334155',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  img: { maxWidth: '100%', maxHeight: 360, objectFit: 'contain', padding: 16 },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    color: '#475569',
    fontSize: 18,
    fontWeight: 600,
  },
  placeholderSub: { fontSize: 13, marginTop: 8, opacity: 0.5 },
  flipHint: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 12,
    color: '#475569',
  },
  navRow: { display: 'flex', gap: 12, marginTop: 20 },
  navBtn: {
    padding: '10px 24px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  progressBar: {
    width: '100%',
    maxWidth: 640,
    height: 4,
    background: '#1e293b',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', background: '#3b82f6', borderRadius: 4, transition: 'width 0.3s' },
};
