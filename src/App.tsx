import { useState, useCallback, useRef, useEffect } from 'react';

const TESTS = [1, 2, 3, 4, 5] as const;
const QUESTIONS_PER_TEST = 100;

type Mode = 'all-random' | 'test-sorted' | 'test-random';

interface Card {
  test: number;
  no: number;
}

interface TranslationEntry {
  question: string;
  answer: string;
  explanation: string;
}

type TranslationMap = Record<string, TranslationEntry>;

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
  return `/data/${test}/${no}/${side === 'question' ? 'q' : 'a'}.png`;
}

async function loadTranslations(test: number): Promise<TranslationMap> {
  const urls = [
    `/data/${test}/translations_codex.json`,
    `/data/${test}/translations.json`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) continue;
      return await res.json() as TranslationMap;
    } catch {
      continue;
    }
  }

  throw new Error('No translation file is available for this test.');
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [translation, setTranslation] = useState<TranslationEntry | null>(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const explainRef = useRef<HTMLDivElement>(null);
  const translationsCache = useRef(new Map<number, TranslationMap>());

  useEffect(() => {
    setTranslation(null);
    setTranslationError(null);
  }, [index, flipped]);


  const startMode = useCallback((m: Mode, test?: number) => {
    const d =
      m === 'all-random' ? buildAllRandom() :
      m === 'test-sorted' ? buildDeck(test!, 'sorted') :
      buildDeck(test!, 'random');
    setDeck(d);
    setIndex(0);
    setFlipped(false);
    setImgError(false);
    setTranslation(null);
    setTranslationError(null);
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

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(1);
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        flip();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, navigate, flip]);

  const reset = () => { setMode(null); setSelectedTest(null); };

  const handleExplain = async () => {
    setIsLoadingTranslation(true);
    setTranslation(null);
    setTranslationError(null);

    try {
      const card = deck[index];
      let map = translationsCache.current.get(card.test);
      if (!map) {
        map = await loadTranslations(card.test);
        translationsCache.current.set(card.test, map);
      }

      const entry = map[String(card.no)];
      if (!entry) throw new Error(`No translation available for question ${card.no}.`);

      setTranslation(entry);
      setTimeout(() => explainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (e) {
      setTranslationError(e instanceof Error ? e.message : 'Unable to load translation.');
    } finally {
      setIsLoadingTranslation(false);
    }
  };

  // ── Home screen ──────────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center px-4 py-12 font-sans">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
            <span className="text-2xl">🗂</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Flashcards</h1>
          <p className="mt-1 text-slate-400 text-sm">500 questions across 5 tests</p>
        </div>

        <button
          onClick={() => startMode('all-random')}
          className="w-full max-w-sm mb-8 group relative rounded-2xl bg-indigo-600 hover:bg-indigo-500 transition-colors p-6 text-left shadow-lg shadow-indigo-900/40 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎲</span>
            <div>
              <div className="text-lg font-bold text-white">Random — All 500</div>
              <div className="text-indigo-200 text-sm">Shuffle all questions from every test</div>
            </div>
          </div>
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-300 group-hover:translate-x-1 transition-transform">→</span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Or choose a test</p>
        <div className="w-full max-w-sm flex flex-col gap-3 mb-10">
          {TESTS.map(t => (
            <div key={t} className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3">
              <span className="text-slate-300 font-bold w-14">Test {t}</span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => startMode('test-sorted', t)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
                >
                  In Order
                </button>
                <button
                  onClick={() => startMode('test-random', t)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  Random
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Study screen ─────────────────────────────────────────────────────────────
  const card = deck[index];
  const side = flipped ? 'answer' : 'question';
  const modeLabel =
    mode === 'all-random' ? 'All 500 · Random' :
    mode === 'test-sorted' ? `Test ${selectedTest} · In Order` :
    `Test ${selectedTest} · Random`;
  const progress = ((index + 1) / deck.length) * 100;

  return (
    <div className="h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col font-sans overflow-hidden">

      {/* ── Top bar ── */}
      <header className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button
          onClick={reset}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 bg-slate-800/60 hover:bg-slate-700/60 transition-all cursor-pointer"
        >
          ← Back
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-indigo-400 truncate px-1">{modeLabel}</span>
        <span className="text-sm font-mono text-slate-400 tabular-nums min-w-[4rem] text-right">
          {index + 1}<span className="text-slate-600">/{deck.length}</span>
        </span>
      </header>

      {/* ── Progress bar ── */}
      <div className="shrink-0 h-1 mx-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Card — grows to fill remaining space ── */}
      <div className="flex-1 min-h-0 px-3 pt-3 pb-1">
        <div
          onClick={flip}
          className="relative w-full h-full rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur cursor-pointer overflow-hidden shadow-2xl hover:border-indigo-500/40 active:scale-[0.995] transition-all select-none"
        >
            {/* Side badge */}
            <div className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-xs font-bold tracking-wide ${
              flipped
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}>
              {flipped ? 'ANSWER' : 'QUESTION'}
            </div>

            {/* Card id */}
            <div className="absolute top-3 right-3 z-10 text-xs text-slate-600 font-mono">
              T{card.test}·Q{card.no}
            </div>

            {imgError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-4xl">🖼</span>
                <span className="font-semibold">{flipped ? 'Answer' : 'Question'} image not found</span>
                <span className="text-xs text-slate-600">Test {card.test} · Q{card.no}</span>
              </div>
            ) : (
              <img
                key={`${card.test}-${card.no}-${side}`}
                src={imgPath(card.test, card.no, side)}
                alt={side}
                className="absolute inset-0 w-full h-full object-contain p-3"
                onError={() => setImgError(true)}
              />
            )}

            {/* Flip hint */}
            <div className="absolute bottom-3 right-4 z-10 text-xs text-slate-600">
              {flipped ? 'tap for question' : 'tap to flip'}
            </div>
        </div>
      </div>

      {/* ── Scrollable bottom section (translation) ── */}
      {(translation || translationError) && (
        <div className="shrink-0 max-h-[30vh] overflow-y-auto px-3 pb-1">
          <div ref={explainRef} className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
            {translationError ? (
              <p className="text-sm text-red-400">{translationError}</p>
            ) : translation && (
              <div className="space-y-3 text-sm leading-relaxed">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    {flipped ? 'Answer Translation' : 'Question Translation'}
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap">
                    {flipped ? translation.answer : translation.question}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Explanation
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap">{translation.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom action bar ── */}
      <div className="shrink-0 px-3 pt-2 pb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={index === 0}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Prev
          </button>
          <button
            onClick={flip}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
              flipped
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30'
                : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
            }`}
          >
            {flipped ? 'Show Question' : 'Show Answer'}
          </button>
          <button
            onClick={() => navigate(1)}
            disabled={index === deck.length - 1}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Next →
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleExplain}
            disabled={isLoadingTranslation || imgError}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingTranslation ? (
              <>
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full" />
                Loading translation…
              </>
            ) : (
              <>Translate & Explain</>
            )}
          </button>

          {mode === 'test-sorted' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const input = (e.currentTarget.elements.namedItem('qno') as HTMLInputElement);
                const n = parseInt(input.value, 10);
                if (!isNaN(n) && n >= 1 && n <= deck.length) {
                  setFlipped(false);
                  setImgError(false);
                  setIndex(n - 1);
                  input.value = '';
                }
              }}
              className="flex items-center gap-1.5"
            >
              <input
                name="qno"
                type="number"
                min={1}
                max={deck.length}
                placeholder={`Q#`}
                className="w-16 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm px-2 py-2.5 font-mono outline-none focus:border-indigo-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="submit"
                className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
              >
                Go
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
