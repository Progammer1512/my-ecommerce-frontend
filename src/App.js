import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// LIVE BACKEND BASE URL
const BASE_URL = 'https://my-ecommerce-project-nmfj.onrender.com';

// Helper to filter out corrupted local/broken image paths
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('NOW_REPLACE_TEXT') || url.includes('localhost:5000')) return false;
  return true;
};

// HELPER: READS EXACT STOCK FROM MONGODB (Supports countInStock or stock)
const getProductStock = (p) => {
  if (!p) return 0;
  if (p.countInStock !== undefined && p.countInStock !== null) return Number(p.countInStock);
  if (p.stock !== undefined && p.stock !== null) return Number(p.stock);
  return 0;
};

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [user, setUser] = useState(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // CATEGORY MENU MODAL STATE
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // EMAIL SIGN-UP & LOGIN MODAL STATES
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', mobile: '', address: '', pincode: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // PASSWORD VISIBILITY TOGGLE STATES
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // FULL-PAGE PRODUCT DETAIL STATE & LINEAR NAVIGATION STACK
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [allReviews, setAllReviews] = useState([]);

  // Review & Rating Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittedReviews, setSubmittedReviews] = useState({});

  // RETURN / REPLACEMENT MODAL STATES
  const [showReturnModal, setShowReviewModalReturn] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState(null);
  const [returnTypeOption, setReturnTypeOption] = useState('Refund');
  const [returnReason, setReturnReason] = useState('Damaged or Defective Item');
  const [returnComments, setReturnComments] = useState('');

  // Touch Swipe Refs for Hero Banner
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // 🟢 MONGODB REAL BANNERS STATE (NO FAKE HARDCODED DEFAULT BANNERS)
  const [heroBanners, setHeroBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [allStoreOrders, setAllStoreOrders] = useState([]);

  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponCodeMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 16;

  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');

  // SMART BROWSER NATIVE BACK/FORWARD EVENT HANDLER WITH TOP SCROLL
  useEffect(() => {
    const handlePopState = (event) => {
      if (showCartModal) { setShowCartModal(false); return; }
      if (showCheckoutModal) { setShowCheckoutModal(false); return; }
      if (showCategoryMenu) { setShowCategoryMenu(false); return; }
      if (showOrderTracking) { setShowOrderTracking(false); return; }
      if (showSignupModal) { setShowSignupModal(false); return; }
      if (showLoginModal) { setShowLoginModal(false); return; }
      if (showReviewModal) { setShowReviewModal(false); return; }
      if (showReturnModal) { setShowReviewModalReturn(false); return; }

      if (event.state && typeof event.state.stackIdx === 'number') {
        const targetIdx = event.state.stackIdx;
        if (targetIdx >= 0 && targetIdx < navigationStack.length) {
          setCurrentIndex(targetIdx);
          setSelectedProductDetail(navigationStack[targetIdx]);
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
          return;
        }
      }

      setSelectedProductDetail(null);
      setCurrentIndex(-1);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    showCartModal, showCheckoutModal, showCategoryMenu, showOrderTracking,
    showSignupModal, showLoginModal, showReviewModal, showReturnModal,
    navigationStack
  ]);

  // HELPER TO OPEN PRODUCT DETAILS AND BUILD CLEAN HISTORY STACK
  const handleOpenProductDetail = (p) => {
    let newStack;
    let newIdx;

    if (currentIndex >= 0 && currentIndex < navigationStack.length) {
      newStack = [...navigationStack.slice(0, currentIndex + 1), p];
      newIdx = newStack.length - 1;
    } else {
      newStack = [p];
      newIdx = 0;
    }

    setNavigationStack(newStack);
    setCurrentIndex(newIdx);
    setSelectedProductDetail(p);

    window.history.pushState({ stackIdx: newIdx }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // STATIC BUTTON ACTION: ALWAYS DIRECTLY RESET TO ALL PRODUCTS CATALOG
  const handleResetToAllCatalog = () => {
    setSelectedProductDetail(null);
    setNavigationStack([]);
    setCurrentIndex(-1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/coupons`, { timeout: 10000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCoupons(res.data);
      }
    } catch (err) {
      const savedCoupons = localStorage.getItem('adminCoupons');
      if (savedCoupons) {
        setCoupons(JSON.parse(savedCoupons));
      }
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/reviews`, { timeout: 10000 });
      if (Array.isArray(res.data)) {
        setAllReviews(res.data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders`, { timeout: 10000 });
      if (Array.isArray(res.data)) {
        setAllStoreOrders(res.data);
      }
    } catch (err) {
      console.error('Error fetching live orders:', err);
      const savedOrders = localStorage.getItem('myOrders');
      if (savedOrders) {
        setAllStoreOrders(JSON.parse(savedOrders));
      }
    }
  };

  // 🟢 FETCH BANNERS FROM MONGODB WITHOUT FLICKERING SPINNER ON BACKGROUND AUTO-REFRESH
  const fetchBanners = async (isInitial = false) => {
    try {
      if (isInitial) setBannersLoading(true);
      const res = await axios.get(`${BASE_URL}/api/banners`, { timeout: 10000 });
      if (res.data && res.data.length > 0) {
        const cleanBanners = res.data.filter(b => isValidImageUrl(b.img));
        setHeroBanners(cleanBanners);
      } else {
        setHeroBanners([]);
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      if (isInitial) setBannersLoading(false);
    }
  };

  const fetchProducts = async (setInitial = false) => {
    try {
      if (setInitial) setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/products`, { timeout: 12000 });
      const productList = Array.isArray(res.data) ? res.data : (res.data.products || []);
      setProducts(productList);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      if (setInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(true);
    fetchBanners(true); // First time load shows spinner once
    fetchLiveOrders();
    fetchReviews();
    fetchCoupons();

    const savedRev = localStorage.getItem('submittedReviews');
    if (savedRev) {
      setSubmittedReviews(JSON.parse(savedRev));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts(false);
      fetchLiveOrders();
      fetchReviews();
      fetchCoupons();
      fetchBanners(false); // Silent background refresh without reloading spinner
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (heroBanners.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [heroBanners.length]);

  useEffect(() => {
    const savedGoogleUser = localStorage.getItem('googleUser');
    if (savedGoogleUser) {
      const parsed = JSON.parse(savedGoogleUser);
      setUser(parsed);
      setShippingName(parsed.name || '');
    }
  }, []);

  // TOUCH SWIPE LOGIC FOR BANNER (INFINITE LOOP)
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || heroBanners.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }
    if (isRightSwipe) {
      setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleEmailSignupSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/signup`, signupData);
      alert('🎉 Registration successful! Welcome to TechStore.');
      setUser(res.data.user);
      setShippingName(res.data.user.name || '');
      setShippingAddress(res.data.user.address || '');
      setShippingPhone(res.data.user.mobile || '');
      localStorage.setItem('googleUser', JSON.stringify(res.data.user));
      setShowSignupModal(false);
      setSignupData({ name: '', email: '', password: '', mobile: '', address: '', pincode: '' });
    } catch (err) { 
      alert(err.response?.data?.message || 'Signup failed. Please check backend connection.'); 
    }
  };

  const handleEmailLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
      alert(res.data.message || 'Login successful!');
      setUser(res.data.user);
      setShippingName(res.data.user.name || '');
      setShippingAddress(res.data.user.address || '');
      setShippingPhone(res.data.user.mobile || '');
      localStorage.setItem('googleUser', JSON.stringify(res.data.user));
      setShowLoginModal(false);
      setLoginData({ email: '', password: '' });
    } catch (err) { alert(err.response?.data?.message || 'Login failed.'); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decodedUser = jwtDecode(credentialResponse.credential);
      const res = await axios.post(`${BASE_URL}/api/auth/google`, {
        name: decodedUser.name,
        email: decodedUser.email,
        googleId: decodedUser.sub,
        avatar: decodedUser.picture
      });

      setUser(res.data.user);
      setShippingName(res.data.user.name || '');
      localStorage.setItem('googleUser', JSON.stringify(res.data.user));
      alert(`🎉 Welcome ${decodedUser.name}! Verified via Google Cloud.`);
    } catch (err) {
      console.error("JWT Decode Error:", err);
    }
  };

  const handleGoogleFailure = () => {
    alert("Google Sign-In was cancelled or failed.");
  };

  const handleGoogleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('googleUser');
    alert("Logged out from Account.");
  };

  const userOrders = allStoreOrders.filter(ord => {
    if (!user || !user.email) {
      return ord.userEmail === 'guest@techstore.com' || !ord.userEmail;
    }
    return ord.userEmail && ord.userEmail.toLowerCase() === user.email.toLowerCase();
  });

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  // HELPER: GET 3 VISIBLE PAGE NUMBERS
  const getVisiblePageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage === 1) {
      return [1, 2, 3];
    }
    if (currentPage === totalPages) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 1, currentPage, currentPage + 1];
  };

  const addToCart = (product) => {
    const prodStock = getProductStock(product);
    if (prodStock <= 0) {
      alert("❌ Sorry, this item is Out of Stock!");
      return;
    }
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const rawCartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  let categoryEligibleSubtotal = 0;
  if (appliedCoupon) {
    if (!appliedCoupon.category || appliedCoupon.category === 'All') {
      categoryEligibleSubtotal = rawCartTotal;
    } else {
      categoryEligibleSubtotal = cart
        .filter(item => (item.category || '').toLowerCase() === appliedCoupon.category.toLowerCase())
        .reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    }
  }

  const discountAmount = appliedCoupon 
    ? Math.round((categoryEligibleSubtotal * (Number(appliedCoupon.discount) || 0)) / 100)
    : 0;

  const finalCartTotal = Math.max(0, rawCartTotal - discountAmount);
  const cartItemCount = cart.reduce((acc, curr) => acc + curr.qty, 0);

  const handleApplyCouponCode = (codeToApply) => {
    const cleanCode = (codeToApply || couponCode).trim().toUpperCase();
    if (!cleanCode) return;

    const foundCoupon = coupons.find(c => (c.code || '').toUpperCase().trim() === cleanCode);

    if (foundCoupon) {
      const couponCategory = foundCoupon.category || 'All';
      const discountPct = Number(foundCoupon.discount) || 10;
      const maxUsage = Number(foundCoupon.maxUsage) || 100;
      const usedCount = Number(foundCoupon.usedCount) || 0;

      if (usedCount >= maxUsage) {
        setAppliedCoupon(null);
        setCouponCode(cleanCode);
        setCouponCodeMessage(`❌ Promo code '${cleanCode}' usage limit exhausted! (${usedCount}/${maxUsage} used)`);
        return;
      }

      let matchingCategoryItems = [];
      if (couponCategory === 'All') {
        matchingCategoryItems = cart;
      } else {
        matchingCategoryItems = cart.filter(item => 
          (item.category || '').toLowerCase() === couponCategory.toLowerCase()
        );
      }

      if (matchingCategoryItems.length === 0) {
        setAppliedCoupon(null);
        setCouponCode(cleanCode);
        setCouponCodeMessage(`❌ Promo code '${cleanCode}' is only valid for [${couponCategory}] products!`);
        return;
      }

      setCouponCode(cleanCode);
      setAppliedCoupon({
        code: cleanCode,
        discount: discountPct,
        category: couponCategory
      });
      setCouponCodeMessage(`🎉 ${discountPct}% Discount Applied on [${couponCategory}] items!`);
    } else {
      setAppliedCoupon(null);
      setCouponCodeMessage('❌ Invalid Promo Code!');
    }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    handleApplyCouponCode(couponCode);
  };

  const categoriesList = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Cart is empty!');

    const orderPayload = {
      userEmail: user ? user.email : 'guest@techstore.com',
      orderItems: cart.map(i => ({ 
        name: i.name, 
        qty: Number(i.qty) || 1, 
        price: Number(i.price) || 0, 
        product: i._id || i.id,
        image: i.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'
      })),
      shippingAddress: { 
        name: shippingName || (user ? user.name : 'Verified Customer'), 
        address: shippingAddress || 'Default Address', 
        phone: shippingPhone || '9876543210' 
      },
      paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
      totalPrice: Number(finalCartTotal) || 0,
      status: 'Processing'
    };

    try {
      const res = await axios.post(`${BASE_URL}/api/orders`, orderPayload);
      const placedOrderId = res.data.order?._id || res.data._id || 'SUCCESS';
      
      alert(`🎉 Order Placed Successfully!\nOrder ID: #${placedOrderId}`);
      
      if (appliedCoupon && appliedCoupon.code) {
        try {
          await axios.post(`${BASE_URL}/api/coupons/use`, { code: appliedCoupon.code });
          fetchCoupons();
        } catch (err) {
          console.log('Coupon used locally');
        }
      }

      fetchLiveOrders();
      fetchProducts(false);
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponCodeMessage('');
      setShowCheckoutModal(false);
      setShowCartModal(false);
    } catch (err) {
      console.error('Order Push Error:', err);
      alert('Order Placement Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenReviewModal = (ord) => {
    setSelectedOrderForReview(ord);
    setRatingStars(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedOrderForReview) return;

    const reviewData = {
      orderId: selectedOrderForReview._id,
      customerName: user ? user.name : (selectedOrderForReview.shippingAddress?.name || 'Verified Buyer'),
      customerEmail: user ? user.email : 'guest@techstore.com',
      rating: ratingStars,
      comment: reviewComment,
      items: selectedOrderForReview.orderItems || [],
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    try {
      await axios.post(`${BASE_URL}/api/reviews`, reviewData);
      alert('🌟 Thank you! Your Rating & Review has been published.');
      fetchReviews();
    } catch (err) {
      alert('🌟 Review Submitted Successfully!');
    }

    const updatedRev = { ...submittedReviews, [selectedOrderForReview._id]: reviewData };
    setSubmittedReviews(updatedRev);
    localStorage.setItem('submittedReviews', JSON.stringify(updatedRev));

    setShowReviewModal(false);
  };

  const handleOpenReturnModal = (ord) => {
    setSelectedOrderForReturn(ord);
    setReturnTypeOption('Refund');
    setReturnReason('Damaged or Defective Item');
    setReturnComments('');
    setShowReviewModalReturn(true);
  };

  const handleSubmitReturnRequest = async (e) => {
    e.preventDefault();
    if (!selectedOrderForReturn) return;

    try {
      await axios.put(`${BASE_URL}/api/orders/${selectedOrderForReturn._id}/return`, {
        returnType: returnTypeOption,
        reason: returnReason,
        comments: returnComments
      });
      alert(`🔄 Return Request (${returnTypeOption}) Submitted Successfully!\nAdmin will review and update your status.`);
      fetchLiveOrders();
    } catch (err) {
      alert('Return request submitted.');
    }

    setShowReviewModalReturn(false);
  };

  const handleNavigateToProduct = (item) => {
    setShowOrderTracking(false);
    const matchingProd = products.find(p => p._id === item.product || p._id === item._id || p.name === item.name);
    if (matchingProd) {
      handleOpenProductDetail(matchingProd);
    } else {
      handleOpenProductDetail({
        _id: item.product || item._id,
        name: item.name,
        price: item.price,
        image: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
        description: 'Verified store product from customer order history.',
        category: 'Ordered Item',
        countInStock: item.countInStock !== undefined ? item.countInStock : (item.stock || 0)
      });
    }
  };

  const productReviews = selectedProductDetail 
    ? allReviews.filter(r => {
        if (!r.items || !Array.isArray(r.items)) return false;
        return r.items.some(item => 
          (item.product && item.product === selectedProductDetail._id) || 
          (item._id && item._id === selectedProductDetail._id) || 
          (item.name && item.name === selectedProductDetail.name)
        );
      })
    : [];

  const totalReviewsCount = productReviews.length;
  const avgRating = totalReviewsCount > 0 
    ? (productReviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / totalReviewsCount).toFixed(1) 
    : '5.0';

  const getStarPercent = (starVal) => {
    if (totalReviewsCount === 0) return starVal === 5 ? 100 : 0;
    const matchCount = productReviews.filter(r => Number(r.rating) === starVal).length;
    return Math.round((matchCount / totalReviewsCount) * 100);
  };

  const getOrderStep = (status) => {
    if (!status) return 1;
    const st = status.toLowerCase();
    if (st === 'delivered') return 4;
    if (st.includes('shipped') || st.includes('in transit') || st.includes('delivery')) return 3;
    if (st.includes('processing') || st.includes('approved')) return 2;
    return 1;
  };

  const currentBanner = heroBanners[currentSlide] || null;

  return (
    <div className="bg-light min-vh-100 position-relative" style={{ overflowX: 'hidden', width: '100%' }}>
      
      {/* NAVBAR */}
      <nav className="navbar navbar-dark bg-dark sticky-top shadow-sm py-2 px-2 px-md-3">
        <div className="container-fluid p-0">
          
          {/* Top Row: Brand Logo, Hamburger Menu & Cart Button */}
          <div className="d-flex justify-content-between align-items-center w-100 mb-2">
            
            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-warning btn-sm fw-bold px-2 py-1 shadow-sm d-flex align-items-center justify-content-center"
                onClick={() => setShowCategoryMenu(true)}
                title="Browse Categories"
                style={{ borderRadius: '6px' }}
              >
                <i className="bi bi-list fs-5 me-1"></i>
                <span className="small fw-bold">Menu</span>
              </button>

              <a 
                className="navbar-brand fw-bold text-warning fs-4 fs-md-3 m-0" 
                href="#home"
                onClick={handleResetToAllCatalog}
              >
                <i className="bi bi-shop me-1"></i>TechStore
              </a>
            </div>

            <button 
              className="btn btn-warning fw-bold rounded-pill px-3 py-1 btn-sm position-relative shadow-sm"
              onClick={() => setShowCartModal(true)}
            >
              <i className="bi bi-cart3 me-1"></i> Cart
              {cartItemCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Middle Row: User Controls & Authentication Actions */}
          <div className="d-flex flex-wrap justify-content-between align-items-center w-100 gap-2 mb-2">
            
            <button 
              className="btn btn-outline-light btn-sm rounded-pill px-3 py-1 fw-bold d-inline-flex align-items-center gap-1 shadow-sm" 
              onClick={() => { fetchLiveOrders(); setShowOrderTracking(true); }}
            >
              <i className="bi bi-bag-check fs-6"></i>
              <span>My Orders</span>
              {userOrders.length > 0 && (
                <span className="badge rounded-pill bg-primary ms-1">
                  {userOrders.length}
                </span>
              )}
            </button>

            {user ? (
              <div className="d-flex align-items-center gap-2 text-white bg-secondary bg-opacity-25 px-2 py-1 rounded-pill">
                <img src={user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt="Profile" className="rounded-circle border" width="28" height="28" />
                <span className="fw-bold small text-truncate" style={{ maxWidth: '90px' }}>{user.name}</span>
                <button className="btn btn-sm btn-outline-danger py-0 px-2 rounded-pill fw-bold" onClick={handleGoogleLogout}>Logout</button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button className="btn btn-outline-warning btn-sm fw-bold rounded-pill px-3 py-1" onClick={() => setShowLoginModal(true)}>Sign In</button>
                <button className="btn btn-warning btn-sm fw-bold rounded-pill px-3 py-1 text-dark" onClick={() => setShowSignupModal(true)}>Sign Up</button>
                
                <div className="d-inline-block rounded-circle overflow-hidden shadow-sm border bg-white" style={{ height: '32px', width: '32px' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                    type="icon"
                    shape="circle"
                    size="medium"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Bottom Row: Search Bar */}
          <div className="w-100 mt-1">
            <input 
              type="text" 
              className="form-control form-control-sm rounded-pill px-3 shadow-sm" 
              placeholder="Search products..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); handleResetToAllCatalog(); }} 
            />
          </div>

        </div>
      </nav>

      {/* 🍔 CATEGORY HAMBURGER MENU MODAL */}
      {showCategoryMenu && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold text-warning mb-0">
                  <i className="bi bi-grid-3x3-gap-fill me-2"></i>Select Category
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCategoryMenu(false)}></button>
              </div>
              <div className="modal-body p-3 bg-light">
                <div className="d-flex flex-column gap-2">
                  {categoriesList.map((cat, idx) => (
                    <button
                      key={idx}
                      className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between ${
                        selectedCategory === cat 
                          ? 'btn-warning text-dark shadow-sm' 
                          : 'btn-white bg-white text-dark border'
                      }`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                        handleResetToAllCatalog();
                        setShowCategoryMenu(false);
                      }}
                    >
                      <span>📦 {cat}</span>
                      {selectedCategory === cat && <i className="bi bi-check-circle-fill text-dark"></i>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL OR MAIN CATALOG */}
      {selectedProductDetail ? (
        <div className="container py-4">
          {/* STATIC BUTTON THAT ALWAYS DIRECTLY TAKES USER BACK TO MAIN ALL PRODUCTS CATALOG */}
          <button 
            className="btn btn-outline-dark fw-bold mb-4 rounded-pill px-4 shadow-sm"
            onClick={handleResetToAllCatalog}
          >
            &larr; Back to All Products Catalog
          </button>

          <div className="card border-0 shadow-lg p-3 p-md-4 bg-white rounded-4 mb-5">
            <div className="row g-4 align-items-center">
              <div className="col-lg-5 text-center">
                <div className="p-3 border rounded-3 bg-white shadow-sm position-relative">
                  <span className="position-absolute top-0 start-0 badge bg-danger m-3 px-3 py-2 fw-bold fs-6 shadow">
                    10% OFF
                  </span>
                  <img 
                    src={selectedProductDetail.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'} 
                    alt={selectedProductDetail.name} 
                    className="img-fluid rounded" 
                    style={{ maxHeight: '380px', objectFit: 'contain' }}
                  />
                </div>
              </div>

              <div className="col-lg-7 d-flex flex-column">
                <span className="badge bg-primary text-uppercase px-3 py-2 fw-bold w-auto me-auto mb-2">
                  {selectedProductDetail.category || 'General'}
                </span>
                
                <h1 className="fw-bold text-dark mb-2 fs-3 fs-md-2">{selectedProductDetail.name}</h1>
                
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge bg-success px-2 py-1 fs-6 fw-bold">
                    {avgRating} ★
                  </span>
                  <span className="text-muted small fw-semibold">
                    ({totalReviewsCount} Verified Customer Rating & Reviews)
                  </span>
                </div>

                <div className="d-flex align-items-baseline gap-3 mb-3">
                  <h1 className="text-success fw-bold display-6 m-0">₹{selectedProductDetail.price}</h1>
                  <span className="text-muted text-decoration-line-through fs-5">
                    ₹{Math.round(selectedProductDetail.price * 1.15)}
                  </span>
                  <span className="badge bg-success text-white fw-bold fs-6">Special Price</span>
                </div>

                <div className="row g-2 mb-4 p-3 bg-light rounded border">
                  <div className="col-6">
                    <span className="small text-muted d-block fw-bold">Availability:</span>
                    {getProductStock(selectedProductDetail) > 0 ? (
                      <span className="text-success fw-bold fs-6">
                        <i className="bi bi-check-circle-fill me-1"></i>In Stock ({getProductStock(selectedProductDetail)} Left)
                      </span>
                    ) : (
                      <span className="text-danger fw-bold fs-6"><i className="bi bi-x-circle-fill me-1"></i>Out of Stock (0 Left)</span>
                    )}
                  </div>
                  <div className="col-6">
                    <span className="small text-muted d-block fw-bold">Delivery:</span>
                    <span className="text-dark fw-bold fs-6">🚀 FREE Express Delivery</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold text-dark">About Product Specifications:</h5>
                  <p className="text-secondary leading-relaxed m-0">
                    {selectedProductDetail.description || 'Premium quality product verified and direct shipped from top sellers.'}
                  </p>
                </div>

                <div className="mt-auto d-flex gap-3">
                  <button 
                    className={`btn btn-lg fw-bold flex-grow-1 shadow-sm py-3 fs-5 ${
                      getProductStock(selectedProductDetail) <= 0 
                      ? 'btn-secondary disabled' 
                      : 'btn-warning'
                    }`}
                    disabled={getProductStock(selectedProductDetail) <= 0}
                    onClick={() => {
                      addToCart(selectedProductDetail);
                      setShowCartModal(true);
                    }}
                  >
                    <i className="bi bi-cart-plus-fill me-2"></i>
                    {getProductStock(selectedProductDetail) <= 0 
                      ? 'Out of Stock' 
                      : 'Add to Cart & Buy Now'
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* REVIEWS SECTION */}
          <div className="card border-0 shadow-sm p-3 p-md-4 bg-white rounded-4 mb-5">
            <h4 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
              <i className="bi bi-chat-left-quote-fill text-warning"></i> Customer Ratings & Verified Reviews
            </h4>

            <div className="row g-3 p-3 bg-light rounded border mb-4 align-items-center">
              <div className="col-md-4 text-center border-end">
                <h1 className="fw-bold text-dark display-3 m-0">{avgRating}</h1>
                <div className="text-warning fs-3 mb-1">
                  {'★'.repeat(Math.round(Number(avgRating)))}
                </div>
                <span className="text-muted small fw-bold">Overall Product Rating ({totalReviewsCount} Reviews)</span>
              </div>
              <div className="col-md-8">
                {[5, 4, 3, 2, 1].map((starVal) => {
                  const pct = getStarPercent(starVal);
                  return (
                    <div key={starVal} className="d-flex align-items-center gap-2 small mb-1">
                      <span className="fw-bold" style={{ width: '25px' }}>{starVal} ★</span>
                      <div className="progress flex-grow-1" style={{ height: '8px' }}>
                        <div 
                          className={`progress-bar ${starVal >= 4 ? 'bg-success' : starVal === 3 ? 'bg-warning' : 'bg-danger'}`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className="text-muted" style={{ width: '35px' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <h6 className="fw-bold mb-3 text-secondary">Verified Buyer Reviews ({productReviews.length})</h6>

            {productReviews.length === 0 ? (
              <div className="p-4 text-center text-muted bg-light rounded border">
                <i className="bi bi-star fs-2 text-warning d-block mb-2"></i>
                <p className="m-0 fw-bold">No reviews for this product yet.</p>
                <small className="text-muted">Be the first customer to order and rate this item!</small>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {productReviews.map((rev, idx) => (
                  <div key={idx} className="p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success fw-bold px-2 py-1">
                          {rev.rating || 5} ★
                        </span>
                        <span className="fw-bold text-dark small">{rev.customerName || 'Verified Buyer'}</span>
                        <span className="badge bg-secondary" style={{ fontSize: '10px' }}>Verified Purchase</span>
                      </div>
                      <small className="text-muted">{rev.date || 'Recent'}</small>
                    </div>
                    <p className="m-0 small text-dark fw-semibold">
                      "{rev.comment || 'Great quality product! Completely satisfied with the purchase.'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 mb-4">
            <h3 className="fw-bold mb-4 text-dark fs-4">You May Also Like (Similar Store Products)</h3>
            
            <div className="row g-2 g-md-4">
              {products.filter(p => p._id !== selectedProductDetail._id).slice(0, 6).map((p) => (
                <div key={p._id} className="col-6 col-md-6 col-lg-4">
                  <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                    <div 
                      className="bg-white text-center p-2 p-md-3" 
                      style={{ height: '160px', cursor: 'pointer' }}
                      onClick={() => handleOpenProductDetail(p)}
                    >
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'} 
                        className="img-fluid h-100" 
                        alt={p.name} 
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div className="card-body p-2 p-md-3 d-flex flex-column bg-white border-top">
                      <span className="badge bg-secondary mb-1 w-auto me-auto" style={{ fontSize: '10px' }}>{p.category || 'General'}</span>
                      <h6 
                        className="card-title fw-bold text-dark text-truncate small m-0 mb-1" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleOpenProductDetail(p)}
                      >
                        {p.name}
                      </h6>
                      <div className="d-flex align-items-center justify-content-between mt-auto pt-2">
                        <span className="fw-bold text-success fs-6">₹{p.price}</span>
                        <button className="btn btn-outline-primary btn-sm py-0 px-2 fw-bold" style={{ fontSize: '11px' }} onClick={() => handleOpenProductDetail(p)}>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 🟢 DYNAMIC MONGODB BANNERS WITH CLEAN INITIAL LOADING PLACEHOLDER */}
          <div className="container mt-3 mb-2 px-2 px-md-3">
            {bannersLoading ? (
              <div 
                className="rounded-4 p-4 text-center bg-secondary bg-opacity-10 shadow-sm d-flex align-items-center justify-content-center"
                style={{ minHeight: '160px' }}
              >
                <div className="spinner-border text-warning spinner-border-sm me-2" role="status"></div>
                <span className="text-muted fw-bold small">Loading store offers...</span>
              </div>
            ) : heroBanners.length > 0 && currentBanner ? (
              <div 
                className="rounded-4 p-3 p-md-4 text-white shadow-lg overflow-hidden position-relative"
                style={{ background: currentBanner.bg || 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', minHeight: '160px', touchAction: 'pan-y' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="row align-items-center">
                  <div className="col-md-8">
                    {currentBanner.badge && (
                      <span className="badge bg-warning text-dark fw-bold mb-2 px-2 py-1 small">
                        {currentBanner.badge}
                      </span>
                    )}
                    <h2 className="fw-bold m-0 fs-4 fs-md-2">{currentBanner.title}</h2>
                    {currentBanner.subtitle && (
                      <p className="lead m-0 mt-1 text-white-50 fs-6 d-none d-sm-block">{currentBanner.subtitle}</p>
                    )}
                  </div>
                  {currentBanner.img && (
                    <div className="col-md-4 text-end d-none d-md-block">
                      <img 
                        src={currentBanner.img} 
                        alt="Offer" 
                        className="img-fluid rounded-3 shadow" 
                        style={{ maxHeight: '130px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>

                {heroBanners.length > 1 && (
                  <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-2">
                    {heroBanners.map((_, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm p-1 rounded-circle ${currentSlide === idx ? 'bg-warning' : 'bg-white bg-opacity-50'}`}
                        style={{ width: '8px', height: '8px' }}
                        onClick={() => setCurrentSlide(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="container py-2 px-2 px-md-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <h4 className="fw-bold m-0 fs-5">
                {selectedCategory === 'All' ? 'Explore Our Products' : `${selectedCategory} Collection`}
                <span className="fs-6 text-muted ms-2">({filteredProducts.length} items)</span>
              </h4>
              
              {selectedCategory !== 'All' && (
                <button className="btn btn-outline-secondary btn-sm fw-bold rounded-pill py-0 px-2" style={{ fontSize: '12px' }} onClick={() => setSelectedCategory('All')}>
                  Showing: {selectedCategory} ✕ (Show All)
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading live products...</p>
              </div>
            ) : currentProducts.length === 0 ? (
              <div className="text-center py-5 card border-0 shadow-sm p-5">
                <h5 className="text-muted">No products found matching your search.</h5>
              </div>
            ) : (
              <>
                <div className="row g-2 g-md-4">
                  {currentProducts.map((p) => {
                    const currentStock = getProductStock(p);
                    
                    return (
                      <div key={p._id} className="col-6 col-md-6 col-lg-4">
                        <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden d-flex flex-column">
                          <div 
                            className="bg-white text-center p-2 p-md-3" 
                            style={{ height: '150px', cursor: 'pointer' }}
                            onClick={() => handleOpenProductDetail(p)}
                          >
                            <img 
                              src={p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'} 
                              className="img-fluid h-100" 
                              alt={p.name} 
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                          
                          <div className="card-body p-2 p-md-3 d-flex flex-column bg-white border-top flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="badge bg-secondary" style={{ fontSize: '9px' }}>{p.category || 'General'}</span>
                              
                              {currentStock <= 0 ? (
                                <span className="badge bg-danger" style={{ fontSize: '9px' }}>Out of Stock</span>
                              ) : currentStock < 5 ? (
                                <span className="badge bg-warning text-dark" style={{ fontSize: '9px' }}>Low Stock ({currentStock})</span>
                              ) : (
                                <span className="badge bg-success" style={{ fontSize: '9px' }}>In Stock ({currentStock})</span>
                              )}
                            </div>

                            <h6 
                              className="card-title fw-bold text-dark text-truncate mb-1" 
                              style={{ cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => handleOpenProductDetail(p)}
                              title={p.name}
                            >
                              {p.name}
                            </h6>
                            
                            <p className="card-text text-muted small flex-grow-1 d-none d-md-block" style={{ fontSize: '11px' }}>
                              {p.description ? p.description.substring(0, 50) + '...' : 'No description'}
                            </p>
                            
                            <div className="d-flex align-items-center justify-content-between mt-auto pt-2">
                              <span className="fw-bold text-success fs-6">₹{p.price}</span>
                              
                              <div className="d-flex gap-1">
                                <button 
                                  className={`btn btn-sm fw-bold px-2 py-1 ${currentStock <= 0 ? 'btn-secondary disabled' : 'btn-primary'}`}
                                  style={{ fontSize: '11px' }}
                                  disabled={currentStock <= 0}
                                  onClick={() => addToCart(p)}
                                >
                                  <i className="bi bi-cart-plus me-1"></i>
                                  {currentStock <= 0 ? 'Sold Out' : 'Add'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SMART COMPACT PAGINATION */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center mt-4 mb-4">
                    <nav>
                      <ul className="pagination pagination-md shadow-sm m-0">
                        {/* PREVIOUS BUTTON */}
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link fw-bold px-3 py-2" 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            &laquo; Previous
                          </button>
                        </li>

                        {/* ONLY 3 VISIBLE NUMERIC PAGE BUTTONS */}
                        {getVisiblePageNumbers().map((page) => (
                          <li key={page} className="page-item">
                            <button 
                              className={`page-link fw-bold px-3 py-2 ${currentPage === page ? 'bg-primary text-white border-primary' : 'text-primary bg-white'}`} 
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}

                        {/* NEXT BUTTON */}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link fw-bold px-3 py-2" 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next &raquo;
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* FOOTER SECTION AT THE BOTTOM TO EXTEND PAGE HEIGHT */}
      <footer className="bg-dark text-white pt-4 pb-3 border-top mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-4">
              <h5 className="fw-bold text-warning mb-2"><i className="bi bi-shop me-1"></i>TechStore</h5>
              <p className="small text-white-50">
                Your trusted destination for premium electronics, summer fashion, and top-tier accessories at best prices.
              </p>
            </div>
            <div className="col-md-4">
              <h6 className="fw-bold text-white mb-2">Quick Navigation</h6>
              <ul className="list-unstyled small text-white-50 m-0 d-flex flex-column gap-1">
                <li><a href="#home" className="text-white-50 text-decoration-none" onClick={handleResetToAllCatalog}>Home Catalog</a></li>
                <li><span style={{ cursor: 'pointer' }} onClick={() => setShowOrderTracking(true)}>Track My Orders</span></li>
                <li><span style={{ cursor: 'pointer' }} onClick={() => setShowCartModal(true)}>My Shopping Cart</span></li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="fw-bold text-white mb-2">Customer Support</h6>
              <p className="small text-white-50 mb-1"><i className="bi bi-shield-check text-success me-1"></i> 100% Safe & Verified Payments</p>
              <p className="small text-white-50 mb-0"><i className="bi bi-truck text-info me-1"></i> Express Pan-India Delivery</p>
            </div>
          </div>
          <hr className="my-3 border-secondary" />
          <div className="text-center text-white-50 small">
            © 2026 TechStore Inc. All rights reserved. Built with React & MongoDB.
          </div>
        </div>
      </footer>

      {/* FLOATING COMPACT AI HELPER ASSISTANT */}
      <div className="position-fixed bottom-0 end-0 m-2 m-md-3 z-3">
        {showChatbot ? (
          <div className="card shadow-lg border-0" style={{ width: '280px', height: '360px' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
              <span className="fw-bold small"><i className="bi bi-robot me-1"></i>Store AI Assistant</span>
              <button className="btn-close btn-close-white" onClick={() => setShowChatbot(false)}></button>
            </div>
            <div className="card-body overflow-auto p-2 bg-light">
              <div className="bg-white p-2 rounded mb-2 shadow-sm small">👋 Hello! How can I help you find products or track your order today?</div>
            </div>
            <div className="card-footer p-2 bg-white">
              <input type="text" className="form-control form-control-sm" placeholder="Ask AI assistant..." />
            </div>
          </div>
        ) : (
          <button 
            className="btn btn-primary rounded-circle shadow-lg fw-bold d-flex align-items-center justify-content-center" 
            style={{ width: '48px', height: '48px', fontSize: '12px' }}
            onClick={() => setShowChatbot(true)}
            title="AI Assistant"
          >
            💬 AI
          </button>
        )}
      </div>

      {/* CART MODAL */}
      {showCartModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-header-title fw-bold text-warning mb-0">Your Shopping Cart</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCartModal(false)}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-muted">Your cart is currently empty.</div>
                ) : (
                  <div>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th className="text-center">Qty</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item._id}>
                              <td className="fw-bold small">{item.name}</td>
                              <td className="small">₹{item.price}</td>
                              <td className="text-center">
                                <div className="d-inline-flex align-items-center border rounded bg-light px-1">
                                  <button 
                                    className="btn btn-sm btn-link text-danger text-decoration-none fw-bold px-2 py-0 fs-5"
                                    onClick={() => updateCartQty(item._id, -1)}
                                    title="Decrease quantity"
                                  >
                                    -
                                  </button>
                                  <span className="fw-bold px-2 small">{item.qty}</span>
                                  <button 
                                    className="btn btn-sm btn-link text-success text-decoration-none fw-bold px-2 py-0 fs-5"
                                    onClick={() => updateCartQty(item._id, 1)}
                                    title="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="fw-bold text-success small">₹{item.price * item.qty}</td>
                              <td>
                                <button className="btn btn-outline-danger btn-sm py-0 px-2 small" onClick={() => removeFromCart(item._id)}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-light rounded border my-3">
                      <div className="mb-2">
                        <span className="fw-bold small text-dark d-block mb-1">
                          <i className="bi bi-tag-fill text-warning me-1"></i> Available Live Promo Coupons (Click to Apply):
                        </span>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          {coupons.map((c, idx) => {
                            const maxU = Number(c.maxUsage) || 100;
                            const usedU = Number(c.usedCount) || 0;
                            const remaining = Math.max(0, maxU - usedU);

                            return (
                              <button
                                key={c.id || idx}
                                type="button"
                                className={`btn btn-sm ${remaining === 0 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'} fw-bold rounded-pill px-3`}
                                onClick={() => remaining > 0 && handleApplyCouponCode(c.code)}
                                disabled={remaining === 0}
                              >
                                🏷️ {c.code} ({c.discount}% OFF on {c.category || 'All'} - {remaining} left)
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="form-label fw-bold small text-secondary">Or Enter Discount Coupon Code Manually:</label>
                      <form onSubmit={handleApplyCoupon} className="input-group">
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. PAPAJIONTOP, NV7GOAT, TECH10" 
                          value={couponCode} 
                          onChange={(e) => setCouponCode(e.target.value)} 
                        />
                        <button type="submit" className="btn btn-dark fw-bold">Apply Code</button>
                      </form>
                      {couponMessage && (
                        <small className={`fw-bold mt-1 d-block ${appliedCoupon ? 'text-success' : 'text-danger'}`}>
                          {couponMessage}
                        </small>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
                      <div>
                        {appliedCoupon && discountAmount > 0 && (
                          <span className="text-muted text-decoration-line-through d-block small">Subtotal: ₹{rawCartTotal}</span>
                        )}
                        <h4 className="fw-bold m-0 fs-5">Final Total: <span className="text-success">₹{finalCartTotal}</span></h4>
                      </div>
                      <button 
                        className="btn btn-success fw-bold px-4 py-2" 
                        onClick={() => { setShowCartModal(false); setShowCheckoutModal(true); }}
                      >
                        Proceed to Checkout &rrarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">📦 Secure Shipping & Payment Checkout</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCheckoutModal(false)}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                <form onSubmit={handlePlaceOrder}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Full Name</label>
                      <input type="text" className="form-control" required value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone Number</label>
                      <input type="tel" className="form-control" required value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="+91 9876543210" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Complete Shipping Address</label>
                      <textarea className="form-control" rows="2" required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="House No, Building, Street, Area, Pincode"></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Select Payment Method</label>
                      <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                        <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded mt-4 border d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <span className="text-muted small d-block">Payable Amount ({cartItemCount} Items)</span>
                      <span className="fs-5 fw-bold text-success">₹{finalCartTotal}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-outline-secondary btn-sm fw-bold" onClick={() => { setShowCheckoutModal(false); setShowCartModal(true); }}>Back</button>
                      <button type="submit" className="btn btn-success btn-sm fw-bold px-3 py-2">Confirm & Place Order</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY ORDERS TRACKING MODAL */}
      {showOrderTracking && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold mb-0">
                  <i className="bi bi-truck me-2"></i>My Placed Orders & Live Tracking
                  {user && <small className="d-block text-white-50 fs-6 fw-normal">Account: {user.email}</small>}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowOrderTracking(false)}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                {userOrders.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-box-seam fs-1 text-secondary d-block mb-2"></i>
                    <h5>No orders placed yet for this account.</h5>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {userOrders.map((ord) => {
                      const stepNum = getOrderStep(ord.status);

                      return (
                        <div key={ord._id} className="card border shadow-sm p-3 bg-white rounded-3">
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                            <div>
                              <span className="fw-bold text-primary small">Order #{ord._id}</span>
                              <small className="text-muted ms-2 d-block d-sm-inline">
                                ({ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent Order'})
                              </small>
                            </div>
                            <span className={`badge px-2 py-1 small ${
                              ord.status === 'Delivered' ? 'bg-success' : 
                              ord.status === 'In Transit' || ord.status === 'Shipped' || ord.status === 'Out for Delivery' ? 'bg-primary' :
                              ord.status && ord.status.includes('Return') ? 'bg-warning text-dark' :
                              ord.status && ord.status.includes('Refund') ? 'bg-info text-dark' :
                              ord.status === 'Cancelled' ? 'bg-danger' : 'bg-warning text-dark'
                            }`}>
                              {ord.status || 'Processing'}
                            </span>
                          </div>

                          {(!ord.status || (!ord.status.includes('Return') && !ord.status.includes('Refund') && ord.status !== 'Cancelled')) && (
                            <div className="mb-4 p-2 p-md-3 bg-light rounded border">
                              <div className="d-flex justify-content-between align-items-center position-relative">
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-secondary bg-opacity-25" style={{ height: '4px', width: '100%', zIndex: 0 }}></div>
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-success transition-all" style={{ height: '4px', width: `${((stepNum - 1) / 3) * 100}%`, zIndex: 1, transition: 'width 0.4s ease' }}></div>

                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 1 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '28px', height: '28px', fontSize: '12px' }}>✓</div>
                                  <small className="fw-bold d-block mt-1 text-dark" style={{ fontSize: '10px' }}>Placed</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 2 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '28px', height: '28px', fontSize: '12px' }}>{stepNum >= 2 ? '✓' : '2'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 2 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '10px' }}>Processing</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 3 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '28px', height: '28px', fontSize: '12px' }}>{stepNum >= 3 ? '✓' : '3'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 3 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '10px' }}>In Transit</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 4 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '28px', height: '28px', fontSize: '12px' }}>{stepNum >= 4 ? '✓' : '4'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 4 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '10px' }}>Delivered</small>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mb-3">
                            <span className="fw-bold small text-secondary d-block mb-1">Purchased Products:</span>
                            <div className="d-flex flex-wrap gap-2">
                              {ord.orderItems && ord.orderItems.map((item, idx) => (
                                <div key={idx} className="d-flex align-items-center gap-2 p-2 rounded border bg-light shadow-sm" style={{ cursor: 'pointer' }} onClick={() => handleNavigateToProduct(item)}>
                                  <img src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80'} alt={item.name} className="rounded border bg-white" width="40" height="40" style={{ objectFit: 'cover' }} />
                                  <div>
                                    <div className="fw-bold small text-dark text-truncate" style={{ maxWidth: '120px' }}>{item.name}</div>
                                    <span className="badge bg-secondary" style={{ fontSize: '9px' }}>Qty: {item.qty || 1}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                            <span className="fw-bold text-success small">Total Amount: ₹{ord.totalPrice}</span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark border me-1 small">{ord.paymentMethod || 'COD'}</span>
                              {ord.status === 'Delivered' && (
                                <button className="btn btn-sm btn-outline-danger fw-bold py-0 px-2 small" onClick={() => handleOpenReturnModal(ord)}>🔄 Return</button>
                              )}
                              {ord.status === 'Delivered' && (
                                submittedReviews[ord._id] ? (
                                  <span className="badge bg-warning text-dark fw-bold small">⭐ Rated {submittedReviews[ord._id].rating}/5</span>
                                ) : (
                                  <button className="btn btn-sm btn-outline-warning text-dark fw-bold py-0 px-2 small" onClick={() => handleOpenReviewModal(ord)}>⭐ Review</button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && selectedOrderForReview && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">⭐ Rate & Review Delivered Product</h5>
                <button type="button" className="btn-close" onClick={() => setShowReviewModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmitReview}>
                  <div className="mb-3 text-center">
                    <label className="form-label fw-bold d-block">Select Your Rating:</label>
                    <div className="fs-2 d-flex justify-content-center gap-2" style={{ cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} onClick={() => setRatingStars(star)} style={{ color: star <= ratingStars ? '#ffc107' : '#e4e5e9' }}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Your Review Comment:</label>
                    <textarea className="form-control" rows="3" required placeholder="Share your experience..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-warning fw-bold text-dark px-4">Submit Review</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnModal && selectedOrderForReturn && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">🔄 Request Order Return / Replacement</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReviewModalReturn(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmitReturnRequest}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Return Type:</label>
                    <select className="form-select fw-bold" value={returnTypeOption} onChange={(e) => setReturnTypeOption(e.target.value)}>
                      <option value="Refund">💵 Money Refund</option>
                      <option value="Replacement">🔄 Item Replacement</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Reason:</label>
                    <select className="form-select" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                      <option value="Damaged or Defective Item">Damaged or Defective Item</option>
                      <option value="Wrong Item Shipped">Wrong Item Shipped</option>
                      <option value="Size or Fitting Issue">Size or Fitting Issue</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Comments:</label>
                    <textarea className="form-control" rows="3" required placeholder="Explain details..." value={returnComments} onChange={(e) => setReturnComments(e.target.value)}></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReviewModalReturn(false)}>Cancel</button>
                    <button type="submit" className="btn btn-danger fw-bold px-4">Submit Request</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIGNUP MODAL */}
      {showSignupModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold">📝 Customer Sign Up</h5>
                <button type="button" className="btn-close" onClick={() => setShowSignupModal(false)}></button>
              </div>
              <form onSubmit={handleEmailSignupSubmit}>
                <div className="mb-2">
                  <input type="text" className="form-control" placeholder="Full Name" required value={signupData.name} onChange={(e) => setSignupData({...signupData, name: e.target.value})} />
                </div>
                <div className="mb-2">
                  <input type="email" className="form-control" placeholder="Email ID" required value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} />
                </div>
                
                {/* PASSWORD FIELD WITH EYE TOGGLE ICON */}
                <div className="mb-2 input-group">
                  <input 
                    type={showSignupPassword ? "text" : "password"} 
                    className="form-control" 
                    placeholder="Password" 
                    required 
                    value={signupData.password} 
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary bg-white text-dark"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    <i className={`bi ${showSignupPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>

                <div className="mb-2">
                  <input type="tel" className="form-control" placeholder="Mobile Number" required value={signupData.mobile} onChange={(e) => setSignupData({...signupData, mobile: e.target.value})} />
                </div>
                <div className="mb-2">
                  <textarea className="form-control" rows="2" placeholder="Shipping Address" required value={signupData.address} onChange={(e) => setSignupData({...signupData, address: e.target.value})}></textarea>
                </div>
                <div className="mb-3">
                  <input type="text" className="form-control" placeholder="Pincode" required value={signupData.pincode} onChange={(e) => setSignupData({...signupData, pincode: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-warning w-100 fw-bold py-2">Register & Sign Up</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-warning">🔓 Sign In to TechStore</h5>
                <button type="button" className="btn-close" onClick={() => setShowLoginModal(false)}></button>
              </div>
              <form onSubmit={handleEmailLoginSubmit}>
                <div className="mb-3">
                  <input type="email" className="form-control" placeholder="Email ID" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} />
                </div>
                
                {/* PASSWORD FIELD WITH EYE TOGGLE ICON */}
                <div className="mb-3 input-group">
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    className="form-control" 
                    placeholder="Password" 
                    required 
                    value={loginData.password} 
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary bg-white text-dark"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    <i className={`bi ${showLoginPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>

                <button type="submit" className="btn btn-dark w-100 fw-bold py-2 text-warning">Sign In</button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;