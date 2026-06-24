'use strict';
const Chat     = require('../models/Chat');
const aiChat   = require('../services/aiChatService');
const logger   = require('../utils/logger');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, chatId } = req.body;
    const aiResponse = aiChat.generateResponse(message, { userName: req.user.name });
    const topic = aiChat.classifyTopic(message);
    let chat = chatId ? await Chat.findOne({ _id: chatId, user: req.user._id }) : null;
    if (!chat) {
      chat = new Chat({
        user: req.user._id,
        sessionTitle: message.substring(0, 50) + (message.length > 50 ? '…' : ''),
        tags: [topic], messages: [],
      });
    }
    chat.messages.push({ role: 'user', content: message });
    chat.messages.push({ role: 'assistant', content: aiResponse });
    if (chat.messages.length > 100) chat.messages = chat.messages.slice(-100);
    await chat.save();
    logger.info(`[CHAT] user:${req.user.email} topic:${topic}`);
    res.json({ success: true, response: aiResponse, chatId: chat._id, topic, timestamp: new Date() });
  } catch (err) { next(err); }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: req.user._id, isActive: true })
      .sort({ updatedAt: -1 }).limit(30)
      .select('sessionTitle tags updatedAt createdAt');
    res.json({ success: true, chats });
  } catch (err) { next(err); }
};

exports.getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, chat });
  } catch (err) { next(err); }
};

exports.deleteChat = async (req, res, next) => {
  try {
    await Chat.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) { next(err); }
};

exports.clearAllChats = async (req, res, next) => {
  try {
    await Chat.updateMany({ user: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'All chats cleared' });
  } catch (err) { next(err); }
};
