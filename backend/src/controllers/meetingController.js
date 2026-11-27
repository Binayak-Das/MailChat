import Meeting from '../models/Meeting.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { getUserById, hydrateMessages } from '../utils/userStore.js';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export const getIceServers = async (req, res) => {
  try {
    const iceServers = [...DEFAULT_ICE_SERVERS];

    if (process.env.TURN_URLS || process.env.TURN_URL) {
      const urlsRaw = process.env.TURN_URLS || process.env.TURN_URL;
      const urls = urlsRaw.split(',').map((u) => u.trim()).filter(Boolean);
      if (urls.length > 0) {
        iceServers.push({
          urls,
          ...(process.env.TURN_USERNAME ? { username: process.env.TURN_USERNAME } : {}),
          ...(process.env.TURN_CREDENTIAL ? { credential: process.env.TURN_CREDENTIAL } : {})
        });
      }
    } else if (process.env.METERED_DOMAIN && process.env.METERED_API_KEY) {
      try {
        const resp = await fetch(
          `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
        );
        if (resp.ok) {
          const turnServers = await resp.json();
          if (Array.isArray(turnServers)) {
            iceServers.push(...turnServers);
          }
        }
      } catch {
        // Fallback gracefully to STUN
      }
    }

    return res.status(200).json({
      success: true,
      iceServers
    });
  } catch {
    return res.status(200).json({
      success: true,
      iceServers: DEFAULT_ICE_SERVERS
    });
  }
};

const generateCodeSegment = (len) => {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

const generateUniqueMeetingCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${generateCodeSegment(3)}-${generateCodeSegment(4)}-${generateCodeSegment(3)}`;
    const existing = await Meeting.findOne({ meetingCode: code }).select('_id');
    if (!existing) return code;
  }
  return `${generateCodeSegment(3)}-${Date.now().toString(36).slice(-4)}-${generateCodeSegment(3)}`;
};

export const createMeeting = async (req, res) => {
  try {
    const { title, scheduledAt, waitingRoomEnabled, allowScreenShare, allowChat } = req.body || {};
    const meetingCode = await generateUniqueMeetingCode();

    const meeting = await Meeting.create({
      meetingCode,
      title: title?.trim() || `${req.user.name || 'MailChat'}'s Meeting`,
      hostId: req.user._id.toString(),
      hostName: req.user.name || 'Host',
      hostEmail: req.user.email || '',
      status: scheduledAt ? 'waiting' : 'active',
      waitingRoomEnabled: Boolean(waitingRoomEnabled),
      allowScreenShare: allowScreenShare !== undefined ? Boolean(allowScreenShare) : true,
      allowChat: allowChat !== undefined ? Boolean(allowChat) : true,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      startedAt: scheduledAt ? null : new Date(),
      participants: [
        {
          userId: req.user._id.toString(),
          name: req.user.name || 'Host',
          email: req.user.email || '',
          avatar: req.user.avatar || '',
          role: 'host',
          joinedAt: new Date()
        }
      ]
    });

    return res.status(201).json({
      success: true,
      meeting
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create meeting'
    });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const meetings = await Meeting.find({
      $or: [
        { hostId: userId },
        { 'participants.userId': userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('-chatMessages');

    const activeMeetingsMap = req.app.get('activeMeetings');
    const enriched = meetings.map((m) => {
      const obj = m.toObject();
      const liveRoom = activeMeetingsMap?.get(obj.meetingCode);
      obj.liveParticipantCount = liveRoom ? liveRoom.participants.size : 0;
      return obj;
    });

    return res.status(200).json({
      success: true,
      meetings: enriched
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load meetings'
    });
  }
};

export const getMeetingByCode = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toLowerCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Meeting code is required' });
    }

    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found. Check the code and try again.' });
    }

    const activeMeetingsMap = req.app.get('activeMeetings');
    const liveRoom = activeMeetingsMap?.get(code);
    const obj = meeting.toObject();
    obj.liveParticipantCount = liveRoom ? liveRoom.participants.size : 0;

    return res.status(200).json({
      success: true,
      meeting: obj
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch meeting details'
    });
  }
};

export const updateMeetingSettings = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toLowerCase();
    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.hostId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can update meeting settings' });
    }

    const { isLocked, waitingRoomEnabled, allowScreenShare, allowChat, title } = req.body || {};
    if (typeof isLocked === 'boolean') meeting.isLocked = isLocked;
    if (typeof waitingRoomEnabled === 'boolean') meeting.waitingRoomEnabled = waitingRoomEnabled;
    if (typeof allowScreenShare === 'boolean') meeting.allowScreenShare = allowScreenShare;
    if (typeof allowChat === 'boolean') meeting.allowChat = allowChat;
    if (typeof title === 'string' && title.trim()) meeting.title = title.trim();

    await meeting.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`meet:${code}`).emit('meet:settings-updated', {
        meetingCode: code,
        isLocked: meeting.isLocked,
        waitingRoomEnabled: meeting.waitingRoomEnabled,
        allowScreenShare: meeting.allowScreenShare,
        allowChat: meeting.allowChat,
        title: meeting.title
      });
    }

    return res.status(200).json({
      success: true,
      meeting
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update meeting settings'
    });
  }
};

