/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyChatRoutes from "./ChatRoutesLegacy";
import { requireAuth } from "../middleware/authMiddleware";
import {
  listChannels,
  createChannel,
  updateChannel,
  archiveChannel,
  getChannel,
} from "../controllers/chat/channelV2Controller";
import {
  listMessages,
  createMessage,
  reactToMessage,
  removeReaction,
  markMessageRead,
} from "../controllers/chat/messageV2Controller";
import { handleChatUpload } from "../controllers/chat/uploadController";

const router = Router();

router.use(requireAuth);

router.get("/channels", listChannels);
router.post("/channels", createChannel);
router.get("/channels/:channelId", getChannel);
router.patch("/channels/:channelId", updateChannel);
router.post("/channels/:channelId/archive", archiveChannel);

router.get("/messages", listMessages);
router.post("/messages", createMessage);
router.post("/messages/:messageId/reactions", reactToMessage);
router.delete("/messages/:messageId/reactions", removeReaction);
router.post("/messages/:messageId/read", markMessageRead);

router.post("/upload", handleChatUpload);

router.use("/legacy", legacyChatRoutes);

export default router;
