const axios = require('axios');

async function postToTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram not configured');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: false
  });

  return {
    status: 'ok',
    messageId: response.data.result.message_id,
    chatId: chatId
  };
}

module.exports = { postToTelegram };
