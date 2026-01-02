import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

// Prevent Mongoose Recompilation Error
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Contact) {
      delete mongoose.models.Contact;
    }
}

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
