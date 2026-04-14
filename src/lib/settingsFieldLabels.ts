/** Labels for `settings.fields.${key}` — mirrors aquaNet en_ref + zh where used. */
export type SettingFieldLocale = 'zh' | 'en'

const LABELS: Record<string, { zh: { name: string; desc: string }; en: { name: string; desc: string } }> = {
  mai2UnlockMusic: {
    zh: { name: '解锁全部乐曲', desc: '解锁全部乐曲与 Master 难度。' },
    en: { name: 'Unlock All Music', desc: 'Unlock all music and master difficulty.' },
  },
  mai2UnlockChara: {
    zh: { name: '解锁全部角色', desc: '解锁全部角色（新角色从 Lv1 开始）。' },
    en: { name: 'Unlock All Characters', desc: 'Unlock all characters (new characters start at level 1).' },
  },
  mai2UnlockCharaMaxLevel: {
    zh: { name: '角色最大等级', desc: '将所有角色设为最高等级。' },
    en: { name: 'Max Character Level', desc: 'Set all characters to max level.' },
  },
  mai2UnlockPartners: {
    zh: { name: '解锁全部搭档', desc: '解锁全部搭档。' },
    en: { name: 'Unlock All Partners', desc: 'Unlock all partners.' },
  },
  mai2UnlockCollectables: {
    zh: { name: '解锁全部收藏品', desc: '解锁名牌、称号、图标、边框等。' },
    en: {
      name: 'Unlock All Collectables',
      desc: 'Unlock all collectables (nameplate, title, icon, frame).',
    },
  },
  mai2UnlockTickets: {
    zh: { name: '解锁全部票券', desc: '无限票券（客户端仍可能限制可用票种）。' },
    en: {
      name: 'Unlock All Tickets',
      desc: 'Infinite tickets (Note: client still limits which tickets can be used).',
    },
  },
  waccaUnlockMusic: {
    zh: { name: '解锁全部乐曲', desc: '解锁全部乐曲。' },
    en: { name: 'Unlock All Music', desc: 'Unlock all music.' },
  },
  waccaUnlockPlates: {
    zh: { name: '解锁全部盘子', desc: '解锁全部盘子。' },
    en: { name: 'Unlock All Plates', desc: 'Unlock all plates.' },
  },
  waccaUnlockCollectables: {
    zh: { name: '解锁全部收藏品', desc: '解锁图标、奖杯等。' },
    en: { name: 'Unlock All Collectables', desc: 'Unlock all collectables (icon, trophy).' },
  },
  waccaUnlockTickets: {
    zh: { name: '无限票券', desc: '无限票券。' },
    en: { name: 'Infinite Tickets', desc: 'Infinite tickets.' },
  },
  waccaInfiniteWp: {
    zh: { name: '无限 WP', desc: '将 WP 设为 999999。' },
    en: { name: 'Infinite WP', desc: 'Set WP to 999999.' },
  },
  waccaAlwaysVip: {
    zh: { name: '始终 VIP', desc: '将 VIP 到期日设为 2077-01-01。' },
    en: { name: 'Always VIP', desc: 'Set VIP expiration date to 2077-01-01.' },
  },
  chusanTeamName: {
    zh: { name: '队伍名称', desc: '自定义资料页顶部显示的文字。' },
    en: { name: 'Team Name', desc: 'Customize the text displayed on the top of your profile.' },
  },
  chusanUnlockMusic: {
    zh: { name: '解锁全部乐曲', desc: '解锁全部乐曲（含隐藏曲、联动曲）。' },
    en: { name: 'Unlock All Music', desc: 'Unlock all music (including hidden and collab songs).' },
  },
  chusanInfinitePenguins: {
    zh: { name: '无限企鹅像', desc: '将角色等级提示用企鹅像设为 999。' },
    en: {
      name: 'Infinite Penguins',
      desc: 'Set penguin statues for character level prompting to 999.',
    },
  },
  chusanLoginRewardPenguinStatue: {
    zh: { name: '登录奖励 企鹅像', desc: '每次 GameLogin 发放 1 个 ペンギンスタチュウ（8000）。' },
    en: {
      name: 'Penguin Statue',
      desc: 'Grant 1 Penguin Statue (8000) on every GameLogin.',
    },
  },
  chusanLoginRewardShowNistatue: {
    zh: { name: '登录奖励 小企鹅像', desc: '每次 GameLogin 发放 1 个 ショウニスタチュウ（8010）。' },
    en: {
      name: 'Show-Ni Statue',
      desc: 'Grant 1 Show-Ni Statue (8010) on every GameLogin.',
    },
  },
  chusanLoginRewardSoulOfStatue: {
    zh: { name: '登录奖励 灵魂像', desc: '每次 GameLogin 发放 1 个 ソウルオブスタチュウ（8020）。' },
    en: {
      name: 'Soul of Statue',
      desc: 'Grant 1 Soul of Statue (8020) on every GameLogin.',
    },
  },
  chusanLoginRewardRainbowStatue: {
    zh: { name: '登录奖励 虹限像', desc: '每次 GameLogin 发放 1 个 虹限スタチュウ（8030）。' },
    en: {
      name: 'Rainbow Statue',
      desc: 'Grant 1 Rainbow Statue (8030) on every GameLogin.',
    },
  },
  chusanLoginRewardExpTicket: {
    zh: { name: '登录奖励 EXP×6 票', desc: '每次 GameLogin 发放 1 张 キャラクターEXPブースト×6.0倍チケット（312）。' },
    en: {
      name: 'EXP x6 Ticket',
      desc: 'Grant 1 Character EXP x6.0 Ticket (312) on every GameLogin.',
    },
  },
  chusanLoginRewardMasterTicket: {
    zh: { name: '登录奖励 MASTER 票', desc: '每次 GameLogin 发放 1 张 MASTERプレイチケット（402）。' },
    en: {
      name: 'MASTER Ticket',
      desc: 'Grant 1 MASTER Play Ticket (402) on every GameLogin.',
    },
  },
  chusanLoginRewardUltimaTicket: {
    zh: { name: '登录奖励 ULTIMA 票', desc: '每次 GameLogin 发放 1 张 ULTIMAプレイチケット（601）。' },
    en: {
      name: 'ULTIMA Ticket',
      desc: 'Grant 1 ULTIMA Play Ticket (601) on every GameLogin.',
    },
  },
  chusanLoginRewardWorldsEndTicket: {
    zh: { name: '登录奖励 WORLD\'S END 票', desc: '每次 GameLogin 发放 1 张 WORLD\'S ENDプレイチケット（701）。' },
    en: {
      name: 'WORLD\'S END Ticket',
      desc: 'Grant 1 WORLD\'S END Play Ticket (701) on every GameLogin.',
    },
  },
  chusanLvUnlockAll: {
    zh: { name: '解锁 Linked Gates', desc: '会有较长演出且无法撤销。' },
    en: { name: 'Unlock Linked Gates', desc: 'Incurs a long animated sequence, cannot be undone' },
  },
  chusanMatchingReflector: {
    zh: { name: '对战服 UDP Reflector', desc: '全国对战服务器 UDP Reflector 的 URL。' },
    en: {
      name: 'Matching Server Reflector',
      desc: "URL of the national matching server's UDP reflector.",
    },
  },
  chusanMatchingServer: {
    zh: { name: '对战服务器', desc: '全国对战服务器的 URL。' },
    en: { name: 'Matching Server', desc: 'URL of the national matching server.' },
  },
  chusanLvDifficulty: {
    zh: { name: 'Linked Verse 难度显示', desc: '选择 Linked Verse 相关难度展示方式。' },
    en: { name: 'Linked Verse difficulty', desc: 'How Linked Verse difficulty is shown.' },
  },
  ongekiInfiniteKaika: {
    zh: { name: '无限 Kaika', desc: '将 Kaika 设为 999。' },
    en: { name: 'Infinite Kaika', desc: 'Set Kaika to 999' },
  },
  rounding: {
    zh: { name: '分数取整', desc: '将分数四舍五入到一位小数（仅本地显示）。' },
    en: { name: 'Score Rounding', desc: 'Round the score to one decimal place' },
  },
  enableMusicRank: {
    zh: { name: '启用本机乐曲推荐段位', desc: '若你有自己的排行可关闭；仅影响本机。' },
    en: {
      name: 'Enable Recommended Music Rank on Your Machine',
      desc: 'If you have your own ranking, you can turn this off. It only affects your own machine',
    },
  },
  countryOverride: {
    zh: { name: '国家/地区覆盖', desc: '覆盖账户国家字段（高级）。' },
    en: { name: 'Country override', desc: 'Override account country field (advanced).' },
  },
}

export function settingFieldLabel(key: string, locale: SettingFieldLocale) {
  const row = LABELS[key]
  if (!row) {
    return { name: key, desc: '' }
  }
  return locale === 'zh' ? row.zh : row.en
}
