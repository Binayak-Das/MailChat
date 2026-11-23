import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required for OTP'],
      lowercase: true,
      trim: true,
      index: true
    },
    otp: {
      type: String,
      required: [true, 'OTP code is required']
    },
    purpose: {
      type: String,
      enum: ['password_reset', '2fa_login', '2fa_enable'],
      default: 'password_reset',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  {
    timestamps: true
  }
);

otpSchema.methods.compareOtp = async function (enteredOtp) {
  return await bcrypt.compare(enteredOtp.toString(), this.otp);
};

export default mongoose.model('Otp', otpSchema);
