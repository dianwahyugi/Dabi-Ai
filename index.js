import './system/global.js'
import  './system/clean.js'
import c from 'chalk'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import readline from 'readline'
import { makeWASocket, useMultiFileAuthState, jidNormalizedUser } from 'baileys'
import { handleCmd, loadAll, ev } from './cmd/handle.js'
import { signal } from './cmd/interactive.js'
import { evConnect, handleSessi } from './connect/evConnect.js'
import { tmdead, autofarm, sambungkata, tebakkata, timerhistory, cost_robbery } from './system/gamefunc.js'
import getMessageContent from './system/msg.js'
import { authFarm, authUser } from './system/db/data.js'
import { rct_key } from './system/reaction.js'
import { txtWlc, txtLft, mode, banned, bangc } from './system/sys.js'
import { getMetadata, replaceLid, saveLidCache, cleanMsg, filter, imgCache, _imgTmp, afk, filterMsg } from './system/function.js'
import { handleStatus } from './system/status.js'

global.rl = readline.createInterface({ input: process.stdin, output: process.stdout })
global.q = (t) => new Promise((r) => rl.question(t, r))
global.lidCache = {}

const logLevel = pino({ level: 'silent' }),
      tempDir = path.join(dirname, '../temp')

let sock,
    ft

if (!imgCache.url) await _imgTmp()

