'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// CartContext provides cart state and actions throughout the app
const CartContext = createContext();

/**
 * CartProvider wraps the app and provides cart state, business logic, and actions.
 * - Fetches cart from backend on login/session change.
 * - Exposes add, remove, update, and clear cart functions.
 * - Handles UI notifications via toast.
 * - (Optional: Add localStorage sync for guest users if needed.)
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch cart from backend when user session changes
  useEffect(() => {
    if (session) {
      fetchCart();
    } else {
      setCart({ items: [] });
      setLoading(false);
    }
  }, [session]);

  /**
   * Fetch the cart from the backend API and update context state.
   * Fetches product details for each item if necessary.
   */
  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart');
      if (!response.ok) throw new Error('Failed to fetch cart');
      const data = await response.json();
      
      // Fetch product details for each item in the cart
      if (data.items && data.items.length > 0) {
        const itemsWithProducts = await Promise.all(data.items.map(async (item) => {
          try {
            // If item already has product details, use them
            if (item.product && typeof item.product === 'object') {
              return item;
            }
            
            // Fetch product details
            const productId = item.productId || item.product;
            if (!productId) {
              console.error('Missing product ID for cart item:', item);
              return {
                ...item,
                product: { name: 'Unknown Product', price: 0 }
              };
            }
            
            const productResponse = await fetch(`/api/products/${productId}`);
            
            if (!productResponse.ok) {
              console.error(`Failed to fetch product with ID ${productId}:`, productResponse.status);
              return {
                ...item,
                product: { name: `Product (${productId})`, price: 0 }
              };
            }
            
            const productData = await productResponse.json();
            
            return {
              ...item,
              product: productData.product
            };
          } catch (error) {
            console.error('Error fetching product details:', error);
            // Return item with placeholder product details if fetch fails
            return {
              ...item,
              product: { name: 'Product (Unavailable)', price: 0 }
            };
          }
        }));
        
        const total = calculateCartTotal(itemsWithProducts);
        setCart({ items: itemsWithProducts, total });
      } else {
        setCart({ items: [], total: 0 });
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to load cart');
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a product to the cart (calls backend API).
   * Notifies user on success/failure and refreshes cart state.
   */
  const addToCart = async (product) => {
    if (!session) {
      toast.error('Please login to add items to cart');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 1500); // Delay redirect to allow user to see the toast message
      return false;
    }

    try {
      // Prepare product data with essential details
      const productData = {
        _id: product._id,
        name: product.name || 'Unknown Product',
        price: product.price || product.pricing?.base || 0,
        imageUrl: product.imageUrl || product.media?.mainImage || getProductImagePath(product),
        category: product.category?.main || 'general',
        description: product.description?.short || '',
        shop: product.shop || null
      };
      
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
          product: productData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      await fetchCart();
      toast.success('Added to cart');
      return true;
    } catch (error) {
      toast.error('Failed to add to cart');
      return false;
    }
  };

  /**
   * Remove a product from the cart by productId (calls backend API).
   * Notifies user and refreshes cart state.
   */
  const removeFromCart = async (productId) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove from cart');
      }

      await fetchCart();
      toast.success('Removed from cart');
    } catch (error) {
      toast.error('Failed to remove from cart');
    }
  };

  /**
   * Update the quantity of a cart item (calls backend API).
   * Notifies user and refreshes cart state.
   */
  const updateQuantity = async (productId, quantity) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cart');
      }

      await fetchCart();
      toast.success('Cart updated');
    } catch (error) {
      toast.error('Failed to update cart');
    }
  };

  /**
   * Clear all items from the cart (calls backend API).
   * Notifies user and resets local cart state.
   */
  const clearCart = async () => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }

      setCart({ items: [] });
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  // Helper function to get product image path
  /**
   * Helper: Get fallback image path for a product based on category/name.
   */
  const getProductImagePath = (product) => {
    if (!product) return '/images/products/default-product.jpg';
    
    // Determine category folder (fruits or vegetables)
    const category = product.category?.main?.toLowerCase() || 'general';
    const validCategories = ['fruits', 'vegetables'];
    const categoryFolder = validCategories.includes(category) ? category : 'general';
    
    // Generate image path with fallback
    const imageName = product.name ? product.name.toLowerCase().replace(/\s+/g, '-') : 'default';
    return `/images/products/${categoryFolder}/${imageName}.jpg`;
  };
  
  /**
   * Helper: Calculate total price of all cart items.
   */
  const calculateCartTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      // Try to get price from different possible locations
      const price = 
        item.product?.price || 
        (item.product?.pricing?.base) || 
        0;
      return total + (price * item.quantity);
    }, 0);
  };
  
  /**
   * Get the current total from context state.
   */
  const getCartTotal = () => {
    return cart.total || 0;
  };

  // Update cart total whenever cart items change
  // Recalculate total whenever cart items change
  useEffect(() => {
    if (cart.items && Array.isArray(cart.items)) {
      const total = calculateCartTotal(cart.items);
      if (total !== cart.total) {
        setCart(prevCart => ({ ...prevCart, total }));
      }
    }
  }, [cart.items]);

  const value = {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Custom hook: useCart
 * Access cart state and actions from anywhere in the app.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 