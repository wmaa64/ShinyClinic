import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: {
        en: {type: String, required: true },
        ar: {type: String, required: true }
    },
    description: {
        en: { type: String },
        ar: { type: String }
    }
});

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

export default Category ;