import mongoose from "mongoose";

const selectedItemSchema = new mongoose.Schema({
  name: {
    en: { type: String },
    ar: { type: String }
  },
  quantity: { type: Number },
  price: { type: Number },
  image: { type: String },
});

const categorySchema = new mongoose.Schema({
  category: { type: String },
  selectedItems: [selectedItemSchema], // items chosen in this category
});

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  displayName: { type: String }, // ✅ NEW FIELD for readable meal summary
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, required: true },
  selectedCategories: [categorySchema], // 👈 new field for meal combos
});

const orderSchema = new mongoose.Schema({
  // Customer
  name: {type: String,  required: true,  },
  email: {type: String, required: true,  },
  mobile: {type: String, required: true,  },

  // Products
  items: [orderItemSchema],

  // Pricing
  subtotal: {type: Number, required: true,  },
  deliveryFee: {type: Number,  default: 0,  },
  totalPrice: {type: Number,   required: true,  },

  // Delivery
  deliveryMethod: {type: String,  enum: ["delivery", "pickup"],    required: true,  },
  deliveryZone: {type: String,  },
  address: {type: String,  },
  deliveryInstructions: {type: String,  },

  // Payment
  paymentMethod: {type: String,  enum: ["online", "cash_on_delivery", "card_on_delivery",   ],  required: true,  },
  paymentStatus: {type: String,  enum: ["pending", "paid", "failed",  "cancelled",    ],    default: "pending",  },

  // Order status
  orderStatus: {type: String, enum: ["Pending", "Confirmed", "Preparing", "Ready", "OutForDelivery", "Completed", "Cancelled", ], default: "Pending", },

  // Paymob
  paymentIntentId: {type: String, default: null,  },
  paymobOrderId: {type: String, default: null,  },

  createdAt: {type: Date, default: Date.now,  },
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
