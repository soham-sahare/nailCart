import mongoose from 'mongoose';

const LedgerSchema = new mongoose.Schema({
  partyName: {
    type: String,
    required: [true, 'Please provide a party name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['PAYABLE', 'RECEIVABLE'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'CLEARED'],
    default: 'PENDING',
  },
  dueDate: {
    type: Date,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'CASH', 'SPLIT'],
    default: 'UPI'
  },
  upiAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Indexes for Filtering
LedgerSchema.index({ status: 1 });
LedgerSchema.index({ type: 1 });
LedgerSchema.index({ partyName: 1 });

// Prevent Mongoose Recompilation Error
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Ledger) {
      delete mongoose.models.Ledger;
    }
}

export default mongoose.models.Ledger || mongoose.model('Ledger', LedgerSchema);
