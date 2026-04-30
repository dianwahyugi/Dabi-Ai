import fetch from 'node-fetch'
import fs from 'fs'
import { bell } from '../cmd/interactive.js'
import { isJidGroup } from 'baileys'
import { bnk } from './db/data.js'
import { tmpFiles } from './tmpfiles.js'

const memoryCache = {},
      groupCache = new Map(),
      spamData = {}

let imgCache = {}

async function getMetadata(id, sock, retry = 2) {
  if (groupCache.has(id)) return groupCache.get(id)
  try {
    const m = await sock.groupMetadata(id)
    groupCache.set(id, m)
    setTimeout(() => groupCache.delete(id), 12e4)
    return m
  } catch (e) {
    return retry > 0
      ? (await new Promise(r => setTimeout(r, 1e3)), getMetadata(id, sock, retry - 1))
      : null
  }
}

async function saveLidCache(metadata) {
  for (const p of metadata?.participants || []) {
    const phone = p.phoneNumber?.replace(/@.*/, ""),
          lid = p.id?.endsWith("@lid") ? p.id : null
    if (phone && lid) global.lidCache[phone] = lid
  }
}

function replaceLid(o, v = new WeakSet()) {
  if (!o) return o

  if (typeof o == "object") {
    if (v.has(o)) return o
    v.add(o)

    const isArr = Array.isArray(o),
          isBuf = Buffer.isBuffer(o) || o instanceof Uint8Array

    if (isArr) return o.map(i => replaceLid(i, v))
    if (isBuf) return o

    for (const k in o) o[k] = replaceLid(o[k], v)
    return o
  }

  if (typeof o == "string") {
    const e = Object.entries(global.lidCache ?? {}),
          isLid = /@lid$/.test(o)

    if (isLid) {
      const p = e.find(([, v]) => v === o)?.[0]
      if (p) return `${p}@s.whatsapp.net`
    }

    return o
      .replace(/@(\d+)@lid/g, (_, i) => {
        const p = e.find(([, v]) => v === `${i}@lid`)?.[0]
        return p ? `@${p}` : `@${i}@lid`
      })
      .replace(/@(\d+)(?!@)/g, (m, l) => {
        const p = e.find(([, v]) => v === `${l}@lid`)?.[0]
        return p ? `@${p}` : m
      })
  }

  return o
}

async function call(sock, e, m) {
  try {
    const err = (typeof e === 'string' ? e : e?.stack || e?.message || String(e))
            .replace(/file:\/\/\/[^\s)]+/g, '')
            .replace(/at\s+/g, '\n→ ')
            .trim(),
          chat = global.chat(m),
          sender = chat.sender || 'unknown',
          txt = `Tolong bantu jelaskan error ini dengan bahasa alami dan ramah pengguna:\n\n${e}`,
          res = await bell(txt, m, sock)

    res?.msg
      ? await sock.sendMessage(chat.id, { text: res.msg }, { quoted: m })
      : await sock.sendMessage(chat.id, { text: `Gagal memproses error: ${res?.message || 'tidak diketahui'}` }, { quoted: m })
  } catch (errSend) {
    await sock.sendMessage(
      m?.chat || m?.key?.remoteJid || 'unknown',
      { text: `Gagal menjalankan call(): ${errSend?.message || String(errSend)}` },
      { quoted: m }
    )
  }
}

