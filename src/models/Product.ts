import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    // required: [true, 'Please provide a SKU'], // Made optional
    // unique: true, // Removed in favor of compound index (sku + name)
  },
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category'],
  },
  costPrice: {
    type: Number,
    required: [true, 'Please provide cost price'],
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please provide selling price'],
    min: 0,
  },
  mrp: {
    type: Number,
    min: 0,
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: 0,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
}, { timestamps: true });

// Methods/Indexes
// User Request Item 20: Text Index for efficient search
ProductSchema.index({ name: 'text', sku: 'text' }); 
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ sku: 1, name: 1 }, { unique: true }); // Compound Unique Key

// Prevent Mongoose Recompilation Error
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Product) {
      delete mongoose.models.Product;
    }
}

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
