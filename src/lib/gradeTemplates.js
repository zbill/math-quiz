// 年级-学期 预置出题规则模板（依据人教版小学数学数概念难度）
// 采用整数口算即可完成的题目，控制数字范围与运算类型

export const GRADES = [1, 2, 3, 4, 5, 6];
export const SEMESTERS = [
  { value: 1, label: '上学期' },
  { value: 2, label: '下学期' },
];

// 单个运算维度，用于「分题型解锁」与统计归因
export const OPS = {
  add: { key: 'add', symbol: '+', name: '加法' },
  sub: { key: 'sub', symbol: '−', name: '减法' },
  mul: { key: 'mul', symbol: '×', name: '乘法' },
  div: { key: 'div', symbol: '÷', name: '除法' },
};

// 每个 grade+semester 支持的运算及其范围
// spec: { type, aMin,aMax, bMin,bMax }  (减法: a>=b 通过 b+d 生成; 除法通过 除数×商生成)
const RULES = {
  1: {
    1: [
      { type: 'add', aMin: 1, aMax: 5, bMin: 1, bMax: 5 }, // 5以内
      { type: 'sub', aMin: 1, aMax: 5, bMin: 1, bMax: 5 },
    ],
    2: [
      { type: 'add', aMin: 1, aMax: 9, bMin: 1, bMax: 9 }, // 10以内
      { type: 'sub', aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
      { type: 'add', aMin: 10, aMax: 18, bMin: 1, bMax: 9, noCarry: true }, // 20以内不进位
      { type: 'sub', aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
    ],
  },
  2: {
    1: [
      { type: 'add', aMin: 10, aMax: 18, bMin: 1, bMax: 9 },
      { type: 'sub', aMin: 11, aMax: 20, bMin: 1, bMax: 9 },
      { type: 'add', aMin: 1, aMax: 50, bMin: 1, bMax: 50, multiples10: true }, // 整十数加减
      { type: 'sub', aMin: 1, aMax: 50, bMin: 1, bMax: 50, multiples10: true },
    ],
    2: [
      { type: 'mul', aMin: 1, aMax: 9, bMin: 1, bMax: 9 }, // 表内乘法
      { type: 'div', aMin: 1, aMax: 9, bMin: 1, bMax: 9 }, // 表内除法(用口诀)
      { type: 'add', aMin: 10, aMax: 90, bMin: 10, bMax: 90, multiples10: true },
      { type: 'sub', aMin: 10, aMax: 90, bMin: 10, bMax: 90, multiples10: true },
    ],
  },
  3: {
    1: [
      { type: 'mul', aMin: 10, aMax: 90, bMin: 2, bMax: 9 }, // 两位数×一位数
      { type: 'div', aMin: 2, aMax: 9, bMin: 10, bMax: 90, divisorFirst: true }, // 整十/显著 除以一位数
      { type: 'add', aMin: 100, aMax: 900, bMin: 100, bMax: 900, multiples100: true },
      { type: 'sub', aMin: 100, aMax: 900, bMin: 100, bMax: 900, multiples100: true },
    ],
    2: [
      { type: 'mul', aMin: 10, aMax: 90, bMin: 2, bMax: 9 },
      { type: 'div', aMin: 2, aMax: 9, bMin: 10, bMax: 80, divisorFirst: true },
      { type: 'add', aMin: 100, aMax: 900, bMin: 100, bMax: 900 }, // 三位数加减
      { type: 'sub', aMin: 200, aMax: 900, bMin: 100, bMax: 500 },
    ],
  },
  4: {
    1: [
      { type: 'mul', aMin: 100, aMax: 900, bMin: 2, bMax: 9 }, // 三位数×一位数
      { type: 'div', aMin: 2, aMax: 9, bMin: 100, bMax: 900, divisorFirst: true },
      { type: 'mul', aMin: 20, aMax: 90, bMin: 20, bMax: 90, multiples10: true }, // 几十×几十
      { type: 'sub', aMin: 100, aMax: 900, bMin: 100, bMax: 500 },
    ],
    2: [
      { type: 'mul', aMin: 10, aMax: 90, bMin: 11, bMax: 40 }, // 两位数×两位数(口算)
      { type: 'div', aMin: 2, aMax: 9, bMin: 20, bMax: 200, divisorFirst: true },
      { type: 'add', aMin: 100, aMax: 900, bMin: 100, bMax: 900 },
      { type: 'sub', aMin: 200, aMax: 999, bMin: 100, bMax: 700 },
    ],
  },
  5: {
    1: [
      { type: 'mul', aMin: 10, aMax: 90, bMin: 11, bMax: 40 }, // 小数乘法(一位小数×整数)
      { type: 'div', aMin: 2, aMax: 9, bMin: 10, bMax: 90, divisorFirst: true },
      { type: 'mul', aMin: 1, aMax: 9, bMin: 10, bMax: 90 },
    ],
    2: [
      { type: 'add', aMin: 10, aMax: 99, bMin: 10, bMax: 99 },
      { type: 'sub', aMin: 20, aMax: 99, bMin: 10, bMax: 60 },
      { type: 'mul', aMin: 1, aMax: 9, bMin: 1, bMax: 9 },
    ],
  },
  6: {
    1: [
      { type: 'mul', aMin: 10, aMax: 90, bMin: 10, bMax: 40 },
      { type: 'div', aMin: 2, aMax: 9, bMin: 40, bMax: 360, divisorFirst: true },
      { type: 'add', aMin: 100, aMax: 900, bMin: 100, bMax: 900 },
    ],
    2: [
      { type: 'mul', aMin: 10, aMax: 99, bMin: 10, bMax: 40 },
      { type: 'div', aMin: 2, aMax: 9, bMin: 50, bMax: 450, divisorFirst: true },
      { type: 'sub', aMin: 100, aMax: 999, bMin: 100, bMax: 600 },
    ],
  },
};

// 获取某年级学期的规则（保证珍平）
export function getRules(grade, semester) {
  return (RULES[grade] && RULES[grade][semester]) || RULES[1]?.[1] || [];
}

export const GRADE_OPTIONS = GRADES.map((g) => ({
  value: g,
  label: `${g}年级`,
}));