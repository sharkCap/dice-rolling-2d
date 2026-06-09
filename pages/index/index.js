const texts = {
  eyebrow: '\u4f20\u7edf\u9ab0\u76c5',
  title: '\u6447\u9ab0\u5b50',
  diceUnit: '\u9897\u9ab0\u5b50',
  open: '\u5f00',
  score: '\u70b9\u6570',
  sheetTitle: '\u9009\u62e9\u9ab0\u5b50\u6570',
  ready: '\u70b9\u51fb\u6447\u4e00\u6447\uff0c\u9ab0\u76c5\u4f1a\u5148\u76d6\u4f4f\u7ed3\u679c\u3002',
  shaking: '\u9ab0\u76c5\u6b63\u5728\u6447\u52a8...',
  covered: '\u7ed3\u679c\u5df2\u76d6\u4f4f\uff0c\u70b9\u51fb\u5f00\u76c5\u67e5\u770b\u3002',
  revealed: '\u5df2\u5f00\u76c5\uff0c\u53ef\u4ee5\u518d\u6447\u4e00\u5c40\u3002',
  shake: '\u6447\u4e00\u6447',
  shakingButton: '\u6447\u52a8\u4e2d...',
  reveal: '\u5f00\u76c5',
}

function createDice(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    value: Math.floor(Math.random() * 6) + 1,
  }))
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
    covered: false,
    canReveal: false,
    rolling: false,
    countPickerVisible: false,
    labelEyebrow: texts.eyebrow,
    labelTitle: texts.title,
    labelDiceUnit: texts.diceUnit,
    labelOpen: texts.open,
    labelScore: texts.score,
    labelSheetTitle: texts.sheetTitle,
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

  selectDiceCount(event) {
    if (this.data.rolling) return

    const diceCount = Number(event.currentTarget.dataset.count)
    const dice = createDice(diceCount)

    this.setData({
      diceCount,
      covered: false,
      canReveal: false,
      countPickerVisible: false,
      statusText: texts.ready,
      primaryText: texts.shake,
      diceCountText: createDiceCountText(diceCount),
    })
    this.updateDice(dice)
  },

  primaryAction() {
    if (this.data.canReveal) {
      this.revealDice()
      return
    }

    this.rollDice()
  },

  rollDice() {
    if (this.data.rolling) return

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
      canReveal: false,
      rolling: true,
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
      statusText: texts.covered,
      primaryText: texts.reveal,
    })

    wx.vibrateShort({
      type: 'medium',
    })
  },

  revealDice() {
    if (this.data.rolling || !this.data.canReveal) return

    this.setData({
      covered: false,
      canReveal: false,
      statusText: texts.revealed,
      primaryText: texts.shake,
    })
  },

  updateDice(dice) {
    this.setData({
      dice,
      total: sumDice(dice),
    })
  },
})
