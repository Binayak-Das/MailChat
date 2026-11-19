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

const emailSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true,
      trim: true
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientName: {
      type: String,
      required: true,
      trim: true
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true
    },
    snippet: {
      type: String,
      default: ''
    },
    attachments: [attachmentSchema],
    category: {
      type: String,
      default: 'Direct Mail'
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      index: true
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email'
    },
    isStarredBySender: {
      type: Boolean,
      default: false
    },
    isStarredByRecipient: {
      type: Boolean,
      default: false
    },
    isRead: {
      type: Boolean,
      default: false
    },
    deletedByRecipient: {
      type: Boolean,
      default: false
    },
    permanentlyDeletedByRecipient: {
      type: Boolean,
      default: false
    },

    deletedBySender: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

emailSchema.index({ sender: 1, createdAt: -1 });
emailSchema.index({ recipient: 1, createdAt: -1 });
emailSchema.index({ recipientEmail: 1 });
emailSchema.index({ senderEmail: 1 });
emailSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model('Email', emailSchema);
