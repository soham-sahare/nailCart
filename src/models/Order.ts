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
      category: { type: String } // Added for Invoice
    }
  ],
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'RETURNED', 'CANCELLED'],
    default: 'COMPLETED',
  },
  type: {
      type: String,
      enum: ['SALE', 'RETURN'], // New field to distinguish Sales vs Returns
      default: 'SALE'
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
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ customerName: 1 });
OrderSchema.index({ mobileNumber: 1 });
OrderSchema.index({ type: 1 });

// Prevent Mongoose Recompilation Error in Development
if (process.env.NODE_ENV === 'development') {
  if (mongoose.models.Order) {
    delete mongoose.models.Order;
  }
}

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
