import React, { useState, useEffect } from "react";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { Product, Info, StarRating } from "../../components";
import { useStateContext } from "../../../context/StateContext";
import {useTranslation} from "react-i18next";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

const toTitleCase = (str) =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const ProductDetails = () => {
  const router = useRouter();
  const { id } = router.query; // get product ID from URL

  const { i18n } = useTranslation();
  const [product, setProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { decQty, incQty, qty, onAdd, setShowCart } = useStateContext();

  const [mounted, setMounted] = useState(false);
     
  useEffect(() => {
        setMounted(true);
    }, []);
  
  useEffect(() => {
    if (!id) return; // Wait until router is ready

    const fetchData = async () => {
      try {
        const [productRes, productsRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch(`/api/products/Add-ons`),
        ]);

        const productData = await productRes.json();
        const productsData = await productsRes.json();
      
          // 🔹 Redirect meals to /meal/[id]
        if (productData.producttype === "meal") {
          router.replace(`/meal/${id}`);
          return;
        }

        setProduct(productData);
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (!mounted) return null; // 🔥 prevents hydration error

  const isRTL = i18n.language === "ar"; // true if Arabic

  if (loading) return <p>Loading product details...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <>
      <NextSeo title={`${toTitleCase(product.name.en)} - Munchix Restaurant`} 
               description="Order online from Munchix Restaurant - Delicious food delivered to your door" />

      <div dir={isRTL ? "rtl" : "ltr"}>
        <div className="product-detail-container">
          <div>
            <div className="image-container">
              <img src={product.image} alt={product.name.en} className="product-detail-image" />
            </div>
          </div>

          <div className="product-detail-desc">
            <h1>{isRTL ? product.name.ar : product.name.en}</h1>

            <div className="reviews">
              <StarRating />
              <p>(20)</p>
            </div>

            <h4>{ isRTL ? "تفاصيل:" : "Details:" }</h4>
            <p>{ isRTL ? product.description.ar : product.description.en}</p>

            <p className="price">
              جنيه مصرى
              {product.price.toLocaleString("ar-EG", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </p>

            <div className="quantity">
              <h3>{ isRTL ?"الكمية:" : "Quantity:" }</h3>
              <p className="quantity-desc">
                <span className="minus" onClick={decQty}>
                  <AiOutlineMinus />
                </span>
                <span className="num">{qty}</span>
                <span className="plus" onClick={incQty}>
                  <AiOutlinePlus />
                </span>
              </p>
            </div>


            <div className="buttons">
              <button type="button" className="add-to-cart" onClick={() => onAdd(product, qty)}>
                {isRTL ? "أضف إلى السلة" : "Add to Cart"}
              </button>

              <button type="button" className="buy-now" onClick={() => router.push("/checkout")}>
                {isRTL ? "الدفع الآن" : "Checkout"}
              </button>

              {/*<button type="button" className="buy-now" onClick={() => setShowCart(true)}>
                {isRTL ? "الدفع الآن" : "Checkout"}
              </button>*/}

            </div>
          </div>
        </div>

        <div className="maylike-products-wrapper">
          <h2>{isRTL ? "إضافات" : "Add-ons"}</h2>
          <div className="marquee">
            <div className="maylike-products-container track">
              {products.map((item) => (
                <Product key={item._id} product={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;