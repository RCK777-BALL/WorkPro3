import Channel from '../models/Channel';
import ChatMessage from '../models/ChatMessage';

// Channel controllers
export const getChannels: AuthedRequestHandler = async (
  req: AuthedRequest,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const channels = await Channel.find({
      tenantId,
      isDirect: false,
      members: userId,
    }).sort({ name: 1 });
    return res.json(channels);
  } catch (err) {
    return next(err);
  }
};

export const createChannel: AuthedRequestHandler<unknown, any, { name: string; description?: string; members?: string[] }> = async (
  req: AuthedRequest<unknown, any, { name: string; description?: string; members?: string[] }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const { name, description, members = [] } = req.body;
    const channel = await Channel.create({
      name,
      description,
      members: Array.from(new Set([userId, ...members])),
      createdBy: userId,
      tenantId,
      isDirect: false,
    });
    return res.status(201).json(channel);
  } catch (err) {
    return next(err);
  }
};

export const updateChannel: AuthedRequestHandler<{ channelId: string }, any, { name?: string; description?: string; members?: string[] }> = async (
  req: AuthedRequest<{ channelId: string }, any, { name?: string; description?: string; members?: string[] }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const { name, description, members } = req.body;
    const update: Partial<{ name: string; description?: string; members?: string[] }> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (members !== undefined) update.members = members;
    const channel = await Channel.findOneAndUpdate(
      {
        _id: req.params.channelId,
        tenantId,
        isDirect: false,
        members: userId,
      },
      update,
      { new: true }
    );
    if (!channel) return res.status(404).end();
    return res.json(channel);
  } catch (err) {
    return next(err);
  }
};

export const deleteChannel: AuthedRequestHandler<{ channelId: string }> = async (
  req: AuthedRequest<{ channelId: string }>,
  res,
  next
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    await Channel.findOneAndDelete({
      _id: req.params.channelId,
      tenantId,
      isDirect: false,
    });
    await ChatMessage.deleteMany({ channelId: req.params.channelId });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
};

export const getChannelMessages: AuthedRequestHandler<{ channelId: string }> = async (
  req: AuthedRequest<{ channelId: string }>,
  res,
  next
) => {
  try {
    const messages = await ChatMessage.find({ channelId: req.params.channelId }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (err) {
    return next(err);
  }
};

export const sendChannelMessage: AuthedRequestHandler<{ channelId: string }, any, { content: string }> = async (
  req: AuthedRequest<{ channelId: string }, any, { content: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const { content } = req.body;
    const message = await ChatMessage.create({
      channelId: req.params.channelId,
      sender: userId,
      content,
    });
    return res.status(201).json(message);
  } catch (err) {
    return next(err);
  }
};

// Message controllers shared between channel and direct messages
export const updateMessage: AuthedRequestHandler<{ channelId: string; messageId: string }, any, { content: string }> = async (
  req: AuthedRequest<{ channelId: string; messageId: string }, any, { content: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const message = await ChatMessage.findOneAndUpdate(
      { _id: req.params.messageId, sender: userId },
      { content: req.body.content, updatedAt: new Date() },
      { new: true }
    );
    if (!message) return res.status(404).end();
    return res.json(message);
  } catch (err) {
    return next(err);
  }
};

export const deleteMessage: AuthedRequestHandler<{ channelId: string; messageId: string }> = async (
  req: AuthedRequest<{ channelId: string; messageId: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    await ChatMessage.findOneAndDelete({ _id: req.params.messageId, sender: userId });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
};

// Direct message controllers
export const getDirectMessages: AuthedRequestHandler = async (
  req: AuthedRequest,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const channels = await Channel.find({
      tenantId,
      isDirect: true,
      members: userId,
    });
    return res.json(channels);
  } catch (err) {
    return next(err);
  }
};

export const createDirectMessage: AuthedRequestHandler<unknown, any, { userId: string }> = async (
  req: AuthedRequest<unknown, any, { userId: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const otherId = req.body.userId;
    const members = [userId, otherId];
    const existing = await Channel.findOne({
      tenantId,
      isDirect: true,
      members: { $all: members },
    });
    if (existing) return res.json(existing);
    const channel = await Channel.create({
      name: '',
      isDirect: true,
      members,
      createdBy: userId!,
      tenantId,
    });
    return res.status(201).json(channel);
  } catch (err) {
    return next(err);
  }
};

export const deleteDirectMessage: AuthedRequestHandler<{ conversationId: string }> = async (
  req: AuthedRequest<{ conversationId: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    await Channel.findOneAndDelete({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    await ChatMessage.deleteMany({ channelId: req.params.conversationId });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
};

export const getDirectMessagesForUser: AuthedRequestHandler<{ conversationId: string }> = async (
  req: AuthedRequest<{ conversationId: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const channel = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) return res.status(404).end();
    const messages = await ChatMessage.find({ channelId: channel._id }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (err) {
    return next(err);
  }
};

export const sendDirectMessage: AuthedRequestHandler<{ conversationId: string }, any, { content: string }> = async (
  req: AuthedRequest<{ conversationId: string }, any, { content: string }>,
  res,
  next
) => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const channel = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) return res.status(404).end();
    const message = await ChatMessage.create({
      channelId: channel._id,
      sender: userId!,
      content: req.body.content,
    });
    return res.status(201).json(message);
  } catch (err) {
    return next(err);
  }
};
