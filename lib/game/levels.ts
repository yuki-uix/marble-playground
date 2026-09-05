import { DEFAULT_BOARD, type Board, type Kind, type Piece } from './physics.ts';
export type Level = Board & {
  id: string;
  name: string;
  description: string;
  hint: string;
  tools: Kind[];
  limit: number;
  solution: Piece[];
};
export const LEVELS: Level[] = [
  {
    ...DEFAULT_BOARD,
    id: 'turn',
    name: '01 · 转个弯',
    description: '起点在左边，小窝在中间。让斜坡帮你转个弯。',
    hint: '第一行左侧放一个斜坡，试着让右端低一点。',
    target: { x: 0, y: 0.65, width: 1.5 },
    tools: ['ramp'],
    limit: 3,
    solution: [{ slot: 0, kind: 'ramp', angle: -60 }],
  },
  {
    ...DEFAULT_BOARD,
    id: 'bounce',
    name: '02 · 绕过去',
    description: '灰色挡板不能移动。借一次反弹，绕过它，落进右侧小窝。',
    hint: '高处的斜挡板能让球弹向右边。小幅旋转，比较两次轨迹。',
    target: { x: 1, y: 4, width: 1.5 },
    fixed: [{ slot: 4, kind: 'ramp', angle: 0 }],
    tools: ['bumper'],
    limit: 3,
    solution: [{ slot: 0, kind: 'bumper', angle: -30 }],
  },
  {
    ...DEFAULT_BOARD,
    id: 'rise',
    name: '03 · 往上走',
    description: '小窝比起点还高。给弹珠一点弹力，让它回来时落进小窝。',
    hint: '把弹力器放在起点正下方，观察弹珠向上反弹的高度。',
    start: { x: -3, y: 8.8 },
    target: { x: -3, y: 9.55, width: 1.5 },
    tools: ['spring', 'ramp'],
    limit: 3,
    star: { x: -3, y: 9.9 },
    solution: [{ slot: 0, kind: 'spring', angle: 0 }],
  },
  {
    ...DEFAULT_BOARD,
    id: 'free',
    name: '自由搭建',
    description: '所有零件都给你。试试自己的路线。',
    hint: '可以先载入示例，再拆开改一改。',
    tools: ['ramp', 'bumper', 'spring'],
    limit: 16,
    solution: [
      { slot: 4, kind: 'ramp', angle: -75 },
      { slot: 9, kind: 'ramp', angle: -15 },
      { slot: 10, kind: 'ramp', angle: -45 },
    ],
  },
];
export const bonusAchieved = (
  level: Level,
  pieces: Piece[],
  collected: boolean,
) => (level.star ? collected : pieces.length <= 1);
export const canPlace = (
  level: Level,
  pieces: Piece[],
  slot: number,
  kind: Kind,
) =>
  slot >= 0 &&
  slot < 16 &&
  !level.fixed.some((p) => p.slot === slot) &&
  level.tools.includes(kind) &&
  pieces.length < level.limit &&
  !pieces.some((p) => p.slot === slot);