export const endMeeting = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toLowerCase();
    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.hostId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can end the meeting' });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    const io = req.app.get('io');
    const activeMeetingsMap = req.app.get('activeMeetings');
    if (activeMeetingsMap) {
      activeMeetingsMap.delete(code);
    }
    if (io) {
      io.to(`meet:${code}`).emit('meet:ended', {
        meetingCode: code,
        endedBy: req.user.name || 'Host'
      });
    }

    return res.status(200).json({
      success: true,
      meeting
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to end meeting'
    });
  }
};

export const shareMeetingToChats = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toLowerCase();
    const { chatIds, customMessage, meetingUrl } = req.body || {};

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one chat or group to share the meeting link'
      });
    }

    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const senderIdStr = req.user._id.toString();
    const onlineMap = req.app.get('onlineUsers');
    const io = req.app.get('io');

    const resolvedUrl = meetingUrl || `/meet/${meeting.meetingCode}`;
    const textContent = customMessage?.trim()
      ? `${customMessage.trim()}\nJoin MailChat Meet: ${resolvedUrl}`
      : `📹 Join MailChat Meet: ${meeting.title} (${resolvedUrl})`;

    const sentMessages = [];

    for (const chatId of chatIds) {
      const chat = await Chat.findById(chatId);
      if (!chat) continue;

      const isMember = chat.users.some((u) => u.toString() === senderIdStr);
      if (!isMember) continue;

      if (!chat.isGroupChat) {
        const partnerId = chat.users.find((u) => u.toString() !== senderIdStr);
        if (partnerId) {
          const currentUser = await getUserById(req.user._id, req.firebaseToken);
          const partnerUser = await getUserById(partnerId, req.firebaseToken);
          const hasBlocked = currentUser?.blockedUsers?.some((b) => b.toString() === partnerId.toString());
          const isBlocked = partnerUser?.blockedUsers?.some((b) => b.toString() === senderIdStr);
          if (hasBlocked || isBlocked) continue;
        }
      }

      const initialDelivered = [senderIdStr];
      if (onlineMap && chat.users) {
        chat.users.forEach((uid) => {
          const idStr = uid.toString();
          if (idStr !== senderIdStr && onlineMap.has(idStr)) {
            initialDelivered.push(uid);
          }
        });
      }

      const createdMsg = await Message.create({
        sender: senderIdStr,
        content: textContent,
        attachments: [],
        chat: chat._id,
        readBy: [senderIdStr],
        deliveredTo: initialDelivered,
        meetingInvite: {
          meetingCode: meeting.meetingCode,
          title: meeting.title,
          hostName: meeting.hostName,
          meetingUrl: resolvedUrl,
          scheduledAt: meeting.scheduledAt || null
        }
      });

      chat.latestMessage = createdMsg._id;
      await chat.save();

      if (!meeting.sharedChatIds.includes(chat._id.toString())) {
        meeting.sharedChatIds.push(chat._id.toString());
      }

      const rawMessage = await Message.findById(createdMsg._id).populate({ path: 'chat' });
      const fullMessage = await hydrateMessages(rawMessage, req.firebaseToken);
      sentMessages.push(fullMessage);

      if (io && fullMessage.chat) {
        const chatIdStr = chat._id.toString();
        fullMessage.chat.users?.forEach((u) => {
          const uid = (u._id || u.id || u)?.toString();
          if (uid) {
            io.in(uid).socketsJoin(chatIdStr);
            if (uid !== senderIdStr) {
              io.to(uid).emit('message_received', fullMessage);
              io.to(uid).emit('chat_activity', {
                chatId: chatIdStr,
                chat: fullMessage.chat,
                message: fullMessage
              });
            }
          }
        });
        io.to(chatIdStr).emit('chat_updated', fullMessage.chat);
      }
    }

    await meeting.save();

    return res.status(200).json({
      success: true,
      sharedCount: sentMessages.length,
      messages: sentMessages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to share meeting link'
    });
  }
};
