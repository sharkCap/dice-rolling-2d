const texts = {
  eyebrow: '\u4f20\u7edf\u9ab0\u76c5',
  title: '\u6447\u9ab0\u5b50',
  diceUnit: '\u9897\u9ab0\u5b50',
  open: '\u5f00',
  score: '\u70b9\u6570',
  sheetTitle: '\u9009\u62e9\u9ab0\u5b50\u6570',
  autoReveal: '\u81ea\u52a8\u5f00\u76c5',
  autoRevealHint: '\u6447\u5b8c\u540e\u81ea\u52a8\u6253\u5f00',
  ready: '\u9ab0\u76c5\u5df2\u76d6\u597d\uff0c\u70b9\u51fb\u6447\u4e00\u6447\u5f00\u59cb\u3002',
  shaking: '\u9ab0\u76c5\u6b63\u5728\u6447\u52a8...',
  covered: '\u7ed3\u679c\u5df2\u76d6\u4f4f\uff0c\u70b9\u51fb\u5f00\u76c5\u67e5\u770b\u3002',
  revealed: '\u5df2\u5f00\u76c5\uff0c\u53ef\u4ee5\u518d\u6447\u4e00\u5c40\u3002',
  reCovered: '\u5df2\u76d6\u4e0a\uff0c\u4e0a\u6ed1\u6216\u70b9\u51fb\u9ab0\u76c5\u53ef\u518d\u6b21\u6253\u5f00\u3002',
  shake: '\u6447\u4e00\u6447',
  shakingButton: '\u6447\u52a8\u4e2d...',
}

const cupClosedTop = 96
const cupOpenTop = -312
const cupDragRatio = 1.45
const cupHiddenThreshold = -40
const autoRevealDelay = 180
const diceLayouts = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -72, y: 18 }, { x: 78, y: -18 }],
  3: [{ x: -100, y: 34 }, { x: 0, y: -42 }, { x: 100, y: 36 }],
  4: [{ x: -92, y: -50 }, { x: 92, y: -42 }, { x: -86, y: 68 }, { x: 86, y: 62 }],
  5: [{ x: -130, y: -58 }, { x: 0, y: -70 }, { x: 128, y: -50 }, { x: -72, y: 70 }, { x: 72, y: 66 }],
  6: [{ x: -136, y: -72 }, { x: 0, y: -76 }, { x: 136, y: -66 }, { x: -136, y: 66 }, { x: 0, y: 76 }, { x: 136, y: 62 }],
  7: [{ x: -142, y: -82 }, { x: -48, y: -84 }, { x: 48, y: -78 }, { x: 142, y: -70 }, { x: -92, y: 72 }, { x: 8, y: 82 }, { x: 108, y: 66 }],
  8: [{ x: -142, y: -84 }, { x: -48, y: -88 }, { x: 48, y: -82 }, { x: 142, y: -76 }, { x: -142, y: 72 }, { x: -48, y: 84 }, { x: 48, y: 78 }, { x: 142, y: 68 }],
}

function createDice(count) {
  const layout = diceLayouts[count]
  const small = count > 4

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    value: Math.floor(Math.random() * 6) + 1,
    left: layout[index].x + randomBetween(-18, 18) - (small ? 43 : 56),
    top: layout[index].y + randomBetween(-14, 14) - (small ? 43 : 56),
    rotate: randomBetween(-18, 18),
    sizeClass: small ? 'small' : 'normal',
  }))
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createCountOptions() {
  return Array.from({ length: 8 }, (_, index) => {
    const count = index + 1
    return {
      count,
      label: `${count} \u9897`,
    }
  })
}

function createDiceCountText(count) {
  return `\u9ab0\u5b50\u6570\u91cf\uff1a${count} \u9897`
}

function sumDice(dice) {
  return dice.reduce((total, item) => total + item.value, 0)
}

