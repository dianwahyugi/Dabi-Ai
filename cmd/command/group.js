import jimp from 'jimp'
import { gc } from '../../system/db/data.js'
import { isJidGroup, downloadMediaMessage } from 'baileys'

export default function group(ev) {
  ev.on({
    name: 'anti badword',
    cmd: ['antibadword', 'badword'],
    ocrs: ['set', 'reset', 'on', 'off'],
    tags: 'Group Menu',
    desc: 'mengatur fitur anti badword dalam grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      ocrs,
      prefix,
      text,
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!gcData || !usrAdm || !botAdm || !ocrs) {
          return sock.sendMessage(chat.id, {
            text: !gcData
              ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar`
              : !usrAdm
              ? 'kamu bukan admin'
              : !botAdm
              ? 'aku bukan admin'
              : `masukan input\ncontoh:\n${prefix}${cmd} on → aktifkan ${cmd}\n${prefix}${cmd} off → nonaktifkan ${cmd}\n${prefix}${cmd} set <text> → setting ${cmd}\n${prefix}${cmd} reset → reset ${cmd}`
          }, { quoted: m })
        }

        gcData.filter = gcData.filter || {}
        gcData.filter.badword = gcData.filter.badword || {
          antibadword: !1,
          badwordtext: []
        }

        if (ocrs === 'on' || ocrs === 'off')
          return gcData.filter.badword.antibadword = ocrs === 'on',
          save.gc(),
          await sock.sendMessage(chat.id, { text: `${cmd} ${ocrs === 'on' ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: m })

        if (ocrs === 'set' || ocrs === 'reset') {
          if (ocrs === 'set') {
            let txt = args.join(' ').trim()

            if (!txt) return sock.sendMessage(chat.id, { text: `masukan kata-kata kasar nya\ncontoh: ${prefix}${cmd} set bahlil` }, { quoted: m })

            if (!Array.isArray(gcData.filter.badword.badwordtext))
              gcData.filter.badword.badwordtext = []

            if (!gcData.filter.badword.badwordtext.includes(txt))
              gcData.filter.badword.badwordtext.push(txt)

            gcData.filter.badword.antibadword = !0
            save.gc()

            await sock.sendMessage(chat.id, { text: `kata "${txt}" berhasil ditambahkan ke blacklist` }, { quoted: m })

          } else {
            gcData.filter.badword.antibadword = !1
            gcData.filter.badword.badwordtext = []
            save.gc()

            await sock.sendMessage(chat.id, { text: `${cmd} berhasil direset` }, { quoted: m })
          }
        }
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'anti ch',
    cmd: ['antich'],
    tags: 'Group Menu',
    desc: 'mengatur fitur anti saluran/ch',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!gcData || !usrAdm || !botAdm) {
          return sock.sendMessage(chat.id, { text: !gcData ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` : !usrAdm ? 'kamu bukan admin' : 'aku bukan admin' }, { quoted: m })
        }

        const input = args[0]?.toLowerCase(),
              opsi = !!gcData?.filter?.antich,
              type = v => v ? 'Aktif' : 'Tidak',
              modech = type(gcData?.filter?.antich)

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\n${cmd}: ${modech}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.antich = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} berhasil di-${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'anti link',
    cmd: ['antilink'],
    tags: 'Group Menu',
    desc: 'anti link grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!chat.group || !gcData || !usrAdm || !botAdm) {
          return sock.sendMessage(chat.id, { text: !chat.group ? 'perintah ini hanya bisa dijalankan digrup' : !gcData ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` : !usrAdm ? 'kamu bukan admin' : 'aku bukan admin' }, { quoted: m })
        }

        const input = args[0]?.toLowerCase(),
              opsi = !!gcData?.filter?.antilink,
              type = v => v ? 'Aktif' : 'Tidak',
              modelink = type(gcData?.filter?.antilink)

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\nantilink: ${modelink}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.antilink = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} berhasil di-${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'anti tag all',
    cmd: ['antitagall', 'antitag', 'antihidetag'],
    tags: 'Group Menu',
    desc: 'anti tag all digrup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!chat.group || !gcData || !usrAdm || !botAdm) {
          return sock.sendMessage(chat.id, { text: !chat.group ? 'perintah ini hanya bisa dijalankan digrup' : !gcData ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` : !usrAdm ? 'kamu bukan admin' : 'aku bukan admin' }, { quoted: m })
        }

        const input = args[0]?.toLowerCase(),
              opsi = !!gcData?.filter?.antitagall,
              type = v => v ? 'Aktif' : 'Tidak',
              modeantitag= type(gcData?.filter?.antitagall)

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\nantitagall: ${modeantitag}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.antitagall = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} berhasil di-${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'anti tag sw',
    cmd: ['antitagsw', 'tagsw'],
    tags: 'Group Menu',
    desc: 'anti tag status digrup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!chat.group || !gcData || !usrAdm || !botAdm) {
          return sock.sendMessage(chat.id, { text: !chat.group ? 'perintah ini hanya bisa dijalankan digrup' : !gcData ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` : !usrAdm ? 'kamu bukan admin' : 'aku bukan admin' }, { quoted: m })
        }

        const input = args[0]?.toLowerCase(),
              opsi = !!gcData?.filter?.antitagsw,
              type = v => v ? 'Aktif' : 'Tidak',
              modetagsw = type(gcData?.filter?.antitagsw)

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\n${cmd}: ${modetagsw}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.antitagsw = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} di${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'auto back',
    cmd: ['autoback'],
    tags: 'Group Menu',
    desc: 'mengaktifkan autoback grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const { usrAdm, botAdm } = await grupify(sock, m),
              gcData = get.gc(chat.id)

        if (!usrAdm || !botAdm || !gcData) {
          return sock.sendMessage(chat.id, { text: !usrAdm ? 'kamu bukan admin' : !botAdm ? 'aku bukan admin' : `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` }, { quoted: m })
        }

        const input = args[0]?.toLowerCase(),
              opsi = !!gcData?.filter?.autoback,
              type = v => v ? 'Aktif' : 'Tidak',
              modeback = type(gcData?.filter?.autoback)

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\n${cmd}: ${modeback}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.autoback = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} di${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'blacklist member',
    cmd: ['blacklistmember', 'blacklist'],
    tags: 'Group Menu',
    desc: 'menutup grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'Perintah ini hanya untuk grup' }, { quoted: m })

        const { usrAdm, botAdm } = await grupify(sock, m),
              q = m.message?.extendedTextMessage?.contextInfo,
              target = q?.participant || q?.mentionedJid?.[0]

        if (!usrAdm || !botAdm || !target) {
          return sock.sendMessage(chat.id, { text: !usrAdm ? 'kamu bukan admin' : !botAdm ? 'aku bukan admin' : 'reply/tag target yang akan diblacklist' }, { quoted: m })
        }

        const gcData = get.gc(chat.id),
              usr = target.replace(/@s\.whatsapp\.net$/, '')

        gcData.blacklist ??= []
        gcData.blacklist.push(target)

        await sock.sendMessage(chat.id, { text: `${usr} berhasil di blacklist` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'close',
    cmd: ['tutup', 'close'],
    tags: 'Group Menu',
    desc: 'menutup grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'Perintah ini hanya untuk grup' }, { quoted: m })

        const { botAdm, usrAdm } = await grupify(sock, m),
              meta = groupCache.get(chat.id) || await sock.groupMetadata(chat.id)

        if (!botAdm || !usrAdm || meta?.announce) {
          return sock.sendMessage(chat.id, { text: !botAdm ? 'aku bukan admin' : !usrAdm ? 'kamu bukan admin' : 'grup sudah ditutup' }, { quoted: m })
        }

        await sock.groupSettingUpdate(chat.id, 'announcement')
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'daftar gc',
    cmd: ['daftargc'],
    tags: 'Group Menu',
    desc: 'mendaftarkan grup ke database',
    owner: !1,
    prefix: !0,
    money: 300,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const gcData = get.gc(chat.id)

        if (gcData) return sock.sendMessage(chat.id, { text: 'grup ini sudah terdaftar' }, { quoted: m })

        const cache = groupCache.get(chat.id) || await sock.groupMetadata(chat.id),
              groupName = cache.subject,
              gcInfo = cache;

        gc().key[groupName] = {
          id: chat.id,
          ban: !1,
          member: gcInfo.participants?.length || 0,
          filter: {
            mute: !1,
            antilink: !1,
            antitagsw: !1,
            antich: !1,
            autoback: !1,
            antitagall: !1,
            blacklist: [],
            badword: {
              antibadword: !1,
              badwordtext: []
            },
            left: {
              leftGc: !1,
              leftText: ''
            },
            welcome: {
              welcomeGc: !1,
              welcomeText: ''
            }
          }
        }

        save.gc()
        sock.sendMessage(chat.id, { text: `grup *${groupName}* berhasil didaftarkan` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'delete',
    cmd: ['d', 'del', 'delete'],
    tags: 'Group Menu',
    desc: 'menghapus pesan di group',
    owner: !1,
    prefix: !0,
    money: 50,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        const quoted = m.message?.extendedTextMessage?.contextInfo,
              reply = quoted?.quotedMessage,
              mKey = quoted?.stanzaId,
              user = quoted?.participant

        if (!reply || !mKey || !user) return sock.sendMessage(chat.id, { text: 'reply chat yang ingin dihapus' }, { quoted: m })

        const botNum = `${sock.user.id.split(':')[0]}@s.whatsapp.net`,
              fromBot = user === botNum,
              { botAdm, usrAdm } = await grupify(sock, m)

        if (!fromBot && !usrAdm) return sock.sendMessage(chat.id, { text: 'kamu bukan admin' }, { quoted: m })
        if (!fromBot && !botAdm) return sock.sendMessage(chat.id, { text: 'aku bukan admin' }, { quoted: m })

        await sock.sendMessage(chat.id, { delete: { remoteJid: chat.id, fromMe: fromBot, id: mKey, ...(fromBot? {} : { participant: user }) } })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'demote',
    cmd: ['demote'],
    tags: 'Group Menu',
    desc: 'menurunkan admin',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const target = chat.quoted.id?.[0],
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!usrAdm || !botAdm || !target) {
          return sock.sendMessage(chat.id, { text: !usrAdm ? 'kamu bukan admin' : !botAdm ? 'aku bukan admin' : 'reply atau tag nomor yang ingin diturunkan jabatannya' }, { quoted: m })
        }

        await sock.groupParticipantsUpdate(chat.id, [target], 'demote')

        await sock.sendMessage(chat.id, { react: { text: '✅', key: m.key } })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'hidetag',
    cmd: ['h', 'hidetag'],
    tags: 'Group Menu',
    desc: 'tag all member',
    owner: !1,
    prefix: !0,
    money: 500,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd
    }) => {
      try {
        const { botAdm, usrAdm } = await grupify(sock, m),
              text = args.join(' '),
              fallback = chat.quoted.txt || text,
              gcInfo = groupCache.get(chat.id) || await sock.groupMetadata(chat.id),
              all = gcInfo.participants.map(v => v.id)

        if (!chat.group || !usrAdm || !botAdm || !fallback)
          return !chat.group
            ? sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa dijalankan di grup' }, { quoted: m })
            : !usrAdm
            ? sock.sendMessage(chat.id, { text: 'kamu bukan admin' }, { quoted: m })
            : !botAdm
            ? sock.sendMessage(chat.id, { text: 'aku bukan admin' }, { quoted: m })
            : sock.sendMessage(chat.id, { text: 'hidetag tidak boleh kosong' }, { quoted: m })

        sock.sendMessage(chat.id, { text: fallback, mentions: all }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'intro',
    cmd: ['intro'],
    tags: 'Group Menu',
    desc: 'melihat intro grup',
    owner: !1,
    prefix: !0,
    money: 0,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd,
      prefix
    }) => {
      try {
        const gcData = get.gc(chat.id),
              w = gcData?.filter?.welcome,
              txt = w?.welcomeText?.trim() || 'halo selamat datang',
              wlcOn = w?.welcomeGc === true;

        if (!chat.group || !gcData || !wlcOn) {
          return sock.sendMessage(chat.id, { text: !chat.group ? 'perintah ini hanya bisa dijalankan digrup' : !gcData ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar` : `fitur welcome off ketik ${prefix}welcome on untuk mengaktifkan` }, { quoted: m })
        }

        await sock.sendMessage(chat.id, { text: txt }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

ev.on({
  name: 'join gc',
  cmd: ['join', 'masuk', 'joingc'],
  tags: 'Group Menu',
  desc: 'memasukkan bot ke grup dengan link',
  owner: !1,
  prefix: !0,
  money: 1500,
  exp: 0.1,

  run: async (sock, m, {
    chat,
    args,
    cmd
  }) => {
    try {
      const txt = chat.quoted.txt || args.join(' '),
            match = txt.match(/https?:\/\/[^\s]+/gi),
            link = match ? match[0] : null

      console.log('DEBUG: txt ->', txt)
      console.log('DEBUG: match ->', match)
      console.log('DEBUG: link ->', link)

      if (!link || !/chat\.whatsapp\.com/i.test(link)) {
        console.log('DEBUG: invalid link')
        return sock.sendMessage(chat.id, { text: !link ? 'link grup nya mana?' : 'link tidak valid' }, { quoted: m })
      }

      console.log('DEBUG: processing invite...')

      const code = link.split('/').pop().split('?')[0]
      
      console.log('DEBUG: code ->', code)
      
      const res = await sock.groupAcceptInvite(code)

      console.log('DEBUG: res ->', res)

      const text = isJidGroup(res) 
        ? `Berhasil masuk ke grup dengan ID: ${res}` 
        : 'Undangan diterima, menunggu persetujuan admin'

      console.log('DEBUG: final text ->', text)

      await sock.sendMessage(chat.id, { text }, { quoted: m })
    } catch (e) {
      console.log('DEBUG ERROR:', e)
      err(`error pada ${cmd}`, e)
      call(sock, e, m)
    }
  }
})

  ev.on({
    name: 'kick',
    cmd: ['kick', 'dor'],
    tags: 'Group Menu',
    desc: 'mengeluarkan orang dari grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa dijalankan di grup' }, { quoted: m })

        const { botAdm, usrAdm, adm } = await grupify(sock, m),
              target = chat.quoted.id?.[0]

        if (!usrAdm || !botAdm || !target || adm.includes(target)) {
          const txt = !usrAdm ? 'kamu bukan admin'
                    : !botAdm ? 'aku bukan admin'
                    : !target ? 'reply/tag orang yang akan dikeluarkan'
                    : 'tidak bisa mengeluarkan admin'
          return sock.sendMessage(chat.id, { text: txt }, { quoted: m })
        }

        await sock.groupParticipantsUpdate(chat.id, [target], 'remove')
          .catch(() => sock.sendMessage(chat.id, { text: 'gagal mengeluarkan anggota' }, { quoted: m }))
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'left',
    cmd: ['left'],
    ocrs: ['set', 'reset', 'on', 'off'],
    tags: 'Group Menu',
    desc: 'seting left outro',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      ocrs,
      prefix,
      text
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa dijalankan digrup' }, { quoted: m })

        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!gcData || !usrAdm || !botAdm || !ocrs) {
          return sock.sendMessage(chat.id, {
            text: !gcData
              ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar`
              : !usrAdm
              ? 'kamu bukan admin'
              : !botAdm
              ? 'aku bukan admin'
              : `masukan input\ncontoh:\n${prefix}${cmd} on → aktifkan ${cmd}\n${prefix}${cmd} off → nonaktifkan ${cmd}\n${prefix}${cmd} set <text> → setting ${cmd}\n${prefix}${cmd} reset → reset ${cmd}`
          }, { quoted: m })
        }

        gcData.filter.left ??= { leftGc: !1, leftText: '' }

        if (ocrs === 'on' || ocrs === 'off')
          return gcData.filter.left.leftGc = ocrs === 'on',
          save.gc(),
          await sock.sendMessage(chat.id, { text: `${cmd} ${ocrs === 'on' ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: m })

        if (ocrs === 'set') {
          let lftTxt = text.replace(/^[^\s]+\s*left\s+set/i, "").trim() || chat.quoted.txt

          if (!lftTxt) return sock.sendMessage(chat.id, { text: 'masukan/reply pesan selamat tinggalnya' }, { quoted: m })

          gcData.filter.left.leftGc = !0
          gcData.filter.left.leftText = lftTxt
          save.gc()

          return sock.sendMessage(chat.id, { text: `pesan selamat tinggal diperbaharui\n${lftTxt}` }, { quoted: m })
        }

        if (ocrs === 'reset')
          return gcData.filter.left.leftGc = !1,
          gcData.filter.left.leftText = '',
          save.gc(),
          await sock.sendMessage(chat.id, { text: `${cmd} berhasil direset` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'mute',
    cmd: ['mute'],
    tags: 'Group Menu',
    desc: 'setting mute grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const input = args.join(' '),
              gcData = get.gc(chat.id),
              type = v => v ? 'Aktif' : 'Tidak',
              modeMute = type(gcData?.filter?.mute),
              opsi = !!gcData?.filter?.mute,
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!usrAdm || !botAdm || !input || !gcData) {
          return sock.sendMessage(chat.id, { text: !usrAdm ? 'kamu bukan admin' : !botAdm ? 'aku bukan admin' : !input ? `contoh:\n${prefix}${cmd} on/off\n\n${cmd}: ${modeMute}` : `grup ini belum terdaftar, ketik ${prefix}daftargc untuk mendaftar` }, { quoted: m })
        }

        if (!input || !['on', 'off'].includes(input) || (input === 'on' && opsi) || (input === 'off' && !opsi)) {
          return sock.sendMessage(chat.id, { text: !input || !['on', 'off'].includes(input) ? `gunakan:\n ${prefix}${cmd} on/off\n\n${cmd}: ${modeMute}` : `${cmd} sudah ${opsi ? 'Aktif' : 'nonaktif'}` }, { quoted: m })
        }

        gcData.filter.mute = input === 'on'
        save.gc()

        await sock.sendMessage(chat.id, { text: `${cmd} di${input === 'on' ? 'aktifkan' : 'nonaktifkan'}` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'open',
    cmd: ['buka', 'open'],
    tags: 'Group Menu',
    desc: 'membuka grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya untuk grup' }, { quoted: m })

        const { botAdm, usrAdm } = await grupify(sock, m),
              meta = groupCache.get(chat.id) || await sock.groupMetadata(chat.id)

        if (!botAdm || !usrAdm || !meta?.announce) {
          return sock.sendMessage(chat.id, { text: !botAdm ? 'aku bukan admin' : !usrAdm ? 'kamu bukan admin' : 'grup ini sudah dibuka' }, { quoted: m })
        }

        await sock.groupSettingUpdate(chat.id, 'not_announcement');
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'out gc',
    cmd: ['out', 'keluar', 'outgc'],
    tags: 'Group Menu',
    desc: 'mengeluarkan bot dari grup',
    owner: !0,
    prefix: !0,
    money: 50,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      prefix
    }) => {
      try {
        const gc = await sock.groupFetchAllParticipating(),
              gcList = Object.values(gc)

        if (!gcList.length) return sock.sendMessage(chat.id, { text: `Tidak ada grup yang ${botName} masuk` }, { quoted: m })

        if (!args.length) {
          let text = `*Daftar Grup ${botName}:*\n\n`
          gcList.forEach((g, i) => {
            text += `${i + 1}. ${g.subject}\nID: ${g.id}\n\n`
          })
          text += `Ketik: ${prefix}${cmd} <nomor atau id grup>\nContoh:\n${prefix}${cmd} 1\n${prefix}${cmd} 628xxx-xxx@g.us`
          return sock.sendMessage(chat.id, { text }, { quoted: m })
        }

        const input = args[0]
        let target = null

        if (/^\d+$/.test(input)) {
          const i = parseInt(input, 10) - 1
          if (i >= 0 && i < gcList.length) target = gcList[i].id
        } else if (input.endsWith('@g.us')) {
          target = gcList.find(g => g.id === input)?.id
        }

        if (!target || !target.endsWith('@g.us')) return sock.sendMessage(chat.id, { text: !target ? 'Grup tidak ditemukan.' : 'ID grup tidak valid.' }, { quoted: m })

        await sock.groupLeave(target)
        sock.sendMessage(chat.id, { text: `${botName} berhasil keluar dari grup:\n${target}` }, { quoted: m })

      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'promote',
    cmd: ['promote'],
    tags: 'Group Menu',
    desc: 'menjadikan member sebagai admin',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya untuk grup' }, { quoted: m })

        const target = chat.quoted.id?.[0],
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!usrAdm || !botAdm || !target) {
          return sock.sendMessage(chat.id, { text: !usrAdm ? 'kamu bukan admin' : !botAdm ? 'aku bukan admin' : 'reply atau tag nomor yang ingin dijadikan admin' }, { quoted: m })
        }

        await sock.groupParticipantsUpdate(chat.id, [target], 'promote')

        await sock.sendMessage(chat.id, { react: { text: '✅', key: m.key } })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'set pp gc',
    cmd: ['setppgc', 'ppgc'],
    tags: 'Group Menu',
    desc: 'Mengatur foto profil grup',
    owner: !1,
    prefix: !0,
    money: 100,
    exp: 0.1,

    run: async (sock, m, {
      chat,
      cmd,
      prefix
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage,
              img = q?.imageMessage || m.message?.imageMessage,
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!img || !usrAdm || !botAdm) {
          return sock.sendMessage(chat.id, { text: !img ? `reply/kirim gambar dengan caption ${prefix}${cmd}` : !usrAdm ? 'kamu bukan admin' : 'aku bukan admin' }, { quoted: m })
        }

        const media = await downloadMediaMessage({ message: q || m.message }, 'buffer')
        if (!media) throw new Error('Gagal mengunduh media')

        const imgJimp = await jimp.read(media),
              cropped = imgJimp.cover(720, 720).getBufferAsync(jimp.MIME_JPEG)

        await sock.updateProfilePicture(chat.id, await cropped)
        await sock.sendMessage(chat.id, { text: 'foto profile grup berhasil diperbaharui' }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })

  ev.on({
    name: 'welcome',
    cmd: ['welcome'],
    ocrs: ['set', 'reset', 'on', 'off'],
    tags: 'Group Menu',
    desc: 'set welcome grup',
    owner: !1,
    prefix: !0,
    money: 50,
    exp: 0.1,

    run: async (sock, m, {
      args,
      chat,
      cmd,
      ocrs,
      prefix,
      text
    }) => {
      try {
        if (!chat.group) return sock.sendMessage(chat.id, { text: 'perintah ini hanya bisa digunakan digrup' }, { quoted: m })

        const gcData = get.gc(chat.id),
              { usrAdm, botAdm } = await grupify(sock, m)

        if (!gcData || !usrAdm || !botAdm || !ocrs) {
          return sock.sendMessage(chat.id, {
            text: !gcData
              ? `grup ini belum terdaftar ketik ${prefix}daftargc untuk mendaftar`
              : !usrAdm
              ? 'kamu bukan admin'
              : !botAdm
              ? 'aku bukan admin'
              : `masukan input\ncontoh:\n${prefix}${cmd} on → aktifkan ${cmd}\n${prefix}${cmd} off → nonaktifkan ${cmd}\n${prefix}${cmd} set <text> → setting ${cmd}\n${prefix}${cmd} reset → reset ${cmd}`
          }, { quoted: m })
        }

        gcData.filter ??= {}
        gcData.filter.welcome ??= { welcomeGc: !1, welcomeText: '' }

        const wlc = gcData.filter.welcome

        if (ocrs === 'on' || ocrs === 'off')
          return wlc.welcomeGc = ocrs === 'on',
          save.gc(),
          sock.sendMessage(chat.id, { text: `${cmd} ${ocrs === 'on' ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: m })

        if (ocrs === 'set') {
          let wlcTxt = text.replace(/^[^\s]+\s*welcome\s+set/i, "").trim() || chat.quoted.txt

          if (!wlcTxt) return sock.sendMessage(chat.id, { text: 'masukan/reply pesan selamat datangnya' }, { quoted: m })

          wlc.welcomeGc = !0
          wlc.welcomeText = wlcTxt
          save.gc()

          return sock.sendMessage(chat.id, { text: `pesan selamat datang diperbaharui\n${wlcTxt}` }, { quoted: m })
        }
  
        if (ocrs === 'reset')
          return wlc.welcomeGc = !1,
          wlc.welcomeText = '',
          save.gc(),
          sock.sendMessage(chat.id, { text: `${cmd} berhasil direset` }, { quoted: m })
      } catch (e) {
        err(`error pada ${cmd}`, e)
        call(sock, e, m)
      }
    }
  })
}