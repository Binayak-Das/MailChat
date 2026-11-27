import mongoose from 'mongoose';

const meetingParticipantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, default: 'Participant' },
    email: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['host', 'cohost', 'participant'], default: 'participant' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date }
  },
  { _id: false }
);

const meetingChatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const meetingPollOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    votes: [{ type: String }]
  },
  { _id: false }
);

const meetingPollSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true, trim: true },
    options: [meetingPollOptionSchema],
    createdBy: { type: String, required: true },
    createdByName: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    title: {
      type: String,
      trim: true,
      default: 'MailChat Meet'
    },
    hostId: {
      type: String,
      required: true
    },
    hostName: {
      type: String,
      default: 'Host'
    },
    hostEmail: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'active'
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    waitingRoomEnabled: {
      type: Boolean,
      default: false
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    participants: [meetingParticipantSchema],
    chatMessages: [meetingChatMessageSchema],
    polls: [meetingPollSchema],
    sharedChatIds: [{ type: String }]
  },
  {
    timestamps: true
  }
);

meetingSchema.index({ hostId: 1, createdAt: -1 });

export default mongoose.model('Meeting', meetingSchema);
