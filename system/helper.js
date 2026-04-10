import fs from 'fs'
import path from 'path'
import moment from 'moment-timezone'

const msgCache = new Map()

const number = (input) => {
  const digits = input.replace(/\D/g, '')
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits
}

const own = (m) => {
  const chat = global.chat(m),
        sender = chat.sender.replace(/@s\.whatsapp\.net$/, ''),
        number = Array.isArray(ownerNumber)
          ? ownerNumber.map(n => n.replace(/\D/g, ''))
          : [ownerNumber?.replace(/\D/g, '')]

  return number.includes(sender)
}

const makeInMemoryStore = () => {
  const msg = {},
        loadMsg = async (remoteJid, stanzaId) =>
          msg[remoteJid]?.array?.find(m => m.key?.id === stanzaId) || null,
        bind = (ev) => {
          ev.on('messages.upsert', ({ messages }) => {
            if (!Array.isArray(messages)) return
            for (const m of messages) {
              const jid = m.key?.remoteJid
              if (!jid) continue

              const store = msg[jid] ||= { array: [] }

              if (!store.array.find(x => x.key?.id === m.key?.id)) {
                store.array.push(m)
                if (store.array.length > 100) store.array.shift()
              }
            }
          })
        }

  return { msg, bind, loadMsg }
}

export {
  number,
  own,
  makeInMemoryStore
}