Page({
  data: {
    diceCount: 2,
    dice: createDice(2),
    total: 0,
    covered: true,
    resultHidden: true,
    canReveal: false,
    rolling: false,
    draggingCup: false,
    cupTop: cupClosedTop,
    autoReveal: false,
    countPickerVisible: false,
    labelEyebrow: texts.eyebrow,
    labelTitle: texts.title,
    labelDiceUnit: texts.diceUnit,
    labelOpen: texts.open,
    labelScore: texts.score,
    labelSheetTitle: texts.sheetTitle,
    labelAutoReveal: texts.autoReveal,
    labelAutoRevealHint: texts.autoRevealHint,
    statusText: texts.ready,
    primaryText: texts.shake,
    diceCountText: createDiceCountText(2),
    countOptions: createCountOptions(),
  },

  onLoad() {
    this.rollAudioIndex = 0
    this.rollAudios = [this.createRollAudio(), this.createRollAudio()]
    this.updateDice(createDice(this.data.diceCount))
  },

  onUnload() {
    this.clearAutoRevealTimer()

    if (this.rollAudios) {
      this.rollAudios.forEach((audio) => audio.destroy())
    }
  },

  createRollAudio() {
    const audio = wx.createInnerAudioContext()
    audio.src = '/assets/dice-roll.wav'
    audio.volume = 0.85
    audio.obeyMuteSwitch = false
    return audio
  },

  openCountPicker() {
    if (this.data.rolling) return
    this.setData({ countPickerVisible: true })
  },

  closeCountPicker() {
    this.setData({ countPickerVisible: false })
  },

  noop() {},

  toggleAutoReveal(event) {
    this.setData({
      autoReveal: event.detail.value,
    })
  },

  selectDiceCount(event) {
    if (this.data.rolling) return

    const diceCount = Number(event.currentTarget.dataset.count)
    const dice = createDice(diceCount)

    this.setData({
      diceCount,
      covered: false,
      resultHidden: false,
      canReveal: false,
      draggingCup: false,
      cupTop: cupOpenTop,
      countPickerVisible: false,
      statusText: texts.ready,
      primaryText: texts.shake,
      diceCountText: createDiceCountText(diceCount),
    })
    this.updateDice(dice)
  },

  primaryAction() {
    this.rollDice()
  },

  rollDice() {
    if (this.data.rolling) return

    this.clearAutoRevealTimer()

    let ticks = 0
    const maxTicks = 16

    if (this.rollAudios) {
      const audio = this.rollAudios[this.rollAudioIndex]
      this.rollAudioIndex = (this.rollAudioIndex + 1) % this.rollAudios.length
      audio.seek(0)
      audio.play()
    }

    this.setData({
      covered: true,
      resultHidden: true,
      canReveal: false,
      rolling: true,
      draggingCup: false,
      cupTop: cupClosedTop,
      countPickerVisible: false,
      statusText: texts.shaking,
      primaryText: texts.shakingButton,
    })

    const timer = setInterval(() => {
      const dice = createDice(this.data.diceCount)
      ticks += 1
      this.updateDice(dice)

      if (ticks >= maxTicks) {
        clearInterval(timer)
        this.finishRoll(dice)
      }
    }, 65)
  },

  finishRoll(dice) {
    this.updateDice(dice)
    this.setData({
      rolling: false,
      canReveal: true,
      resultHidden: true,
      cupTop: cupClosedTop,
      statusText: texts.covered,
      primaryText: texts.shake,
    })

    wx.vibrateShort({
      type: 'medium',
    })

    if (this.data.autoReveal) {
      this.autoRevealTimer = setTimeout(() => {
        this.revealDice()
      }, autoRevealDelay)
    }
  },

  revealDice() {
    if (this.data.rolling || !this.data.canReveal) return

    this.clearAutoRevealTimer()

    this.setData({
      covered: false,
      resultHidden: false,
      canReveal: false,
      draggingCup: false,
      cupTop: cupOpenTop,
      statusText: texts.revealed,
      primaryText: texts.shake,
    })
  },

  coverDice() {
    if (this.data.rolling) return

    this.clearAutoRevealTimer()

    this.setData({
      covered: true,
      resultHidden: true,
      canReveal: true,
      draggingCup: false,
      cupTop: cupClosedTop,
      statusText: texts.reCovered,
      primaryText: texts.shake,
    })
  },

  toggleCup() {
    if (this.data.rolling) return

    if (this.ignoreNextCupTap) {
      this.ignoreNextCupTap = false
      return
    }

    if (this.data.covered) {
      this.revealDice()
      return
    }

    this.coverDice()
  },

  onCupTouchStart(event) {
    if (this.data.rolling) return

    const touch = event.touches[0]
    this.cupTouchStartY = touch.clientY
    this.cupTouchStartTop = this.data.cupTop
    this.cupMoved = false
    this.setData({ draggingCup: true })
  },

  onCupTouchMove(event) {
    if (this.data.rolling || this.cupTouchStartY === undefined) return

    const touch = event.touches[0]
    const delta = (touch.clientY - this.cupTouchStartY) * cupDragRatio
    const nextTop = Math.max(cupOpenTop, Math.min(cupClosedTop, this.cupTouchStartTop + delta))

    if (Math.abs(delta) > 8) {
      this.cupMoved = true
    }

    this.setData({
      covered: nextTop > cupHiddenThreshold,
      resultHidden: nextTop > cupHiddenThreshold,
      canReveal: true,
      cupTop: Math.round(nextTop),
    })
  },

  onCupTouchEnd() {
    if (this.data.rolling || this.cupTouchStartY === undefined) return

    this.ignoreNextCupTap = this.cupMoved
    this.cupTouchStartY = undefined
    this.cupTouchStartTop = undefined
    this.setData({ draggingCup: false })
  },

  updateDice(dice) {
    this.setData({
      dice,
      total: sumDice(dice),
    })
  },

  clearAutoRevealTimer() {
    if (this.autoRevealTimer) {
      clearTimeout(this.autoRevealTimer)
      this.autoRevealTimer = null
    }
  },
})
