import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'Please provide a SKU'],
    unique: true,
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
ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
