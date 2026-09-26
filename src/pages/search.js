import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Product from "../components/Product";

export default function SearchPage() {

    const router = useRouter();
    const { q } = router.query;

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        if (!q) return;

        const fetchProducts = async () => {

            try {

                setLoading(true);

                const res = await fetch(`/api/products/search?q=${q}`);

                const data = await res.json();

                setProducts(data);

            } catch (error) {

                console.error(error);

            } finally {

                setLoading(false);
            }
        };

        fetchProducts();

    }, [q]);

    return (
        <div className="search-page">

            <h1>
                Search Results: {q}
            </h1>

            {loading ? (

                <p>Loading...</p>

            ) : products.length > 0 ? (

                <div className="products-container">
                    {products.map(product => (
                        <Product
                            key={product._id}
                            product={product}
                        />
                    ))}
                </div>

            ) : (

                <p>No products found.</p>

            )}

        </div>
    );
}