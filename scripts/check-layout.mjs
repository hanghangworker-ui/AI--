// 布局宽度推算：验证「任务标题被压成竖排字」的成因与修复效果
//
// 结构：<aside class="fixed w-60"> + <main class="md:pl-60">
//   main 是块级元素、宽度 = 100% 视口（不含侧栏，侧栏 fixed 脱离文档流）
//   md:pl-60 是内边距 240px，max-w-[1200px] 限制的是 border-box 宽度
//
// 旧：<main class="md:pl-60 px-8 py-6 max-w-[1200px]">  ← max-w 与 pl-60 同层
//     内容盒 = min(视口, 1200) - 240(pl) - 64(px) = min(视口,1200) - 304
// 新：<main class="md:pl-60"><div class="px-8 max-w-[1200px]">  ← 分离
//     内容盒 = min(视口 - 240, 1200) - 64
const SIDEBAR = 240
const PAD = 64 // md:px-8 → 32*2
const CARD_PAD = 40 // p-5 → 20*2
const GAP = 20 // gap-5

const oldContent = (vp) => Math.min(vp, 1200) - SIDEBAR - PAD
const newContent = (vp) => Math.min(vp - SIDEBAR, 1200) - PAD

// 旧栅格：grid-cols-1 md:grid-cols-2 xl:grid-cols-4（硬编码断点，不看实际宽度）
const oldCols = (vp) => (vp >= 1280 ? 4 : vp >= 768 ? 2 : 1)
// 新栅格：repeat(auto-fit, minmax(min(100%, 240px), 1fr))（按实际宽度自适应）
const autoCols = (avail, min = 240) => {
  for (let n = 4; n >= 1; n--) if (n * min + (n - 1) * GAP <= avail) return n
  return 1
}

const vps = [1920, 1600, 1440, 1366, 1280, 1152, 1080, 960, 820]
console.log('视口  | 旧:可用 列数 列宽 卡片内容区 | 新:可用 列数 列宽 卡片内容区 | 判定')
console.log('-'.repeat(84))
let anyFail = false
for (const vp of vps) {
  const oa = oldContent(vp)
  const oc = oldCols(vp)
  const ow = (oa - (oc - 1) * GAP) / oc
  const oInner = ow - CARD_PAD // 卡片内可用
  const na = newContent(vp)
  const nc = autoCols(na)
  const nw = (na - (nc - 1) * GAP) / nc
  const nInner = nw - CARD_PAD
  // 新布局是堆叠式：状态按钮 20 + 间距 10，剩余全给标题 → 标题宽 = 内可用 - 30
  const titleW = nInner - 30
  const pass = titleW >= 120
  if (!pass) anyFail = true
  console.log(
    `${String(vp).padEnd(5)} | ${String(oa).padEnd(6)} ${oc}    ${ow.toFixed(0).padEnd(5)} ${oInner.toFixed(0).padEnd(11)} | ${String(na).padEnd(6)} ${nc}    ${nw.toFixed(0).padEnd(5)} ${nInner.toFixed(0).padEnd(11)} | 标题可用 ${titleW.toFixed(0)}px ${pass ? 'OK' : 'STILL BAD'}`
  )
}
console.log('-'.repeat(84))
console.log('旧布局在 1280px 视口：可用', oldContent(1280), 'px 被硬切 4 栏 → 每栏', ((oldContent(1280) - 3 * GAP) / 4).toFixed(0), 'px')
console.log('  卡片内可用', (oldContent(1280) - 3 * GAP) / 4 - CARD_PAD, 'px，而旧行布局固定开销约 148px')
console.log('  → 标题可用宽度 =', ((oldContent(1280) - 3 * GAP) / 4 - CARD_PAD - 148).toFixed(0), 'px ≈ 0 → 逐字竖排（截图现象）')
console.log('')
console.log('新布局同视口：可用', newContent(1280), 'px 自适应', autoCols(newContent(1280)), '栏 → 每栏', ((newContent(1280) - (autoCols(newContent(1280)) - 1) * GAP) / autoCols(newContent(1280))).toFixed(0), 'px')
console.log('')
console.log(anyFail ? '存在仍偏窄的场景' : 'PASS 所有测试视口下标题均有 >=120px 可读宽度')
