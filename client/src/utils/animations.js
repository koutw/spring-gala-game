/**
 * GSAP Animation Utilities
 * 提供統一的動畫效果和 Vue 指令
 */
import gsap from 'gsap'

// 預設動畫配置
const defaults = {
  duration: 0.5,
  ease: 'power2.out'
}

/**
 * 動畫效果集合
 */
export const animations = {
  // 淡入動畫
  fadeIn: (element, options = {}) => {
    return gsap.fromTo(element,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration || defaults.duration,
        ease: options.ease || defaults.ease,
        delay: options.delay || 0,
        onComplete: options.onComplete
      }
    )
  },

  // 向上滑入
  slideUp: (element, options = {}) => {
    return gsap.fromTo(element,
      { opacity: 0, y: 100 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration || 0.6,
        ease: options.ease || 'power3.out',
        delay: options.delay || 0,
        onComplete: options.onComplete
      }
    )
  },

  // 縮放進入
  scaleIn: (element, options = {}) => {
    return gsap.fromTo(element,
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: options.duration || 0.4,
        ease: options.ease || 'back.out(1.7)',
        delay: options.delay || 0,
        onComplete: options.onComplete
      }
    )
  },

  // 抖動效果
  shake: (element, options = {}) => {
    return gsap.to(element, {
      x: [-5, 5, -5, 5, 0],
      duration: options.duration || 0.4,
      ease: 'power2.inOut',
      onComplete: options.onComplete
    })
  },

  // 彈跳效果
  bounce: (element, options = {}) => {
    return gsap.to(element, {
      y: -10,
      duration: options.duration || 0.5,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: options.repeat !== undefined ? options.repeat : -1,
      onComplete: options.onComplete
    })
  },

  // 發光效果（使用 box-shadow）
  glow: (element, options = {}) => {
    return gsap.to(element, {
      boxShadow: '0 0 40px rgba(108, 92, 231, 0.8)',
      duration: options.duration || 1,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: options.repeat !== undefined ? options.repeat : -1
    })
  },

  // 脈衝效果
  pulse: (element, options = {}) => {
    return gsap.to(element, {
      scale: 1.05,
      duration: options.duration || 0.5,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: options.repeat !== undefined ? options.repeat : -1
    })
  },

  // 分數增加動畫
  scoreUp: (element, options = {}) => {
    const tl = gsap.timeline()
    tl.to(element, {
      scale: 1.2,
      duration: 0.1,
      ease: 'power2.out'
    })
    tl.to(element, {
      scale: 1,
      duration: 0.2,
      ease: 'back.out(1.7)'
    })
    return tl
  },

  // 倒數計時緊張效果
  countdown: (element, remaining) => {
    if (remaining <= 5) {
      return gsap.to(element, {
        scale: 1.1,
        color: '#E17055',
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1
      })
    }
    return null
  },

  // 答案選中效果
  selectOption: (element, options = {}) => {
    return gsap.to(element, {
      x: 5,
      scale: 1.02,
      duration: 0.2,
      ease: 'power2.out'
    })
  },

  // 正確答案效果
  correctAnswer: (element, options = {}) => {
    const tl = gsap.timeline()
    tl.to(element, {
      backgroundColor: 'rgba(0, 184, 148, 0.3)',
      borderColor: '#00B894',
      duration: 0.3
    })
    tl.to(element, {
      scale: 1.05,
      duration: 0.2,
      yoyo: true,
      repeat: 1
    }, '<')
    return tl
  },

  // 錯誤答案效果
  wrongAnswer: (element, options = {}) => {
    const tl = gsap.timeline()
    tl.to(element, {
      backgroundColor: 'rgba(225, 112, 85, 0.3)',
      borderColor: '#E17055',
      duration: 0.3
    })
    tl.to(element, {
      x: [-5, 5, -3, 3, 0],
      duration: 0.4
    }, '<')
    return tl
  },

  // 頒獎台進入動畫
  podiumEnter: (elements, options = {}) => {
    const tl = gsap.timeline()
    elements.forEach((el, index) => {
      tl.fromTo(el,
        { opacity: 0, y: 50, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.7)'
        },
        index * 0.2
      )
    })
    return tl
  },

  // 數字計數動畫
  countUp: (element, from, to, options = {}) => {
    const obj = { value: from }
    return gsap.to(obj, {
      value: to,
      duration: options.duration || 1,
      ease: options.ease || 'power2.out',
      onUpdate: () => {
        element.textContent = Math.round(obj.value)
      },
      onComplete: options.onComplete
    })
  },

  // 馬力條動畫
  powerBar: (element, toWidth, options = {}) => {
    return gsap.to(element, {
      width: `${toWidth}%`,
      duration: options.duration || 0.5,
      ease: options.ease || 'power2.out'
    })
  }
}

/**
 * Vue 3 自定義指令
 * 使用方式: v-animate="'fadeIn'" 或 v-animate="{ type: 'fadeIn', delay: 0.2 }"
 */
export const vAnimate = {
  mounted(el, binding) {
    const value = binding.value
    let animationType = 'fadeIn'
    let options = {}

    if (typeof value === 'string') {
      animationType = value
    } else if (typeof value === 'object') {
      animationType = value.type || 'fadeIn'
      options = value
    }

    if (animations[animationType]) {
      animations[animationType](el, options)
    }
  }
}

/**
 * 停止元素上的所有動畫
 */
export const killAnimation = (element) => {
  gsap.killTweensOf(element)
}

/**
 * 建立時間軸
 */
export const createTimeline = (options = {}) => {
  return gsap.timeline(options)
}

// 導出 gsap 本身供進階使用
export { gsap }

export default {
  animations,
  vAnimate,
  killAnimation,
  createTimeline,
  gsap
}
