import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['email', 'security', 'system', 'role', 'chat', 'group', 'report'],
      default: 'email'
    },
    relatedEmail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email'
    },
    relatedChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    unread: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
