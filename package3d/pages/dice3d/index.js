const CUP_OPEN_Y = 0
const CUP_CLOSED_Y = 416
const CUP_REVEAL_Y = 280
const CUP_HIDE_Y = 300
const AUTO_REVEAL_DELAY = 800
const ROLL_TICK_MS = 70
const ROLL_TICKS = 12

const texts = {
  ready: '骰盅已就位',
  rolling: '正在摇动骰子...',
  covered: '结果已生成，拖动骰盅查看',
  revealed: '本局结果已揭晓',
  reCovered: '骰盅已盖上',
}

const layouts = {
  1: [{ slot: 1 }],
  2: [{ slot: 1 }, { slot: 2 }],
  3: [{ slot: 1 }, { slot: 2 }, { slot: 3 }],
  4: [{ slot: 1 }, { slot: 2 }, { slot: 3 }, { slot: 4 }],
  5: [{ slot: 1 }, { slot: 2 }, { slot: 3 }, { slot: 4 }, { slot: 5 }],
  6: [{ slot: 1 }, { slot: 2 }, { slot: 3 }, { slot: 4 }, { slot: 5 }, { slot: 6 }],
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createDice(count) {
  return layouts[count].map((layout, index) => {
    const value = randomInt(1, 6)
    const angle = randomInt(1, 8)

    return {
      id: index,
      value,
      slot: layout.slot,
      sizeClass: count > 4 ? 'small' : 'normal',
      src: '/package3d/assets/dice/touzi' + value + '-' + angle + '.png',
    }
  })
}

function sumDice(dice) {
  return dice.reduce((sum, item) => sum + item.value, 0)
}

Page({
  data: {
    diceCount: 5,
    dice: createDice(5),
    total: 0,
    covered: true,
    resultHidden: true,
    canReveal: true,
    rolling: false,
    draggingCup: false,
    cupY: CUP_CLOSED_Y,
    autoReveal: true,
    settingsVisible: false,
    statusText: texts.ready,
  },

  onLoad() {
    const savedCount = Number(wx.getStorageSync('dice3dCount'))
    const savedAutoReveal = wx.getStorageSync('dice3dAutoReveal')
    const diceCount = savedCount >= 1 && savedCount <= 6 ? savedCount : this.data.diceCount
    const autoReveal = typeof savedAutoReveal === 'boolean' ? savedAutoReveal : this.data.autoReveal
    const dice = createDice(diceCount)
    this.currentCupY = CUP_CLOSED_Y

    this.setData({
      diceCount,
      autoReveal,
      dice,
      total: sumDice(dice),
    })

    this.rollAudioIndex = 0
    this.rollAudios = [this.createRollAudio(), this.createRollAudio()]
  },

  onUnload() {
    this.clearRollTimer()
    this.clearRevealTimer()

    if (this.rollAudios) {
      this.rollAudios.forEach((audio) => audio.destroy())
    }
  },

  createRollAudio() {
    const audio = wx.createInnerAudioContext()
    audio.src = '/package3d/assets/roll.mp3'
    audio.volume = 0.8
    audio.obeyMuteSwitch = false
    return audio
  },

  backTo2d() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/index/index' }),
    })
  },

  rollDice() {
    if (this.data.rolling) return

    this.clearRollTimer()
    this.clearRevealTimer()
    this.playRollAudio()

    this.currentCupY = CUP_CLOSED_Y
    this.setData({
      rolling: true,
      covered: true,
      resultHidden: true,
      canReveal: true,
      draggingCup: false,
      cupY: CUP_CLOSED_Y,
      settingsVisible: false,
      statusText: texts.rolling,
    })

    let ticks = 0
    this.rollTimer = setInterval(() => {
      ticks += 1
      const dice = createDice(this.data.diceCount)
      this.updateDice(dice)

      if (ticks >= ROLL_TICKS) {
        this.clearRollTimer()
        this.finishRoll(dice)
      }
    }, ROLL_TICK_MS)
  },

  finishRoll(dice) {
    this.updateDice(dice)
    this.currentCupY = CUP_CLOSED_Y
    this.setData({
      rolling: false,
      covered: true,
      resultHidden: true,
      canReveal: true,
      cupY: CUP_CLOSED_Y,
      statusText: texts.covered,
    })

    wx.vibrateShort({ type: 'medium' })

    if (this.data.autoReveal) {
      this.revealTimer = setTimeout(() => this.revealDice(), AUTO_REVEAL_DELAY)
    }
  },

  playRollAudio() {
    if (!this.rollAudios) return

    const audio = this.rollAudios[this.rollAudioIndex]
    this.rollAudioIndex = (this.rollAudioIndex + 1) % this.rollAudios.length
    audio.seek(0)
    audio.play()
  },

  openSettings() {
    if (this.data.rolling) return
    this.setData({ settingsVisible: true })
  },

  closeSettings() {
    this.setData({ settingsVisible: false })
  },

  noop() {},

  toggleCup() {
    if (this.data.rolling) return

    if (this.data.covered) {
      this.revealDice()
    } else {
      this.coverDice()
    }
  },

  revealDice() {
    if (this.data.rolling) return

    this.clearRevealTimer()
    this.draggingCup = false
    this.currentCupY = CUP_OPEN_Y
    this.setData({
      covered: false,
      resultHidden: false,
      canReveal: true,
      draggingCup: false,
      cupY: CUP_OPEN_Y,
      statusText: texts.revealed,
    })
  },

  coverDice() {
    if (this.data.rolling) return

    this.clearRevealTimer()
    this.draggingCup = false
    this.currentCupY = CUP_CLOSED_Y
    this.setData({
      covered: true,
      resultHidden: true,
      canReveal: true,
      draggingCup: false,
      cupY: CUP_CLOSED_Y,
      statusText: texts.reCovered,
    })
  },

  onCupChange(event) {
    if (!event.detail || event.detail.y === undefined) return

    const rawY = Number(event.detail.y)
    if (!Number.isFinite(rawY)) return

    const cupY = Math.max(CUP_OPEN_Y, Math.min(CUP_CLOSED_Y, Math.round(rawY)))
    this.currentCupY = cupY

    const source = event.detail.source
    const userMotion = ['touch', 'touch-out-of-bounds', 'out-of-bounds', 'friction'].includes(source)
    const shouldHide = cupY >= CUP_HIDE_Y
    const shouldReveal = cupY <= CUP_REVEAL_Y

    if (this.data.rolling || !userMotion) return
    if (shouldHide && (!this.data.covered || !this.data.resultHidden)) {
      this.setData({
        covered: true,
        resultHidden: true,
        statusText: texts.reCovered,
      })
    } else if (shouldReveal && (this.data.covered || this.data.resultHidden)) {
      this.setData({
        covered: false,
        resultHidden: false,
        statusText: texts.revealed,
      })
    }
  },

  onCupTouchStart() {
    if (this.data.rolling) return
    this.clearRevealTimer()
    this.draggingCup = true
  },

  onCupTouchEnd() {
    if (this.data.rolling) return
    this.draggingCup = false
  },

  changeDiceCount(event) {
    if (this.data.rolling) return

    const delta = Number(event.currentTarget.dataset.delta)
    const diceCount = Math.max(1, Math.min(6, this.data.diceCount + delta))
    if (diceCount === this.data.diceCount) return

    const dice = createDice(diceCount)
    this.currentCupY = CUP_OPEN_Y
    wx.setStorageSync('dice3dCount', diceCount)

    this.setData({
      diceCount,
      dice,
      total: sumDice(dice),
      covered: false,
      resultHidden: false,
      canReveal: true,
      cupY: CUP_OPEN_Y,
      statusText: texts.revealed,
    })
  },

  toggleAutoReveal(event) {
    const autoReveal = event.detail.value
    wx.setStorageSync('dice3dAutoReveal', autoReveal)
    this.setData({ autoReveal })
  },

  updateDice(dice) {
    this.setData({
      dice,
      total: sumDice(dice),
    })
  },

  clearRollTimer() {
    if (this.rollTimer) {
      clearInterval(this.rollTimer)
      this.rollTimer = null
    }
  },

  clearRevealTimer() {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer)
      this.revealTimer = null
    }
  },
})






















