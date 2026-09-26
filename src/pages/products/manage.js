import React, { useEffect, useState } from "react";

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    descEn: "",
    descAr: "",
    price: "",
    image: "",
    subcategoryId: "",
    producttype: "item",
    mealComponents: [],
    overprice: "",
    featured: false,
    topselling: false,
    order: 0,
    active: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch all products and subcategories on mount
  useEffect(() => {
    fetchProducts();
    fetchSubcategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await fetch("/api/subcategories");
      const data = await res.json();
      setSubcategories(data);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  // 🔹 Handle form input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // 🔹 Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET);
    form.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: form }
      );
      const data = await res.json();
      setFormData({ ...formData, image: data.secure_url });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle adding a meal component (for meals only)
  const addMealComponent = () => {
    setFormData({
      ...formData,
      mealComponents: [
        ...formData.mealComponents,
        { category: "main", products: [], quantity: 1, notes: "" },
      ],
    });
  };

  // 🔹 Handle updates to a meal component
  const updateMealComponent = (index, field, value) => {
    const updated = [...formData.mealComponents];
    updated[index][field] = value;
    setFormData({ ...formData, mealComponents: updated });
  };

  // 🔹 Handle selection of referenced products in a meal
  const toggleMealProduct = (index, productId) => {
    const updated = [...formData.mealComponents];
    const selectedProducts = new Set(updated[index].products.map(String));

    if (selectedProducts.has(productId)) {
      updated[index].products = updated[index].products.filter((p) => String(p) !== productId);
    } else {
      updated[index].products.push(productId);
    }

    setFormData({ ...formData, mealComponents: updated });
  };

  // 🔹 Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) return alert("Please upload an image first.");

    const productData = {
      name: { en: formData.nameEn, ar: formData.nameAr },
      description: { en: formData.descEn, ar: formData.descAr },
      price: Number(formData.price),
      image: formData.image,
      subcategoryId: formData.subcategoryId || null,
      producttype: formData.producttype,
      mealComponents:
        formData.producttype === "meal" ? formData.mealComponents : [],
      overprice:
        formData.producttype === "meal" ? Number(formData.overprice) : 0,
      featured: formData.featured,
      topselling: formData.topselling,
      order: Number(formData.order),
      active: formData.active,
    };

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/products/${editingId}` : "/api/products";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    if (res.ok) {
      alert(editingId ? "Product updated!" : "Product added!");
      resetForm();
      fetchProducts();
    } else {
      console.error("Error saving product:", await res.text());
    }
  };

  const resetForm = () => {
    setFormData({
      nameEn: "",
      nameAr: "",
      descEn: "",
      descAr: "",
      price: "",
      image: "",
      subcategoryId: "",
      producttype: "item",
      mealComponents: [],
      overprice: "",
      featured: false,
      topselling: false,
      order: 0,
      active: false,
    });
    setEditingId(null);
  };

  const handleEdit = (p) => {
    setFormData({
      nameEn: p.name.en,
      nameAr: p.name.ar,
      descEn: p.description.en,
      descAr: p.description.ar,
      price: p.price,
      image: p.image,
      subcategoryId: p.subcategoryId?._id || "",
      producttype: p.producttype,
      mealComponents: p.mealComponents || [],
      overprice: p.overprice,
      featured: p.featured,
      topselling: p.topselling,
      order: p.order || 0,
      active: p.active || false,
    });
    setEditingId(p._id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Manage Products</h1>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="form-container">
        <input className="form-field" name="nameEn" placeholder="Name (EN)" value={formData.nameEn} onChange={handleChange} required />
        <input className="form-field" name="nameAr" placeholder="Name (AR)" value={formData.nameAr} onChange={handleChange} required />
        <input className="form-field" name="descEn" placeholder="Description (EN)" value={formData.descEn} onChange={handleChange} />
        <input className="form-field" name="descAr" placeholder="Description (AR)" value={formData.descAr} onChange={handleChange} />
        <input className="form-field" name="price" type="number" placeholder="Price" value={formData.price} onChange={handleChange} required />

        <select className="form-field" name="subcategoryId" value={formData.subcategoryId} onChange={handleChange} required>
          <option value="">Select Subcategory</option>
          {subcategories.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name?.en}
            </option>
          ))}
        </select>

        <select className="form-field" name="producttype" value={formData.producttype} onChange={handleChange}>
          <option value="item">Single Item</option>
          <option value="meal">Meal / Combo</option>
        </select>

        {/* Meal Components Section */}
        {formData.producttype === "meal" && (
          <div className="meal-section">
            <h3>Meal Components</h3>
            {formData.mealComponents.map((comp, i) => (
              <div key={i} style={{ border: "1px solid #ddd", padding: "10px", marginBottom: "8px" }}>
                <select className="form-field"
                  value={comp.category}
                  onChange={(e) => updateMealComponent(i, "category", e.target.value)}
                >
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                  <option value="drink">Drink</option>
                  <option value="extra">Extra</option>
                </select>

                <label> Select Products:</label>
                <div className="product-selection">
                  {products
                    .filter((p) => p.producttype === "item")
                    .map((p) => (
                      <label key={p._id} style={{ display: "block" }}>
                        <input
                          type="checkbox"
                          checked={comp.products.includes(p._id)}
                          onChange={() => toggleMealProduct(i, p._id)}
                        />
                        {p.name.en}
                      </label>
                    ))}
                </div>

                <input className="form-field"
                  type="number"
                  min="1"
                  value={comp.quantity}
                  onChange={(e) => updateMealComponent(i, "quantity", e.target.value)}
                  placeholder="Quantity"
                />
                <input className="form-field"
                  type="text"
                  placeholder="Notes"
                  value={comp.notes}
                  onChange={(e) => updateMealComponent(i, "notes", e.target.value)}
                />
              </div>
            ))}
            <button className="form-field" type="button" onClick={addMealComponent}>
              ➕ Add Component
            </button>
          </div>
        )}

        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {loading ? (
          <p>Uploading image...</p>
        ) : (
          formData.image && <img src={formData.image} alt="Uploaded" width="100" />
        )}

        {formData.producttype === "meal" && (
          <input className="form-field" name="overprice" type="number" placeholder="Over Price" value={formData.overprice} onChange={handleChange} required />
        )}

        <label>
          Featured <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} />
        </label>
        <label>
          Top Selling <input type="checkbox" name="topselling" checked={formData.topselling} onChange={handleChange} />
        </label>
        <label>
          Order: <input type="number" name="order"  placeholder="Order" value={formData.order} onChange={handleChange} />
        </label>

        <label>
          Active <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
        </label>

        <button className="form-field" type="submit">{editingId ? "Update Product" : "Add Product"}</button>
      </form>

      {/* Product List */}
      <div>
        <h2>All Products</h2>
        <div className="images-container-manage">
          {products.map((p) => (
            <div className="image-cart-manage" key={p._id}>
              <img src={p.image} alt={p.name.en} width="100%" />
              <h3>{p.name.en}</h3>
              <p>{p.price} EGP</p>
              <small>{p.producttype === "meal" ? "🥘 Meal Combo" : "🍔 Item"}</small>
              <button onClick={() => handleEdit(p)}>Edit</button>
              <button onClick={() => handleDelete(p._id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;







/*
import React, { useEffect, useState } from "react";

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    descEn: "",
    descAr: "",
    brand: "",
    countInStock: 1,
    price: "",
    image: "",
    subcategoryId: "",
    shopId: "",
    featured: false,
    topselling: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🧩 Fetch products, subcategories, and shops on mount
  useEffect(() => {
    fetchProducts();
    fetchSubcategories();
    fetchShops();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await fetch("/api/subcategories");
      const data = await res.json();
      setSubcategories(data);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      setShops(data);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  // 🧩 Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // 🧩 Handle image upload to Cloudinary
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    //form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET); // Cloudinary preset
    form.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
        {
          method: "POST",
          body: form,
        }
      );
      const data = await res.json();
      setFormData({ ...formData, image: data.secure_url });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) return alert("Please upload an image first.");

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/products/${editingId}` : "/api/products";

    const productData = {
      name: { en: formData.nameEn, ar: formData.nameAr },
      description: { en: formData.descEn, ar: formData.descAr },
      brand: formData.brand,
      countInStock: Number(formData.countInStock),
      price: Number(formData.price),
      image: formData.image,
      subcategoryId: formData.subcategoryId || null,
      shopId: formData.shopId || null,
      featured: formData.featured,
      topselling: formData.topselling,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    if (res.ok) {
      alert(editingId ? "Product updated!" : "Product added!");
      resetForm();
      fetchProducts();
    } else {
      console.error("Error saving product:", await res.text());
    }
  };

  const resetForm = () => {
    setFormData({
      nameEn: "",
      nameAr: "",
      descEn: "",
      descAr: "",
      brand: "",
      countInStock: 1,
      price: "",
      image: "",
      subcategoryId: "",
      shopId: "",
      featured: false,
      topselling: false,
    });
    setEditingId(null);
  };

  // 🧩 Edit product
  const handleEdit = (product) => {
    setFormData({
      nameEn: product.name.en,
      nameAr: product.name.ar,
      descEn: product.description.en,
      descAr: product.description.ar,
      brand: product.brand,
      countInStock: product.countInStock,
      price: product.price,
      image: product.image,
      subcategoryId: product.subcategoryId?._id || "",
      shopId: product.shopId?._id || "",
      featured: product.featured,
      topselling: product.topselling,
    });
    setEditingId(product._id);
  };

  // 🧩 Delete product
  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Manage Products</h1>

      
      <form className="form-container" onSubmit={handleSubmit} >
        <input className="form-field" name="nameEn" placeholder="Name (EN)" value={formData.nameEn} onChange={handleChange} required />
        <input className="form-field" name="nameAr" placeholder="Name (AR)" value={formData.nameAr} onChange={handleChange} required />
        <input className="form-field" name="descEn" placeholder="Description (EN)" value={formData.descEn} onChange={handleChange} />
        <input className="form-field" name="descAr" placeholder="Description (AR)" value={formData.descAr} onChange={handleChange} />
        <input className="form-field" name="brand" placeholder="Brand" value={formData.brand} onChange={handleChange} required />
        <input className="form-field" name="countInStock" type="number" placeholder="Count in stock" value={formData.countInStock} onChange={handleChange} />
        <input className="form-field" name="price" type="number" placeholder="Price" value={formData.price} onChange={handleChange} required />

        
        <select className="form-field" name="subcategoryId" value={formData.subcategoryId} onChange={handleChange} required>
          <option value="">Select Subcategory</option>
          {subcategories.map((sub) => (
            <option key={sub._id} value={sub._id}>
              {sub.name?.en || sub.name}
            </option>
          ))}
        </select>

        
        <select className="form-field" name="shopId" value={formData.shopId} onChange={handleChange} required>
          <option value="">Select Shop</option>
          {shops.map((shop) => (
            <option key={shop._id} value={shop._id}>
              {shop.name}
            </option>
          ))}
        </select>

        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {loading ? <p>Uploading image...</p> : formData.image && <img src={formData.image} alt="Uploaded" width="100" />}

        <label>
          Featured
          <input className="form-field"  type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} />
        </label>
        <label>
          Top Selling
          <input className="form-field" type="checkbox" name="topselling" checked={formData.topselling} onChange={handleChange} />
        </label>

        <button className="form-field" type="submit">{editingId ? "Update Product" : "Add Product"}</button>
      </form>

      
      <div>
        <h2>All Products</h2>
        <div className="images-container-manage" >
          {products.map((p) => (
            <div className="image-cart-manage" key={p._id} >
              <img src={p.image} alt={p.name.en} width="100%" />
              <h3>{p.name.en}</h3>
              <p>{p.price} EGP</p>
              <button onClick={() => handleEdit(p)}>Edit</button>
              <button onClick={() => handleDelete(p._id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
*/