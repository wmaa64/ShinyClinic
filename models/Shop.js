import mongoose from 'mongoose';

const shopSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', require: true }, //userId is the Owner of the Shop
  }
);

const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
export default Shop;