fs.existsSync(tempDir) || fs.mkdirSync(tempDir, { recursive: !0 })
setInterval(() => console.clear(), 6e5)

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./connect/session')
    sock = makeWASocket({
      auth: state,
      version: [2, 3000, 1033936837],
      printQRInTerminal: !1,
      syncFullHistory: !1,
      logger: logLevel,
      browser: ['Ubuntu', 'Chrome', '20.0.04']
    })


    sock.ev.on('creds.update', saveCreds)
    sock.reactionCache ??= new Map();

    if (!state.creds?.me?.id) {
      try {
        const num  = await q(c.blueBright.bold('Nomor: ')),
              code = await sock.requestPairingCode(await global.number(num), 'IANSKUDO'),
              show = (code || '').match(/.{1,4}/g)?.join('-') || ''
        log(c.greenBright.bold('Pairing Code:'), c.cyanBright.bold(show))
      } catch (e) {
        if (e?.output?.statusCode === 428 || /Connection Closed/i.test(e?.message || ''))
          return handleSessi('Pairing timeout', startBot)
        throw e
      }
    }

    rl.close()
    evConnect(sock, startBot)
    store.bind(sock.ev)
    autofarm()
    timerhistory(sock)
    cost_robbery()
    tmdead()

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (let m of messages) {
        if (m.key && m.key.remoteJid === 'status@broadcast') {
                    await handleStatus(sock, m);
                    continue; 
                }
        if (m?.message?.messageContextInfo?.deviceListMetadata && !Object.keys(m.message).some(k => k === 'conversation' || k === 'extendedTextMessage')) continue
        if (m.key?.jadibot) continue

        m = cleanMsg(m)
        m = replaceLid(m)

        const { text, media } = getMessageContent(m),
              chat = global.chat(m, botName),
              time = global.time.timeIndo('Asia/Jakarta', 'HH:mm'),
              meta = chat.group
                ? (groupCache.get(chat.id) || await getMetadata(chat.id, sock) || {})
                : {},
              groupName = chat.group ? meta?.subject || 'Grup' : chat.channel ? chat.id : '',
              name = chat.pushName || chat.sender || chat.id,
              isMode = await mode(sock, chat),
              gcData = chat.group && get.gc(chat.id),
              ownerNum = [].concat(global.ownerNumber).map(n => n?.replace(/[^0-9]/g, ''))

        await rct_key(sock, m)

        if (global.msgAutoread) await sock.readMessages([m.key]).catch(() => {});
        
        if (chat.group && Object.keys(meta).length) { await saveLidCache(meta) }

        log(
          c.bgGrey.yellowBright.bold(
            chat.group
              ? `[ ${groupName} | ${name} ]`
              : chat.channel
                ? `[ ${groupName} ]`
                : `[ ${name} ]`
          ) +
          c.white.bold(' | ') +
          c.blueBright.bold(`[ ${time} ]`)
        )

        ;(media || text) &&
        log(
          c.white.bold(
            [media && `[ ${media} ]`, text && `[ ${text} ]`]
              .filter(Boolean)
              .join(' ')
          )
        )

        if (banned(chat) ? (log(c.yellowBright.bold(`${chat.sender} diban`)), !0) : chat.group && bangc(chat) ? !0 : !(await filterMsg(m, chat, text)) ? !0 : ((!global.public) && !ownerNum.includes(chat.sender?.replace(/@s\.whatsapp\.net$/, ''))) ? !0 : !isMode) return

        await authUser(m)
        await authFarm(m)
        await afk(sock, m)
        await tebakkata(sock, m)
        await sambungkata(sock, m)

        if (chat.group) {
          ft = await filter(sock, m, text)
          ft && (
            ft.antiLink(),
            ft.antiTagSw(),
            ft.badword(),
            ft.antiCh(),
            ft.antitag(),
            ft.autoback()
          )
        }

        if (gcData) {
          const { usrAdm, botAdm } = await grupify(sock, m)
          if (gcData.filter?.mute && !usrAdm) return !1
        }

        if (text || media) {
          sock.reactionCache.set(m.key?.id, m)
          setTimeout(() => sock.reactionCache.delete(m.key?.id), 18e5)
        }

        if (text) await signal(text, m, sock, ev)

        await handleCmd(m?.key ? m : null, sock, store)
      }
    })

    sock.ev.on('group-participants.update', async u => {
      if (!u.id) return
      groupCache.delete(u.id)

      const meta = await getMetadata(u.id, sock),
            g = meta?.subject || 'Grup',
            idToPhone = Object.fromEntries((meta?.participants || []).map(p => [p.id, p.phoneNumber]))

      for (const pid of u.participants) {
        const phone = pid.phoneNumber || idToPhone[pid],
              msg = u.action === 'add'     ? c.greenBright.bold(`+ ${phone} joined ${g}`) :
                    u.action === 'remove'  ? c.redBright.bold(`- ${phone} left ${g}`) :
                    u.action === 'promote' ? c.magentaBright.bold(`${phone} promoted in ${g}`) :
                    u.action === 'demote'  ? c.cyanBright.bold(`${phone} demoted in ${g}`) : ''

        if (u.action === 'add' || u.action === 'remove') {
          const gcData = get.gc(u.id),
                isAdd = u.action === 'add',
                cfg = isAdd ? gcData?.filter?.welcome?.welcomeGc : gcData?.filter?.left?.leftGc

          if (!gcData || !cfg) return

          const { txt } = await (isAdd ? txtWlc : txtLft)(sock, u.id),
                jid = pid.phoneNumber || idToPhone[pid],
                mention = '@' + (jid?.split('@')[0] || jid),
                text = txt.replace(/@user|%user/gi, mention),
                ppgc = await sock.profilePictureUrl(u.id, 'image')

          await sock.sendMessage(u.id, {
            text,
            mentions: [jid],
            contextInfo: {
              externalAdReply: {
                body: `${g}`,
                thumbnailUrl: ppgc,
                mediaType: 1,
                renderLargerThumbnail: !0
              }
            }
          })
        }
      }
    })

    sock.ev.on('groups.update', u => 
      u.forEach(async v => {
        if (!v.id) return
        groupCache.delete(v.id)

        const m = await getMetadata(v.id, sock).catch(() => ({})),
              a = v.participantAlt || v.participant || v.author,
              f = a && m?.participants?.length ? m.participants.find(p => p.id === a) : 0
        v.author = f?.phoneNumber || a
      })
    )
  } catch (e) {
    err(c.redBright.bold('Error pada index.js:'), e)
  }
}

startBot()
await loadAll()