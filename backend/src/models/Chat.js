import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
      default: ''
    },
    isGroupChat: {
      type: Boolean,
      default: false
    },
    users: [
      {
        type: String
      }
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    groupAdmin: {
      type: String
    },
    groupDescription: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

chatSchema.index({ users: 1 });
chatSchema.index({ updatedAt: -1 });

export default mongoose.model('Chat', chatSchema);
