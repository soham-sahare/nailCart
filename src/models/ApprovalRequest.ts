import mongoose from 'mongoose';

const ApprovalRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  model: {
    type: String,
    enum: ['PRODUCT', 'CATEGORY'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // The actual data to be saved (product/category details)
    default: {}
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId, // ID of the product/category being edited/deleted
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  requestedBy: {
    type: String, // Username or ID string
    required: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for Dashboard performance
ApprovalRequestSchema.index({ status: 1 });
ApprovalRequestSchema.index({ model: 1 });
ApprovalRequestSchema.index({ type: 1 });
// Compound index for fetching pending requests sorted by date
ApprovalRequestSchema.index({ status: 1, createdAt: 1 });

// Prevent Mongoose Recompilation
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.ApprovalRequest) {
      delete mongoose.models.ApprovalRequest;
    }
}

export default mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', ApprovalRequestSchema);
