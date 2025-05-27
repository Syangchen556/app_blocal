'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaShoppingCart, FaHeart, FaList, FaThLarge, FaFilter, FaSort } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'price-asc', 'price-desc', 'name'
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, wishlist } = useWishlist();

  useEffect(() => {
    if (query.trim()) {
      setLoading(true);
      fetchSearchResults();
    } else {
      setProducts([]);
      setLoading(false);
    }

    // Fetch available categories
    fetchCategories();
  }, [query, sortBy, filters]);

  const fetchSearchResults = async () => {
    try {
      let url = `/api/products/search?q=${encodeURIComponent(query)}`;
      
      // Add sorting
      if (sortBy === 'price-asc') {
        url += '&sort=price&order=asc';
      } else if (sortBy === 'price-desc') {
        url += '&sort=price&order=desc';
      } else if (sortBy === 'name') {
        url += '&sort=name&order=asc';
      }
      
      // Add filters
      if (filters.minPrice) url += `&minPrice=${filters.minPrice}`;
      if (filters.maxPrice) url += `&maxPrice=${filters.maxPrice}`;
      if (filters.category && filters.category !== 'all') url += `&category=${filters.category}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching search results:', err);
      setError('Failed to load search results. Please try again.');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlistToggle = async (product) => {
    const isInWishlist = wishlist?.items?.some(item => item.productId === product._id);
    
    try {
      if (isInWishlist) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product);
        toast.success('Added to wishlist!');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      category: 'all',
    });
    setSortBy('relevance');
  };

  if (error) {
    return (
      <div className="container-custom py-10">
        <div className="bg-red-50 p-4 rounded-lg text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchSearchResults} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-10">
      <h1 className="text-2xl font-bold mb-6">
        {query ? `Search Results for "${query}"` : 'Search Products'}
      </h1>

      {/* Controls row */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <button
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <FaThLarge />
          </button>
          <button
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <FaList />
          </button>
          
          <button
            className="md:hidden p-2 rounded bg-gray-200 flex items-center space-x-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="sort" className="text-gray-600">Sort by:</label>
          <select 
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded p-2"
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters - Desktop */}
        <div className="hidden md:block w-full md:w-1/4 bg-white p-4 rounded-lg shadow-sm border">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">Filters</h3>
            <button 
              onClick={resetFilters}
              className="text-sm text-green-600 hover:underline"
            >
              Reset All
            </button>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Price Range</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                name="minPrice"
                placeholder="Min"
                value={filters.minPrice}
                onChange={handleFilterChange}
                className="w-1/2 border rounded p-2"
              />
              <span>-</span>
              <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                className="w-1/2 border rounded p-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Category</h4>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters - Mobile */}
        {showFilters && (
          <div className="md:hidden w-full bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button 
                onClick={resetFilters}
                className="text-sm text-green-600 hover:underline"
              >
                Reset All
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Price Range</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="minPrice"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  className="w-1/2 border rounded p-2"
                />
                <span>-</span>
                <input
                  type="number"
                  name="maxPrice"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  className="w-1/2 border rounded p-2"
                />
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Category</h4>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full border rounded p-2"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Products */}
        <div className="w-full md:w-3/4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : products.length === 0 ? (
            <div className="bg-gray-50 p-10 rounded-lg text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-2">No products found</h2>
              <p className="text-gray-500 mb-4">
                We couldn't find any products matching your search criteria.
              </p>
              <Link href="/products" className="text-green-600 hover:underline">
                Browse all products instead
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-gray-600">{products.length} result{products.length !== 1 ? 's' : ''} found</p>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map(product => (
                    <div key={product._id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/products/${product.slug}`}>
                        <div className="h-40 relative">
                          <Image
                            src={product.images?.[0] || '/images/placeholder-product.jpg'}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <div className="p-4">
                        <Link href={`/products/${product.slug}`}>
                          <h3 className="font-medium text-gray-800 hover:text-green-600 transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="flex justify-between items-center mt-2">
                          <p className="font-bold text-green-600">${product.price.toFixed(2)}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleWishlistToggle(product)}
                              className="p-1 rounded-full hover:bg-gray-100"
                              aria-label={`${wishlist?.items?.some(item => item.productId === product._id) ? 'Remove from' : 'Add to'} wishlist`}
                            >
                              <FaHeart 
                                className={`h-5 w-5 ${wishlist?.items?.some(item => item.productId === product._id) ? 'text-red-500' : 'text-gray-400'}`} 
                              />
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="p-1 rounded-full hover:bg-gray-100"
                              aria-label="Add to cart"
                            >
                              <FaShoppingCart className="h-5 w-5 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map(product => (
                    <div key={product._id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex">
                      <Link href={`/products/${product.slug}`} className="w-1/4">
                        <div className="h-full w-full relative">
                          <Image
                            src={product.images?.[0] || '/images/placeholder-product.jpg'}
                            alt={product.name}
                            fill
                            sizes="25vw"
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <div className="p-4 flex-1">
                        <Link href={`/products/${product.slug}`}>
                          <h3 className="font-medium text-gray-800 hover:text-green-600 transition-colors text-lg">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center mt-4">
                          <p className="font-bold text-green-600 text-lg">${product.price.toFixed(2)}</p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleWishlistToggle(product)}
                              className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-gray-100"
                              aria-label={`${wishlist?.items?.some(item => item.productId === product._id) ? 'Remove from' : 'Add to'} wishlist`}
                            >
                              <FaHeart 
                                className={`h-5 w-5 ${wishlist?.items?.some(item => item.productId === product._id) ? 'text-red-500' : 'text-gray-400'}`} 
                              />
                              <span className="text-sm">{wishlist?.items?.some(item => item.productId === product._id) ? 'Saved' : 'Save'}</span>
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="flex items-center space-x-1 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                              aria-label="Add to cart"
                            >
                              <FaShoppingCart className="h-5 w-5" />
                              <span className="text-sm">Add to Cart</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
