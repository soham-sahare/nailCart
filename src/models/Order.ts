import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  customerName: {
    type: String,
    required: [true, 'Please provide a customer name'],
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please provide mobile number'],
  },
  items: [
    {
      productName: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      costPrice: { type: Number }, // Added for Profit Calculation (Snapshot)
      sku: { type: String },     // Added for Invoice
      category: { type: String }, // Added for Invoice
      mrp: { type: Number }      // Added for MRP Display
    }
  ],
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  courierFees: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'CASH', 'SPLIT'],
    default: 'CASH'
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
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'RETURNED', 'CANCELLED', 'REFUNDED'],
    default: 'COMPLETED',
  },
  balance: {
      type: Number,
      default: 0,
      min: 0
  },
  isLedger: {
      type: Boolean,
      default: false
  },
  type: {
      type: String,
      enum: ['SALE', 'RETURN'], // New field to distinguish Sales vs Returns
      default: 'SALE'
  },
  createdBy: {
      type: String,
      default: 'System'
  },
  originalOrderId: {
      type: String, // ID of the original order if this is a return
  },
  hasReturn: {
      type: Boolean,
      default: false
  },
  returnType: {
    type: String,
    enum: ['RESTOCK', 'REFUND_ONLY'],
  },
}, { timestamps: true });

// Indexes for Performance
OrderSchema.index({ createdAt: -1 });
// OrderSchema.index({ orderId: 1 }); // Removed: 'unique: true' already creates this index
OrderSchema.index({ 'items.productName': 1 }); // For Top Products aggregation
OrderSchema.index({ status: 1 });
OrderSchema.index({ customerName: 1 });
OrderSchema.index({ mobileNumber: 1 });
OrderSchema.index({ type: 1 });

// User Request Item 13 & 21: Compound & Partial Index for Analytics
// This index specifically targets the main dashboard filter: Active Sales
OrderSchema.index(
    { createdAt: -1 }, 
    { 
        partialFilterExpression: { 
            status: { $ne: 'CANCELLED' }, 
            type: 'SALE' 
        },
        name: 'idx_analytics_active_sales'
    }
);
OrderSchema.index({ status: 1, type: 1, createdAt: -1 }); // Fallback compound index

// Prevent Mongoose Recompilation Error in Development
if (process.env.NODE_ENV === 'development') {
  if (mongoose.models.Order) {
    delete mongoose.models.Order;
  }
}

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
