import React from "react";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { useTranslation } from "react-i18next";

const  toTitleCase = (str)=> {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

const Product = ({ product }) => {
    const seoProductName = product.name.en || "Product";
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

return (
<>
    {/*<NextSeo
        title={`${toTitleCase(seoProductName)}`}
        description="Great tasting home-made macarons"
    />*/}

    <div dir={isRTL ? "rtl" : "ltr"}>
        <Link href={`/product/${product._id}`}>
            <div className="product-card">
                <figure className="fliptile">
                    <img   src={product.image}   className="product-image"  />
                    <figcaption>
                        <p className="product-name">{isRTL ? product.name.ar : product.name.en}</p>
                    </figcaption>
                </figure>

                <p className="product-name">{isRTL ? product.name.ar : product.name.en}</p>
                <p className="product-price">
                    جنيه مصرى
                    {product.price.toLocaleString("ar-EG", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                    })}
                </p>
            </div>
        </Link>
    </div>
</>

);
};

export default Product;
