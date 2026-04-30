import c from 'chalk'
import { jidNormalizedUser } from 'baileys'

export const handleStatus = async (sock, m) => {

  if (m.key.fromMe) return true;
  if (m.key.remoteJid !== 'status@broadcast') return false;

  const reactCfg = global.statusReact,
        autoReadStory = global.statusAutoread,
        chat = global.chat(m)

  if (autoReadStory) {
      await sock.readMessages([m.key]).catch(() => {});
      
      let typ = m.message ? Object.keys(m.message).find(k => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage') : '';
      console.log(
        /protocolMessage/i.test(typ)
          ? c.yellowBright(`${chat.pushName} Deleted story❗`)
          : c.greenBright('View user stories : ' + chat.pushName)
      );
    }

  if (reactCfg?.on) {
    let emojis = reactCfg.emojis || ["😍", "😂", "😬", "🤢", "🤮", "🥰", "😭"];
    let randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]; 

    await sock.sendMessage(
      'status@broadcast',
      {react: { key: m.key, text: randomEmoji }},
      {statusJidList: [jidNormalizedUser(sock.user.id), jidNormalizedUser(chat.id)]}
    );
  }

  return true;
}