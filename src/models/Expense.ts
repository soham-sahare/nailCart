import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an expense title'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: 0,
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Utilities', 'Transport', 'Restock', 'Salaries', 'Rent', 'Maintenance', 'Marketing', 'Courier', 'Porter', 'Daily Collection', 'Misc'],
    default: 'Misc'
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
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

// Indexes for Reporting
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1 });
// Partial Index for recent expenses (optimizes dashboard 'this month' queries)
ExpenseSchema.index(
    { date: -1 }, 
    { 
        partialFilterExpression: { 
            date: { $gte: new Date('2025-01-01') } 
        },
        name: 'idx_expenses_recent'
    }
);

// Prevent Mongoose Recompilation Error
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Expense) {
      delete mongoose.models.Expense;
    }
}

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
