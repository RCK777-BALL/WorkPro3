// Stubbed Chat controller with clean, single export block.
// Each handler currently returns 501 Not Implemented to keep builds stable.

// controller methods
async function uploadChatAttachment(_req, res) {
  return notImplemented(res, 'uploadChatAttachment');
}

async function getChannels(_req, res) {
  return notImplemented(res, 'getChannels');
}

async function createChannel(_req, res) {
  return notImplemented(res, 'createChannel');
}

async function updateChannel(_req, res) {
  return notImplemented(res, 'updateChannel');
}

async function deleteChannel(_req, res) {
  return notImplemented(res, 'deleteChannel');
}

async function getChannelMessages(_req, res) {
  return notImplemented(res, 'getChannelMessages');
}

async function sendChannelMessage(_req, res) {
  return notImplemented(res, 'sendChannelMessage');
}

async function markChannelRead(_req, res) {
  return notImplemented(res, 'markChannelRead');
}

async function updateMessage(_req, res) {
  return notImplemented(res, 'updateMessage');
}

async function deleteMessage(_req, res) {
  return notImplemented(res, 'deleteMessage');
}

async function getDirectMessages(_req, res) {
  return notImplemented(res, 'getDirectMessages');
}

async function createDirectMessage(_req, res) {
  return notImplemented(res, 'createDirectMessage');
}

async function deleteDirectMessage(_req, res) {
  return notImplemented(res, 'deleteDirectMessage');
}

async function getDirectMessagesForUser(_req, res) {
  return notImplemented(res, 'getDirectMessagesForUser');
}

async function sendDirectMessage(_req, res) {
  return notImplemented(res, 'sendDirectMessage');
}

async function markDirectConversationRead(_req, res) {
  return notImplemented(res, 'markDirectConversationRead');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
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
