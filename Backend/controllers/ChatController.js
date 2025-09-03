// These controller methods are placeholders. The actual implementations
// will be provided by the application logic. Each handler currently
// returns a 501 Not Implemented response.
// Channel controllers
export const getChannels = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const createChannel = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const deleteChannel = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const getChannelMessages = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const sendChannelMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
// Message controllers shared between channel and direct messages
export const updateMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const deleteMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
// Direct message controllers
export const getDirectMessages = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const createDirectMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const deleteDirectMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const getDirectMessagesForUser = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
export const sendDirectMessage = (_req, res) => {
    res.status(501).json({ message: 'Not implemented' });
};
