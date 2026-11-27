import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  data: {
    type: String,
    required: true
  }
});

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    attachments: [attachmentSchema],
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true
    },
    readBy: [
      {
        type: String
      }
    ],
    deliveredTo: [
      {
        type: String
      }
    ],
    reactions: [
      {
        user: {
          type: String
        },
        emoji: {
          type: String,
          trim: true
        }
      }
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    isForwarded: {
      type: Boolean,
      default: false
    },
    meetingInvite: {
      meetingCode: { type: String, trim: true },
      title: { type: String, trim: true },
      hostName: { type: String, trim: true },
      meetingUrl: { type: String, trim: true },
      scheduledAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ chat: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
