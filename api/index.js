export default async function handler(req, res) {
  // Отвечаем только на POST-запросы от Telegram
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const token = (process.env.BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  console.log('token len:', token.length, 'start:', token.slice(0, 11), 'has bot prefix:', token.startsWith('bot'));
  const apiUrl = `https://api.telegram.org/bot${token}/`;
  const update = req.body;
  console.log('token set:', !!token, 'update:', JSON.stringify(update));

  // 1. ОБРАБОТКА ВХОДЯЩЕГО СООБЩЕНИЯ
  if (update && update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;
    const rawText = update.message.text;

    // Удаляем исходное сообщение пользователя
    const delRes = await fetch(apiUrl + 'deleteMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
    console.log('deleteMessage:', delRes.status, await delRes.text());

    // Экранируем спецсимволы HTML
    const safeText = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Добавляем пробел и точку в конец текста
    const finalText = `${safeText} .`;

    // Отправляем моноширинный текст с кнопкой "смыть"
    await fetch(apiUrl + 'sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `<code>${finalText}</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'смыть', callback_data: 'delete_msg' }]
          ]
        }
      })
    });
  }

  // 2. ОБРАБОТКА НАЖАТИЯ НА КНОПКУ "СМЫТЬ"
  if (update && update.callback_query && update.callback_query.data === 'delete_msg') {
    const queryId = update.callback_query.id;
    const chatId = update.callback_query.message.chat.id;
    const messageId = update.callback_query.message.message_id;

    // Удаляем сообщение бота
    await fetch(apiUrl + 'deleteMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });

    // Гасим спиннер загрузки на кнопке
    await fetch(apiUrl + 'answerCallbackQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: queryId })
    });
  }

  return res.status(200).send('OK');
} 