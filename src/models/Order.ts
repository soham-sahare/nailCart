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
}, { timestamps: true });

// Prevent Mongoose Recompilation Error in Development
if (process.env.NODE_ENV === 'development') {
  if (mongoose.models.Order) {
    delete mongoose.models.Order;
  }
}

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
