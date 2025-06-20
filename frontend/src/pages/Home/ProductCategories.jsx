import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// Base URL: fallback to localhost if env is not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Recursively render subcategories only (not root category)
 */
const SubCategoryList = ({ subCategories }) => {
  if (!subCategories || subCategories.length === 0) return null;

  return (
    <ul className="ml-4 mt-1 list-disc">
      {subCategories.map((sub) => (
        <li key={sub.id} className="mb-1">
          <Link
            to={`/category/${sub.slug || sub.id}`}
            className="text-blue-600 hover:underline"
          >
            {sub.name}
          </Link>
          {sub.subCategories && sub.subCategories.length > 0 && (
            <SubCategoryList subCategories={sub.subCategories} />
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * Main component
 */
const ProductCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/categories`);
      setCategories(data?.data?.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("Unable to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <p className="p-4">Loading categories…</p>;

  if (error)
    return (
      <div className="p-4 text-red-600 space-y-2">
        <p>{error}</p>
        <button
          className="px-3 py-1 border rounded bg-white"
          onClick={fetchCategories}
        >
          Retry
        </button>
      </div>
    );

  if (categories.length === 0)
    return <p className="p-4">No categories found.</p>;

  return (
    <section className="p-4">
      <h2 className="text-xl font-semibold mb-6">Product Categories</h2>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.id}>
            <h3 className="text-lg font-bold">{cat.name}</h3>
            <SubCategoryList subCategories={cat.subCategories} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductCategories;