const cleanMsg = obj => {
  if (obj == null) return
  if (Array.isArray(obj)) {
    const arr = obj.map(cleanMsg).filter(v => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (typeof obj === 'object') {
    if (Buffer.isBuffer(obj) || ArrayBuffer.isView(obj)) return obj
    const cleaned = Object.entries(obj).reduce((acc, [k, v]) => {
      const c = cleanMsg(v)
      if (c !== undefined) acc[k] = c
      return acc
    }, {})
    return Object.keys(cleaned).length ? cleaned : undefined
  }
  return obj
}

async function func() {
  const url = 'https://raw.githubusercontent.com/Dabilines/Dabi-Ai-Documentation/main/assets/func.js',
        code = await fetch(url).then(r => r.text()),
        data = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64'),
        md = await import(data),
        funcs = md.default

  return Object.assign(global, funcs), funcs
}

async function filter(sock, m, text) {
  const chat = global.chat(m),
        gcData = get.gc(chat.id),
        meta = await grupify(sock, m)

  if (!meta) return

  const { usrAdm, botAdm, adm } = meta

  const filter = {
    link: async t =>
      typeof t == 'string' &&
      /(?:https?:\/\/)?chat\.whatsapp\.com\/[A-Za-z0-9]{20,24}/i
        .test(t.trim().replace(/\s+/g, '').replace(/\/{2,}/g, '/')),

    linkCh: async t =>
      typeof t == 'string' &&
      /(?:https?:\/\/)?whatsapp\.com\/channel\/[A-Za-z0-9]+/i
        .test(t.trim().replace(/\s+/g, '').replace(/\/{2,}/g, '/')),

    antiLink: async () => {
      const txt = m.message?.extendedTextMessage?.text
      if (!gcData || !botAdm) return

      const isLink = await filter.link(txt)
      return (gcData?.filter?.antilink && botAdm && !usrAdm && isLink)
        ? await sock.sendMessage(chat.id, { delete: m.key }).catch(() => {})
        : !1
    },

    antiTagSw: async () => {
      const txt = m.message?.groupStatusMentionMessage
      if (!gcData || !botAdm) return

      return (gcData?.filter?.antitagsw && botAdm && !usrAdm && txt)
        ? await sock.sendMessage(chat.id, { delete: m.key }).catch(() => {})
        : !1
    },

    autoback: async () => {
      if (!gcData || !botAdm) return !1

      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.extendedTextMessage?.conversation,
            bot = chat.sender === sock.user?.id?.split(':')[0]

      if (bot || !text) return !1

      global.autoback = global.autoback || {},
      global.autoback[chat.id] = global.autoback[chat.id] || {}

      const isLink = await filter.link(text),
            match = text.match(/https?:\/\/[^\s]+/gi),
            link = match ? match[0] : null

      if (!(gcData?.filter?.autoback && isLink && !usrAdm && link)) return !1

      const getlink = await sock.groupInviteCode(chat.id),
            linkgc = `https://chat.whatsapp.com/${getlink}`,
            ppgc = await sock.profilePictureUrl(chat.id, 'image'),
            linkusr = link.split('/').pop().split('?')[0]

      let res, is304 = !1

      try {
        res = await sock.groupAcceptInvite(linkusr)
      } catch (e) {
        if (e?.data === 410) return !1

        if (e?.data === 401) {
          await sock.sendMessage(chat.id, { text: 'gw di kick lol' }, { quoted: m }).catch(() => !1)

          await sock.sendMessage(chat.id, { delete: m.key }).catch(() => !1)

          global.autoback?.[chat.id]?.[chat.sender] && delete global.autoback[chat.id][chat.sender]

          return !0
        }

        if (e?.data === 304) is304 = !0

        if (e?.data === 409) {
          await sock.sendMessage(chat.id, { text: 'okey gw bck ya' }, { quoted: m }).catch(() => !1)

          let info = null

          try {
            info = await sock.groupGetInviteInfo(linkusr)
          } catch {}

          if (info?.id) {
            await sock.sendMessage(info.id, {
              text: `bck tadi @${chat.sender?.replace(/@s\.whatsapp\.net$/, '')} ${linkgc}`,
              mentions: [chat.sender],
              contextInfo: {
                externalAdReply: {
                  body: `ini bot`,
                  thumbnailUrl: ppgc,
                  mediaType: 1,
                  renderLargerThumbnail: !0
                }
              }
            }).catch(() => !1)
          }

          delete global.autoback[chat.id]

          return !0
        }

        if (!is304) return !1
      }

      const isGc = is304 ? !1 : isJidGroup(res)

      if (!isGc) {
        await sock.sendMessage(chat.id, {
          text: is304 ? 'gw gak di acc 3 menit gak di acc del.' : 'acc lama hapus'
        }, { quoted: m }).catch(() => !1)

        global.autoback[chat.id][chat.sender] = {
          id: m.key.id,
          linkusr,
          timer: { start: m.messageTimestamp * 1e3 || Date.now() }
        }

        setTimeout(async () => {
          const d = global.autoback?.[chat.id]?.[chat.sender]
          if (!d || d.id !== m.key?.id) return

          const now = Date.now(),
                elapsed = now - d.timer.start

          if (elapsed < 17e4) return

          let info = null, joined = !1

          try {
            info = await sock.groupGetInviteInfo(linkusr)
          } catch {}

          if (info?.id) {
            try {
              await sock.groupMetadata(info.id)
              joined = !0
            } catch {
              joined = !1
            }
          }

          if (joined && info?.id) {
            await sock.sendMessage(info.id, {
              text: `bck tadi @${chat.sender?.replace(/@s\.whatsapp\.net$/, '')} ${linkgc}`,
              mentions: [chat.sender],
              contextInfo: {
                externalAdReply: {
                  body: `ini bot`,
                  thumbnailUrl: ppgc,
                  mediaType: 1,
                  renderLargerThumbnail: !0
                }
              }
            }).catch(() => !1)

            delete global.autoback[chat.id][chat.sender]
          }

        }, 17e4)

        setTimeout(async () => {
          const d = global.autoback?.[chat.id]?.[chat.sender]
          if (!d || d.id !== m.key?.id) return

          const now = Date.now(),
                elapsed = now - d.timer.start

          if (elapsed < 18e4) return

          if (is304) {
            await sock.sendMessage(chat.id, { text: 'lama lu' }, { quoted: m }).catch(() => !1)

            await sock.sendMessage(chat.id, {
              delete: {
                remoteJid: chat.id,
                fromMe: !1,
                id: d.id,
                participant: chat.sender
              }
            }).catch(() => !1)

            delete global.autoback[chat.id][chat.sender]

            return
          }

          await sock.sendMessage(chat.id, { text: 'lama lu' }, { quoted: m }).catch(() => !1)

          await sock.sendMessage(chat.id, {
            delete: {
              remoteJid: chat.id,
              fromMe: !1,
              id: d.id,
              participant: chat.sender
            }
          }).catch(() => !1)

          delete global.autoback[chat.id][chat.sender]
        }, 18e4)

        return !0
      }
    },

    badword: async () => {
      if (!gcData || !botAdm) return

      const txt = m.message?.extendedTextMessage?.text,
            cfg = gcData?.filter?.badword,
            list = cfg?.badwordtext,
            isBot = m.key?.fromMe

      if (!cfg?.antibadword || !txt || !Array.isArray(list) || isBot) return

      const hit = list.some(w => txt.toLowerCase().includes(w.toLowerCase()))

      return hit && !usrAdm
        ? await sock.sendMessage(chat.id, { delete: m.key }).catch(() => {})
        : !1
    },

    antiCh: async () => {
      if (!gcData || !botAdm || !gcData?.filter?.antich || usrAdm || m.key?.fromMe) return !1

      const txt =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        '',
        isLinkCh = await filter.linkCh(txt),
        ch =
          m.message?.extendedTextMessage?.contextInfo ??
          m.message?.imageMessage?.contextInfo ??
          m.message?.videoMessage?.contextInfo ??
          m.message?.audioMessage?.contextInfo ??
          m.message?.stickerMessage?.contextInfo

      let info = ch?.forwardedNewsletterMessageInfo

      !info && ch?.stanzaId && global.store && (
        info = (await (async () => {
          const msg = (await global.store.loadMsg(chat.id, ch.stanzaId))?.message
          return msg && Object.values(msg)[0]
        })())?.contextInfo?.forwardedNewsletterMessageInfo
      )

      return (info?.newsletterJid || isLinkCh)
        ? sock.sendMessage(chat.id, { delete: m.key }).catch(() => !1)
        : !1
    },

    antitag: async () => {
      if (!gcData || !botAdm || !gcData?.filter?.antitagall || usrAdm || m.key?.fromMe) return !1

      const ctx = m.message?.extendedTextMessage?.contextInfo || {},
            mentioned = ctx.mentionedJid || [],
            text = m.message?.extendedTextMessage?.text || '',
            metadata = groupCache.get(chat.id) || await getMetadata(chat.id)

      if (!mentioned || !mentioned.length) return !1

      const textTags = [...text.matchAll(/@(\d{5,20})/g)].map(v => v[1]),
            mentionedNums = mentioned.map(v => v.split('@')[0]),
            tagCount = mentioned.length,
            hideTag = mentionedNums.length && !mentionedNums.some(n => textTags.includes(n)),
            abnormalTag = textTags.length && !textTags.every(n => mentionedNums.includes(n)),
            overLimit = tagCount > 3e1,
            tagAll = tagCount === metadata?.size || tagCount === gcData?.member

      return hideTag || abnormalTag || overLimit || tagAll
        ? (sock.sendMessage(chat.id, { delete: m.key }), !0)
        : !0
    }
  }

  return filter
}

async function cekSpam(sock, m) {
  const chat = global.chat(m),
        user = m.key.participant || chat.sender,
        usrData = get.db(user),
        now = Date.now(),
        msgTime = (m.messageTimestamp?.low || m.messageTimestamp || now) * 1e3,
        target = m.key?.jadibot ? usrData?.jid + '.jadibot' : usrData?.jid

  if (!usrData) return !1

  if (!spamData[target]) return spamData[target] = {
    count: 1,
    time: { last: msgTime },
    block: 0
  }, !1

  if (spamData[target].block && now < spamData[target].block) return !0

  const diff = msgTime - spamData[target].time.last

  if (diff <= 2.5e3) {
    spamData[target].count++,
    spamData[target].time.last = msgTime

    if (spamData[target].count >= 1) {
      await sock.sendMessage(chat.id, { text: 'jangan spam' }, { quoted: m }),
      spamData[target].block = now + 7e3

      return spamData[target].count = 0, !0
    }
    return !1
  }

  return diff >= 7e3
    ? (spamData[target] = {
        count: 1,
        time: { last: msgTime },
        block: 0
      }, !1)
    : (spamData[target].time.last = msgTime, !1)
}

async function _imgTmp() {
  if (!fs.existsSync('./system/set/thumb-dabi.png')) return

  const img = fs.readFileSync('./system/set/thumb-dabi.png')

  if (!img || imgCache.url) {
    if (!img) return

    const res = imgCache.url ? await fetch(imgCache.url,{method:'HEAD'}).catch(_=>!1) : null
    if (res && res.ok) return imgCache.url
    if (imgCache.url) delete imgCache.url
  }

  return imgCache.url = await tmpFiles(img)
}

async function afk(sock, m) {
  if (!m?.key || m.key.fromMe) return

  const chat = global.chat(m)

  if (!chat.group) return

  const users = Object.values(db()?.key || {}),
        self = users.find(u => u.jid === chat?.sender),
        canQuote = m?.message && typeof m.message === 'object' && !m.key?.isViewOnce,
        quoted = canQuote ? { quoted: m } : {},
        ctx = m.message?.extendedTextMessage?.contextInfo,
        target = Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid[0] : ctx?.participant,
        targetUsr = users.find(u => u.jid === target),
        now = global.time.timeIndo('Asia/Jakarta', 'DD-MM HH:mm:ss'),
        calc = a => {
          if (!a?.afkStart) return 'baru saja'
          const [d, mo, h, mi, s] = a.afkStart.match(/\d+/g).map(Number),
                [nd, nmo, nh, nmi, ns] = now.match(/\d+/g).map(Number),
                diff = ((new Date(new Date().getFullYear(), nmo - 1, nd, nh, nmi, ns) -
                        new Date(new Date().getFullYear(), mo - 1, d, h, mi, s)) / 1e3) | 0
          return diff < 8.64e4
            ? diff < 60
              ? 'baru saja'
              : diff < 3.6e3
                ? `${(diff / 60 | 0)} menit yang lalu`
                : `${(diff / 3.6e3 | 0)} jam yang lalu`
            : `${(diff / 8.64e4 | 0)} hari yang lalu`
        }

  if (!chat?.id || !self) return

  if (targetUsr?.afk?.status) return sock.sendMessage(chat.id, { text: `jangan tag dia,\ndia sedang afk, dengan alasan: ${targetUsr?.afk?.reason || 'tidak ada alasan'}\nwaktu AFK: ${calc(targetUsr.afk)}` }, quoted)

  if (!self.afk?.status) return

  const dur = calc(self.afk),
        tag = !m?.message,
        text = tag
          ? `@${chat.sender.split('@')[0]} kembali dari AFK: "${self?.afk?.reason || 'tidak ada alasan'}"\nWaktu AFK: ${dur}`
          : `Kamu kembali dari AFK: "${self?.afk?.reason || 'tidak ada alasan'}"\nWaktu AFK: ${dur}`

  self.afk.status = !1
  self.afk.reason = ''
  self.afk.afkStart = ''

  save.db()

  return sock.sendMessage(chat.id, { text, ...(tag ? { mentions: [chat.sender] } : {}) }, quoted)
}

async function _tax(sock, m) {
  const chat = global.chat(m),
        usrDb = get.db(chat.sender),
        taxStr = bnk().key?.tax || '0%',
        tax = parseInt(taxStr.replace('%', '')) || 0,
        money = usrDb?.moneyDb?.money || 0

  return Math.floor(money * tax / 100)
}

async function filterMsg(m, chat, text) {
  global.cacheCmd ??= []

  if (!chat?.group || !text) return !0

  const id = m.key.remoteJid,
        no = chat.sender,
        jadibot = 'jadibot' in (m.key || {}),
        time = m.messageTimestamp,
        cacheMsg = { id, no, jadibot, text, time },
        same = global.cacheCmd.find(v =>
          v.id === id &&
          v.no === no &&
          v.text === text &&
          v.time === time
        )

  if (same) {
    if (same.jadibot && !jadibot)
      global.cacheCmd = global.cacheCmd.filter(v => v !== same)

    else if (!same.jadibot && jadibot)
      return !1

    if (!same.jadibot && jadibot)
      return !1

    if (same.jadibot && !jadibot)
      global.cacheCmd = global.cacheCmd.filter(v => v !== same)

    else if (same.jadibot && jadibot) {
      if (Math.random() < 5e-1) return !1
      global.cacheCmd = global.cacheCmd.filter(v => v !== same)
    }

    else return !1
  }

  if (!same && jadibot) {
    global.cacheCmd.push(cacheMsg)

    return await new Promise(resolve => {
      setTimeout(() => {

        const mainExists = global.cacheCmd.find(v =>
          v.id === id &&
          v.no === no &&
          v.text === text &&
          v.time === time &&
          !v.jadibot
        )

        if (mainExists ? !0 : !1) {
          global.cacheCmd = global.cacheCmd.filter(v => v !== cacheMsg)
          return resolve(!1)
        }

        resolve(!0)
      }, 5e1)
    })
  }

  global.cacheCmd.push(cacheMsg)

  setTimeout(() => {
    global.cacheCmd = global.cacheCmd.filter(v =>
      !(v.id === id &&
        v.no === no &&
        v.time === time)
    )
  }, 3e5)

  return !0
}

export {
  getMetadata,
  replaceLid,
  saveLidCache,
  call,
  cleanMsg,
  groupCache,
  imgCache,
  func,
  filter,
  cekSpam,
  afk,
  filterMsg,
  _imgTmp,
  _tax
}