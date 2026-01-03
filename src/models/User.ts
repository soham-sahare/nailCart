import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  role: {
    type: String,
    enum: ['OWNER', 'STAFF'],
    default: 'STAFF'
  }
}, { timestamps: true });

// Prevent Mongoose Recompilation Error
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
}

export default mongoose.models.User || mongoose.model('User', UserSchema);
