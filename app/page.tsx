'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  RotateCw,
  Play,
  Undo2,
  Trash2,
  Volume2,
  VolumeX,
  Code2,
  Sparkles,
  MoveUpRight,
} from 'lucide-react';
import {
  SLOTS,
  initialBall,
  step,
  STEP,
  type Piece,
  type Kind,
  type Ball,
} from '@/lib/game/physics';
import { LEVELS, canPlace, bonusAchieved } from '@/lib/game/levels';
import type { SceneHandle } from '@/lib/game/scene';
const TOOLS: {
  kind: Kind;
  title: string;
  description: string;
  glyph: string;
}[] = [
  { kind: 'ramp', title: '斜坡', description: '让小球滑向另一边', glyph: '╱' },
  {
    kind: 'bumper',
    title: '挡板',
    description: '碰一下，换个方向',
    glyph: '━',
  },
  {
    kind: 'spring',
    title: '弹力器',
    description: '给小球一点惊喜',
    glyph: '✳',
  },
];
export default function Home() {
  const mount = useRef<HTMLDivElement>(null),
    scene = useRef<SceneHandle | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]),
    [tool, setTool] = useState<Kind>('ramp'),
    [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<'editing' | 'running' | 'won' | 'lost'>(
      'editing',
    ),
    [attempts, setAttempts] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [sound, setSound] = useState(false),
    [stats, setStats] = useState({ time: 0, hits: 0 });
  const [levelIndex, setLevelIndex] = useState(0),
    [undoCount, setUndoCount] = useState(0),
    [hint, setHint] = useState(false),
    [cleared, setCleared] = useState<Record<string, number>>({});
  const history = useRef<Piece[][]>([]);
  const level = LEVELS[levelIndex];
  const current = useRef({ pieces, tool, phase, selected, sound, level });
  current.current = { pieces, tool, phase, selected, sound, level };
  function edit(next: Piece[]) {
    history.current.push(current.current.pieces.map((p) => ({ ...p })));
    setUndoCount(history.current.length);
    current.current.pieces = next;
    setPieces(next);
  }
  function undo() {
    if (current.current.phase === 'running') return;
    const previous = history.current.pop();
    if (!previous) return;
    reset();
    current.current.pieces = previous;
    setPieces(previous);
    setSelected(null);
    setUndoCount(history.current.length);
  }
  function switchLevel(index: number) {
    reset();
    scene.current?.setBoard(LEVELS[index]);
    setLevelIndex(index);
    current.current.level = LEVELS[index];
    current.current.pieces = [];
    setPieces([]);
    setSelected(null);
    setTool(LEVELS[index].tools[0]);
    setAttempts(0);
    setHint(false);
    history.current = [];
    setUndoCount(0);
  }

  const ball = useRef<Ball | null>(null),
    audio = useRef<AudioContext | null>(null);
  function tone(frequency: number) {
    if (!current.current.sound || !audio.current) return;
    const a = audio.current;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = 'sine';
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.055, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.2);
  }
  function place(slot: number) {
    const c = current.current;
    if (c.phase === 'running' || c.level.fixed.some((p) => p.slot === slot))
      return;
    if (
      !c.pieces.some((p) => p.slot === slot) &&
      !canPlace(c.level, c.pieces, slot, c.tool)
    )
      return;
    reset();
    setSelected(slot);
    if (!c.pieces.some((p) => p.slot === slot))
      edit([
        ...c.pieces,
        { slot, kind: c.tool, angle: c.tool === 'ramp' ? -30 : 0 },
      ]);
  }

  useEffect(() => {
    let disposed = false,
      frame = 0,
      cleanup: (() => void) | undefined;
    import('@/lib/game/scene')
      .then(({ createScene }) => {
        if (disposed || !mount.current) return;
        try {
          const view = createScene(mount.current, place);
          scene.current = view;
          view.setBoard(current.current.level);
          cleanup = view.dispose;
          setReady(true);
          let last = 0,
            accumulator = 0,
            elapsed = 0;
          const tick = (now: number) => {
            frame = requestAnimationFrame(tick);
            const delta = last ? Math.min((now - last) / 1000, 0.08) : 0;
            last = now;
            elapsed += delta;
            if (document.hidden) {
              accumulator = 0;
              return;
            }
            if (ball.current?.status === 'running') {
              accumulator += delta;
              while (accumulator >= STEP && ball.current.status === 'running') {
                const before = ball.current;
                ball.current = step(
                  before,
                  current.current.pieces,
                  STEP,
                  current.current.level,
                );
                accumulator -= STEP;
                if (ball.current.hits > before.hits)
                  tone(360 + ball.current.hits * 37);
              }
              setStats({ time: ball.current.time, hits: ball.current.hits });
              if (ball.current.status !== 'running') {
                setPhase(ball.current.status);
                if (ball.current.status === 'won') {
                  const c = current.current;
                  const score = bonusAchieved(
                    c.level,
                    c.pieces,
                    ball.current.collected,
                  )
                    ? 2
                    : 1;
                  setCleared((old) => ({
                    ...old,
                    [c.level.id]: Math.max(old[c.level.id] ?? 0, score),
                  }));
                }
                tone(ball.current.status === 'won' ? 880 : 160);
                accumulator = 0;
              }
            } else accumulator = 0;
            view.render(ball.current, elapsed);
          };
          frame = requestAnimationFrame(tick);
        } catch {
          setError(
            '三维场景未能启动。请开启浏览器硬件加速后刷新，或使用支持 WebGL 的浏览器。',
          );
        }
      })
      .catch(() => setError('场景加载失败，请刷新后再试。'));
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.setPieces(pieces, selected);
  }, [pieces, selected, ready]);
  function reset() {
    scene.current?.retainTrail();
    ball.current = null;
    setPhase('editing');
    setStats({ time: 0, hits: 0 });
  }
  function launch() {
    if (!ready || phase === 'running') return;
    if (sound) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    }
    scene.current?.retainTrail();
    ball.current = initialBall(level);
    setAttempts((n) => n + 1);
    setPhase('running');
    setSelected(null);
    tone(520);
  }
  function rotate(delta = 15) {
    if (selected === null || phase === 'running') return;
    reset();
    edit(
      current.current.pieces.map((p) =>
        p.slot === selected
          ? {
              ...p,
              angle:
                p.angle + delta > 75
                  ? -75
                  : p.angle + delta < -75
                    ? 75
                    : p.angle + delta,
            }
          : p,
      ),
    );
  }
  function remove() {
    if (selected === null || phase === 'running') return;
    reset();
    edit(current.current.pieces.filter((x) => x.slot !== selected));
    setSelected(null);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('button,a,input')) return;
      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        launch();
      }
      if (e.key.toLowerCase() === 'r') rotate();
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const picked = pieces.find((p) => p.slot === selected);
  return (
    <main className="workshop">
      <header className="topbar">
        <a className="brand" href="/" aria-label="弹珠工坊首页">
          <span className="brand-dot">m.</span>
          <span>
            marble<span className="brand-light">lab</span>
            <small>弹珠工坊</small>
          </span>
        </a>
        <div className="edition">
          <span /> PLAYFUL EXPERIMENT № 001
        </div>
        <a
          className="source"
          href="https://github.com/yuki-uix/marble-playground"
          target="_blank"
          rel="noreferrer"
        >
          <Code2 size={18} />
          <span>源码</span>
          <MoveUpRight size={15} />
        </a>
      </header>
      <nav className="level-nav" aria-label="选择关卡">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            aria-current={i === levelIndex ? 'step' : undefined}
            disabled={phase === 'running'}
            className={i === levelIndex ? 'chosen' : ''}
            onClick={() => switchLevel(i)}
          >
            {l.name}
            <span>
              {cleared[l.id] === 2 ? '★★' : cleared[l.id] === 1 ? '★' : ''}
            </span>
          </button>
        ))}
      </nav>
      <section className="workspace">
        <aside className="toolbox">
          <div className="eyebrow">BUILD SOMETHING PLAYFUL</div>
          <h1>
            给小球，
            <br />
            一点奇思妙想<span>。</span>
          </h1>
          <p className="intro">{level.description}</p>
          <div className="challenge">
            {levelIndex === 3 ? (
              '自由试验，不限解法'
            ) : (
              <>
                进阶挑战：
                {level.star ? '顺路收集空中的星星' : '只用一个零件通关'}{' '}
                {cleared[level.id] === 2 ? '✓' : ''}
              </>
            )}
          </div>
          <div className="section-label">
            <span>你的零件盒</span>
            <span>
              {pieces.length} / {level.limit} PIECES
            </span>
          </div>
          <div className="tools">
            {TOOLS.map((t, i) => (
              <button
                key={t.kind}
                className={`tool ${tool === t.kind ? 'active' : ''} ${t.kind}`}
                aria-pressed={tool === t.kind}
                onClick={() => setTool(t.kind)}
                disabled={phase === 'running' || !level.tools.includes(t.kind)}
              >
                <span className="tool-glyph">{t.glyph}</span>
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.description}</small>
                </span>
                <span className="tool-number">0{i + 1}</span>
              </button>
            ))}
          </div>
          <div className="selection">
            <span>
              {picked
                ? `已选：${TOOLS.find((t) => t.kind === picked.kind)?.title} · ${picked.angle}°`
                : '选一个零件，再点桌面上的圆点'}
            </span>
            <div>
              <button
                onClick={() => rotate(-15)}
                disabled={
                  !picked || picked.kind === 'spring' || phase === 'running'
                }
                title="反向旋转 15°"
              >
                −15°
              </button>
              <button
                onClick={() => rotate(15)}
                disabled={
                  !picked || picked.kind === 'spring' || phase === 'running'
                }
                title="旋转 15°（R）"
              >
                <RotateCw size={17} />
                +15°
              </button>
              <button
                onClick={remove}
                disabled={!picked || phase === 'running'}
                title="移除（Delete）"
              >
                <Trash2 size={17} />
                移除
              </button>
            </div>
          </div>
          <div className="edit-actions">
            <button onClick={undo} disabled={!undoCount || phase === 'running'}>
              <Undo2 size={15} />
              撤销一步
            </button>
            <button onClick={() => setHint((v) => !v)}>
              {hint ? '收起提示' : '给点提示'}
            </button>
          </div>
          {hint && <p className="hint">{level.hint}</p>}
          {levelIndex === 3 && (
            <button
              className="example-button"
              disabled={phase === 'running'}
              onClick={() => {
                reset();
                edit(level.solution.map((p) => ({ ...p })));
                setSelected(null);
              }}
            >
              试试一个搭法 <MoveUpRight size={15} />
            </button>
          )}
          <div className="little-note">
            <Sparkles size={18} />
            <p>
              没有标准搭法。
              <br />
              试错，也是玩的一部分。
            </p>
          </div>
        </aside>
        <section className="playarea" aria-label="三维弹珠桌面">
          <div className="board-header">
            <div>
              <span className="live-dot" /> THE LITTLE DROP{' '}
              <span className="level-tag">{level.name}</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setSound((v) => !v)}
              aria-label={sound ? '关闭声音' : '开启声音'}
            >
              {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
          <div
            className="canvas-wrap"
            ref={mount}
            aria-label="点击网格放置零件"
          >
            <div className="board-label start-label">
              START <ArrowDown size={14} />
            </div>
            <div className="board-label goal-label">落进小窝，就算成功 ✦</div>
            {!ready && !error && (
              <div className="scene-message">正在打开零件盒…</div>
            )}
            {error && (
              <div className="scene-message error" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="result" aria-live="polite">
            {phase === 'won' ? (
              <>
                <span className="result-symbol">✦</span>
                <strong>漂亮！小球到家了。</strong>
                <span>
                  {bonusAchieved(
                    level,
                    pieces,
                    ball.current?.collected ?? false,
                  )
                    ? '进阶挑战也完成了！'
                    : '再挑战一下更巧妙的解法？'}
                </span>
                {levelIndex < 2 && (
                  <button
                    className="next-level"
                    onClick={() => switchLevel(levelIndex + 1)}
                  >
                    下一关 →
                  </button>
                )}
                {levelIndex === 2 && (
                  <button className="next-level" onClick={() => switchLevel(3)}>
                    去自由搭建 →
                  </button>
                )}
              </>
            ) : phase === 'lost' ? (
              <>
                <strong>差一点点，再调一调。</strong>
                <span>试试旋转斜坡，或者加一个挡板。</span>
              </>
            ) : (
              <span>
                {phase === 'running'
                  ? '看，小球出发了……'
                  : '选零件 → 点圆点放置 → 旋转调整 → 放球'}
              </span>
            )}
          </div>
          <footer className="board-controls">
            <div className="meters">
              <div>
                <span>尝试</span>
                <strong>{String(attempts).padStart(2, '0')}</strong>
              </div>
              <div>
                <span>用时</span>
                <strong>
                  {stats.time.toFixed(1)}
                  <small>s</small>
                </strong>
              </div>
              <div>
                <span>碰撞</span>
                <strong>{String(stats.hits).padStart(2, '0')}</strong>
              </div>
            </div>
            <div className="actions">
              <button className="reset" onClick={reset} title="停止并保留布局">
                <Undo2 size={18} />
                <span>重试</span>
              </button>
              <button
                className="launch"
                onClick={launch}
                disabled={!ready || phase === 'running'}
              >
                <Play size={18} fill="currentColor" />
                {phase === 'running' ? '小球旅行中' : '放一颗小球'}
                <kbd>SPACE</kbd>
              </button>
            </div>
          </footer>
        </section>
      </section>
      <footer className="bottom">
        <span>一点重力。无限可能。</span>
        <div>
          <button
            onClick={() => {
              reset();
              edit([]);
              setSelected(null);
            }}
            disabled={phase === 'running'}
          >
            清空桌面
          </button>
          <span className="divider" />
          <span>
            {pieces.length} / {level.limit} 个零件 · 虚线为上次轨迹
          </span>
        </div>
      </footer>
      <details className="accessible-grid">
        <summary>键盘放置零件 / 操作说明</summary>
        <p>
          选择零件后，使用下面的槽位按钮放置或选中。R 旋转，Delete
          移除，空格放球，Ctrl / ⌘ + Z 撤销。试玩中可按“重试”停止。
        </p>
        <div>
          {SLOTS.map((_, i) => (
            <button
              key={i}
              disabled={
                phase === 'running' || level.fixed.some((p) => p.slot === i)
              }
              onClick={() => place(i)}
            >
              第{Math.floor(i / 4) + 1}行 第{(i % 4) + 1}列
              {pieces.some((p) => p.slot === i) ? ' · 已放置' : ''}
            </button>
          ))}
        </div>
      </details>
    </main>
  );
}
