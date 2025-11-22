// Stubbed Chat controller with clean, single export block.
// Each handler currently returns 501 Not Implemented to keep builds stable.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const uploadChatAttachment = (_req, res) => notImplemented(res, 'uploadChatAttachment');
const getChannels = (_req, res) => notImplemented(res, 'getChannels');
const createChannel = (_req, res) => notImplemented(res, 'createChannel');
const updateChannel = (_req, res) => notImplemented(res, 'updateChannel');
const deleteChannel = (_req, res) => notImplemented(res, 'deleteChannel');
const getChannelMessages = (_req, res) => notImplemented(res, 'getChannelMessages');
const sendChannelMessage = (_req, res) => notImplemented(res, 'sendChannelMessage');
const markChannelRead = (_req, res) => notImplemented(res, 'markChannelRead');
const updateMessage = (_req, res) => notImplemented(res, 'updateMessage');
const deleteMessage = (_req, res) => notImplemented(res, 'deleteMessage');
const getDirectMessages = (_req, res) => notImplemented(res, 'getDirectMessages');
const createDirectMessage = (_req, res) => notImplemented(res, 'createDirectMessage');
const deleteDirectMessage = (_req, res) => notImplemented(res, 'deleteDirectMessage');
const getDirectMessagesForUser = (_req, res) => notImplemented(res, 'getDirectMessagesForUser');
const sendDirectMessage = (_req, res) => notImplemented(res, 'sendDirectMessage');
const markDirectConversationRead = (_req, res) =>
  notImplemented(res, 'markDirectConversationRead');

module.exports = {
  uploadChatAttachment,
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelMessages,
  sendChannelMessage,
  markChannelRead,
  updateMessage,
  deleteMessage,
  getDirectMessages,
  createDirectMessage,
  deleteDirectMessage,
  getDirectMessagesForUser,
  sendDirectMessage,
  markDirectConversationRead,
};
