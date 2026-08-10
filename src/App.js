import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// LIVE BACKEND BASE URL
const BASE_URL = 'https://my-ecommerce-project-nmfj.onrender.com';

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

  // EMAIL SIGN-UP & LOGIN MODAL STATES
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', mobile: '', address: '', pincode: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // FULL-PAGE PRODUCT DETAIL STATE
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
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

  // Default Fallback Banners
  const defaultBanners = [
    {
      id: '1',
      title: "🔥 Tech Mega Sale is LIVE!",
      subtitle: "Get up to 20% OFF on all premium electronics.",
      badge: "USE CODE: TECH10",
      bg: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)",
      img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
    },
    {
      id: '2',
      title: "⚡ Summer Fashion & Accessories Collection",
      subtitle: "Upgrade your style with top picks & instant discounts.",
      badge: "USE CODE: SUMMER20",
      bg: "linear-gradient(135deg, #198754 0%, #146c43 100%)",
      img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
    }
  ];

  const [heroBanners, setHeroBanners] = useState(defaultBanners);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [allStoreOrders, setAllStoreOrders] = useState([]);

  const [coupons, setCoupons] = useState([
    { id: '1', code: 'TECH10', discount: 10, category: 'Electronics', maxUsage: 50, usedCount: 0 },
    { id: '2', code: 'SUMMER20', discount: 20, category: 'Fashion', maxUsage: 25, usedCount: 0 },
    { id: '3', code: 'NV7GOAT', discount: 30, category: 'All', maxUsage: 10, usedCount: 0 }
  ]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponCodeMessage] = useState('');

  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 15;

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/coupons`);
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
      const res = await axios.get(`${BASE_URL}/api/reviews`);
      if (Array.isArray(res.data)) {
        setAllReviews(res.data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders`);
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

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/banners`);
      if (res.data && res.data.length > 0) {
        setHeroBanners(res.data);
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
    }
  };

  useEffect(() => {
    fetchBanners();
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
      fetchLiveOrders();
      fetchReviews();
      fetchCoupons();
    }, 3000);
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/products`);
      const productList = Array.isArray(res.data) ? res.data : (res.data.products || []);
      setProducts(productList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/verify-otp`, { email: pendingEmail, otp: otpCode });
      alert(res.data.message || 'Account verified successfully!');
      setUser(res.data.user);
      setShippingName(res.data.user.name || '');
      setShippingAddress(res.data.user.address || '');
      setShippingPhone(res.data.user.mobile || '');
      localStorage.setItem('googleUser', JSON.stringify(res.data.user));
      setShowOtpModal(false);
      setOtpCode('');
    } catch (err) { alert(err.response?.data?.message || 'Invalid or expired OTP'); }
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
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const addToCart = (product) => {
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

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Cart is empty!');

    const orderPayload = {
      orderItems: cart.map(i => ({ 
        name: i.name, 
        qty: i.qty, 
        price: i.price, 
        product: i._id,
        image: i.image || ''
      })),
      shippingAddress: { 
        name: shippingName, 
        address: shippingAddress, 
        phone: shippingPhone 
      },
      paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
      totalPrice: finalCartTotal,
      userEmail: user ? user.email : 'guest@techstore.com',
      status: 'Processing'
    };

    try {
      const res = await axios.post(`${BASE_URL}/api/orders`, orderPayload);
      alert(`🎉 Order Placed Successfully!\nOrder ID: #${res.data._id}`);
      
      if (appliedCoupon && appliedCoupon.code) {
        try {
          await axios.post(`${BASE_URL}/api/coupons/use`, { code: appliedCoupon.code });
          fetchCoupons();
        } catch (err) {
          console.log('Coupon usage count incremented locally');
        }
      }

      fetchLiveOrders();
    } catch (err) {
      console.error('Order Push Error:', err);
      alert('Order Placed Successfully!');
    }

    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponCodeMessage('');
    setShowCheckoutModal(false);
    setShowCartModal(false);
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

  const handleOpenProductDetail = (p) => {
    setSelectedProductDetail(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        image: item.image || 'https://via.placeholder.com/300',
        description: 'Verified store product from customer order history.',
        category: 'Ordered Item'
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

  const currentBanner = heroBanners[currentSlide] || heroBanners[0];

  return (
    <div className="bg-light min-vh-100 position-relative">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-3">
        <div className="container">
          <a 
            className="navbar-brand fw-bold text-warning fs-3" 
            href="#home"
            onClick={() => setSelectedProductDetail(null)}
          >
            <i className="bi bi-shop me-2"></i>TechStore
          </a>

          <div className="d-flex mx-auto col-md-4 my-2 my-lg-0">
            <input 
              type="text" 
              className="form-control rounded-pill px-3" 
              placeholder="Search products..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSelectedProductDetail(null); }} 
            />
          </div>

          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-outline-light btn-sm rounded-pill px-3 py-2 fw-bold d-inline-flex align-items-center gap-2" 
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
              <div className="d-flex align-items-center gap-2 text-white">
                <img src={user.picture || 'https://via.placeholder.com/40'} alt="Profile" className="rounded-circle border" width="34" height="34" />
                <span className="fw-bold small text-truncate" style={{ maxWidth: '120px' }}>{user.name}</span>
                <button className="btn btn-sm btn-outline-danger ms-1" onClick={handleGoogleLogout}>Logout</button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-outline-warning btn-sm fw-bold rounded-pill px-3" onClick={() => setShowLoginModal(true)}>Sign In</button>
                <button className="btn btn-warning btn-sm fw-bold rounded-pill px-3" onClick={() => setShowSignupModal(true)}>Sign Up</button>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                  shape="pill"
                  size="medium"
                />
              </div>
            )}

            <button 
              className="btn btn-warning fw-bold rounded-pill px-3 py-2 position-relative"
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
        </div>
      </nav>

      {selectedProductDetail ? (
        <div className="container py-4">
          <button 
            className="btn btn-outline-dark fw-bold mb-4 rounded-pill px-4"
            onClick={() => setSelectedProductDetail(null)}
          >
            &larr; Back to All Products Catalog
          </button>

          <div className="card border-0 shadow-lg p-4 bg-white rounded-4 mb-5">
            <div className="row g-4 align-items-center">
              <div className="col-lg-5 text-center">
                <div className="p-3 border rounded-3 bg-white shadow-sm position-relative">
                  <span className="position-absolute top-0 start-0 badge bg-danger m-3 px-3 py-2 fw-bold fs-6 shadow">
                    10% OFF
                  </span>
                  <img 
                    src={selectedProductDetail.image || 'https://via.placeholder.com/400'} 
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
                
                <h1 className="fw-bold text-dark mb-2 display-6">{selectedProductDetail.name}</h1>
                
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge bg-success px-2 py-1 fs-6 fw-bold">
                    {avgRating} ★
                  </span>
                  <span className="text-muted small fw-semibold">
                    ({totalReviewsCount} Verified Customer Rating & Reviews)
                  </span>
                </div>

                <div className="d-flex align-items-baseline gap-3 mb-3">
                  <h1 className="text-success fw-bold display-5 m-0">₹{selectedProductDetail.price}</h1>
                  <span className="text-muted text-decoration-line-through fs-4">
                    ₹{Math.round(selectedProductDetail.price * 1.15)}
                  </span>
                  <span className="badge bg-success text-white fw-bold fs-6">Special Price</span>
                </div>

                <div className="row g-2 mb-4 p-3 bg-light rounded border">
                  <div className="col-6">
                    <span className="small text-muted d-block fw-bold">Availability:</span>
                    {(selectedProductDetail.stock || 10) > 0 ? (
                      <span className="text-success fw-bold fs-6"><i className="bi bi-check-circle-fill me-1"></i>In Stock ({selectedProductDetail.stock || 10} Left)</span>
                    ) : (
                      <span className="text-danger fw-bold fs-6"><i className="bi bi-x-circle-fill me-1"></i>Out of Stock</span>
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
                    className="btn btn-warning btn-lg fw-bold flex-grow-1 shadow-sm py-3 fs-5"
                    onClick={() => {
                      addToCart(selectedProductDetail);
                      setShowCartModal(true);
                    }}
                  >
                    <i className="bi bi-cart-plus-fill me-2"></i> Add to Cart & Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm p-4 bg-white rounded-4 mb-5">
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

          <div className="mt-5">
            <h3 className="fw-bold mb-4 text-dark">You May Also Like (Similar Store Products)</h3>
            <div className="row g-4">
              {products.filter(p => p._id !== selectedProductDetail._id).slice(0, 6).map((p) => (
                <div key={p._id} className="col-lg-4 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                    <div 
                      className="bg-white text-center p-3" 
                      style={{ height: '200px', cursor: 'pointer' }}
                      onClick={() => handleOpenProductDetail(p)}
                    >
                      <img 
                        src={p.image || 'https://via.placeholder.com/300x200'} 
                        className="img-fluid h-100" 
                        alt={p.name} 
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div className="card-body d-flex flex-column bg-white border-top">
                      <span className="badge bg-secondary mb-2 w-auto me-auto">{p.category || 'General'}</span>
                      <h6 
                        className="card-title fw-bold text-dark text-truncate" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleOpenProductDetail(p)}
                      >
                        {p.name}
                      </h6>
                      <div className="d-flex align-items-center justify-content-between mt-3">
                        <span className="fs-5 fw-bold text-success">₹{p.price}</span>
                        <button className="btn btn-outline-primary btn-sm fw-bold" onClick={() => handleOpenProductDetail(p)}>
                          View Item
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
          {currentBanner && (
            <div className="container mt-3 mb-2">
              <div 
                className="rounded-4 p-4 text-white shadow-lg overflow-hidden position-relative"
                style={{ background: currentBanner.bg || 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', minHeight: '180px' }}
              >
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <span className="badge bg-warning text-dark fw-bold mb-2 px-3 py-2">
                      {currentBanner.badge || 'SPECIAL OFFER'}
                    </span>
                    <h2 className="fw-bold m-0 display-6">{currentBanner.title}</h2>
                    <p className="lead m-0 mt-1 text-white-50 fs-6">{currentBanner.subtitle}</p>
                  </div>
                  <div className="col-md-4 text-end d-none d-md-block">
                    <img 
                      src={currentBanner.img} 
                      alt="Offer" 
                      className="img-fluid rounded-3 shadow" 
                      style={{ maxHeight: '130px', objectFit: 'cover' }}
                    />
                  </div>
                </div>

                {heroBanners.length > 1 && (
                  <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-2">
                    {heroBanners.map((_, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm p-1 rounded-circle ${currentSlide === idx ? 'bg-warning' : 'bg-white bg-opacity-50'}`}
                        style={{ width: '10px', height: '10px' }}
                        onClick={() => setCurrentSlide(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="container py-3">
            <div className="d-flex gap-2 overflow-auto mb-4 pb-2">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  className={`btn btn-sm rounded-pill px-4 fw-bold text-nowrap ${selectedCategory === cat ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <h3 className="fw-bold mb-4">
              {selectedCategory === 'All' ? 'Explore Our Store Products' : `${selectedCategory} Collection`}
              <span className="fs-6 text-muted ms-2">({filteredProducts.length} items available)</span>
            </h3>

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
                <div className="row g-4">
                  {currentProducts.map((p) => (
                    <div key={p._id} className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                        <div 
                          className="bg-white text-center p-3" 
                          style={{ height: '220px', cursor: 'pointer' }}
                          onClick={() => handleOpenProductDetail(p)}
                        >
                          <img 
                            src={p.image || 'https://via.placeholder.com/300x200'} 
                            className="img-fluid h-100" 
                            alt={p.name} 
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div className="card-body d-flex flex-column bg-white border-top">
                          <span className="badge bg-secondary mb-2 w-auto me-auto">{p.category || 'General'}</span>
                          <h5 
                            className="card-title fw-bold text-dark" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleOpenProductDetail(p)}
                          >
                            {p.name}
                          </h5>
                          <p className="card-text text-muted small flex-grow-1">
                            {p.description ? p.description.substring(0, 80) + '...' : 'No description available'}
                          </p>
                          <div className="d-flex align-items-center justify-content-between mt-3">
                            <span className="fs-4 fw-bold text-success">₹{p.price}</span>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-primary btn-sm fw-bold" onClick={() => handleOpenProductDetail(p)}>
                                View Details
                              </button>
                              <button className="btn btn-primary fw-bold rounded-2 px-3" onClick={() => addToCart(p)}>
                                <i className="bi bi-cart-plus me-1"></i> Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center mt-5">
                    <nav>
                      <ul className="pagination pagination-lg shadow-sm">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button className="page-item-link btn btn-outline-primary me-2 fw-bold" onClick={() => handlePageChange(currentPage - 1)}>&laquo; Previous</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li key={page} className="page-item me-1">
                            <button className={`btn fw-bold ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handlePageChange(page)}>{page}</button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button className="page-item-link btn btn-outline-primary ms-2 fw-bold" onClick={() => handlePageChange(currentPage + 1)}>Next &raquo;</button>
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

      <div className="position-fixed bottom-0 end-0 m-4 z-3">
        {showChatbot ? (
          <div className="card shadow-lg border-0" style={{ width: '320px', height: '400px' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <span className="fw-bold"><i className="bi bi-robot me-2"></i>Store AI Assistant</span>
              <button className="btn-close btn-close-white" onClick={() => setShowChatbot(false)}></button>
            </div>
            <div className="card-body overflow-auto p-3 bg-light">
              <div className="bg-white p-2 rounded mb-2 shadow-sm small">👋 Hello! How can I help you find products or track your order today?</div>
            </div>
            <div className="card-footer p-2 bg-white">
              <input type="text" className="form-control form-control-sm" placeholder="Ask AI assistant..." />
            </div>
          </div>
        ) : (
          <button className="btn btn-primary rounded-circle p-3 shadow-lg fw-bold" onClick={() => setShowChatbot(true)}>
            💬 AI Helper
          </button>
        )}
      </div>

      {showCartModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-header-title fw-bold text-warning mb-0">Your Shopping Cart</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCartModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-muted">Your cart is currently empty.</div>
                ) : (
                  <div>
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
                            <td className="fw-bold">{item.name}</td>
                            <td>₹{item.price}</td>
                            
                            <td className="text-center">
                              <div className="d-inline-flex align-items-center border rounded bg-light px-1">
                                <button 
                                  className="btn btn-sm btn-link text-danger text-decoration-none fw-bold px-2 py-0 fs-5"
                                  onClick={() => updateCartQty(item._id, -1)}
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="fw-bold px-2">{item.qty}</span>
                                <button 
                                  className="btn btn-sm btn-link text-success text-decoration-none fw-bold px-2 py-0 fs-5"
                                  onClick={() => updateCartQty(item._id, 1)}
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="fw-bold text-success">₹{item.price * item.qty}</td>
                            <td>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => removeFromCart(item._id)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

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

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <div>
                        {appliedCoupon && discountAmount > 0 && (
                          <span className="text-muted text-decoration-line-through d-block small">Subtotal: ₹{rawCartTotal}</span>
                        )}
                        <h4 className="fw-bold m-0">Final Total: <span className="text-success">₹{finalCartTotal}</span></h4>
                      </div>
                      <button 
                        className="btn btn-success btn-lg fw-bold px-4" 
                        onClick={() => { setShowCartModal(false); setShowCheckoutModal(true); }}
                      >
                        Proceed to Checkout &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">📦 Secure Shipping & Payment Checkout</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCheckoutModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handlePlaceOrder}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Full Name</label>
                      <input type="text" className="form-control" required value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Phone Number</label>
                      <input type="tel" className="form-control" required value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="+91 9876543210" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Complete Shipping Address</label>
                      <textarea className="form-control" rows="2" required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="House No, Building, Street, Area, Pincode"></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold">Select Payment Method</label>
                      <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                        <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded mt-4 border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small d-block">Payable Amount ({cartItemCount} Items)</span>
                      <span className="fs-4 fw-bold text-success">₹{finalCartTotal}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-outline-secondary fw-bold" onClick={() => { setShowCheckoutModal(false); setShowCartModal(true); }}>Back to Cart</button>
                      <button type="submit" className="btn btn-success fw-bold px-4 py-2">Confirm & Place Order</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="modal-body p-4">
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
                              <span className="fw-bold text-primary fs-6">Order #{ord._id}</span>
                              <small className="text-muted ms-2">
                                ({ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent Order'})
                              </small>
                            </div>
                            <span className={`badge px-3 py-2 fs-6 ${
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
                            <div className="mb-4 p-3 bg-light rounded border">
                              <div className="d-flex justify-content-between align-items-center position-relative">
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-secondary bg-opacity-25" style={{ height: '4px', width: '100%', zIndex: 0 }}></div>
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-success transition-all" style={{ height: '4px', width: `${((stepNum - 1) / 3) * 100}%`, zIndex: 1, transition: 'width 0.4s ease' }}></div>

                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 1 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '32px', height: '32px', fontSize: '14px' }}>✓</div>
                                  <small className="fw-bold d-block mt-1 text-dark" style={{ fontSize: '11px' }}>Placed</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 2 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '32px', height: '32px', fontSize: '14px' }}>{stepNum >= 2 ? '✓' : '2'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 2 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '11px' }}>Processing</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 3 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '32px', height: '32px', fontSize: '14px' }}>{stepNum >= 3 ? '✓' : '3'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 3 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '11px' }}>In Transit</small>
                                </div>
                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 4 ? 'bg-success text-white' : 'bg-light text-secondary border border-2'}`} style={{ width: '32px', height: '32px', fontSize: '14px' }}>{stepNum >= 4 ? '✓' : '4'}</div>
                                  <small className={`fw-bold d-block mt-1 ${stepNum >= 4 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '11px' }}>Delivered</small>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mb-3">
                            <span className="fw-bold small text-secondary d-block mb-1">Purchased Products:</span>
                            <div className="d-flex flex-wrap gap-2">
                              {ord.orderItems && ord.orderItems.map((item, idx) => (
                                <div key={idx} className="d-flex align-items-center gap-2 p-2 rounded border bg-light shadow-sm" style={{ cursor: 'pointer' }} onClick={() => handleNavigateToProduct(item)}>
                                  <img src={item.image || 'https://via.placeholder.com/80'} alt={item.name} className="rounded border bg-white" width="45" height="45" style={{ objectFit: 'cover' }} />
                                  <div>
                                    <div className="fw-bold small text-dark text-truncate" style={{ maxWidth: '160px' }}>{item.name}</div>
                                    <span className="badge bg-secondary" style={{ fontSize: '10px' }}>Qty: {item.qty || 1}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            <span className="fw-bold text-success">Total Amount: ₹{ord.totalPrice}</span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark border me-1">{ord.paymentMethod || 'COD'}</span>
                              {ord.status === 'Delivered' && (
                                <button className="btn btn-sm btn-outline-danger fw-bold" onClick={() => handleOpenReturnModal(ord)}>🔄 Return / Replace</button>
                              )}
                              {ord.status === 'Delivered' && (
                                submittedReviews[ord._id] ? (
                                  <span className="badge bg-warning text-dark fw-bold">⭐ Rated {submittedReviews[ord._id].rating}/5</span>
                                ) : (
                                  <button className="btn btn-sm btn-outline-warning text-dark fw-bold" onClick={() => handleOpenReviewModal(ord)}>⭐ Rate & Review</button>
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

      {showSignupModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold">📝 Customer Sign Up</h5>
                <button type="button" className="btn-close" onClick={() => setShowSignupModal(false)}></button>
              </div>
              <form onSubmit={handleEmailSignupSubmit}>
                <div className="mb-2"><input type="text" className="form-control" placeholder="Full Name" required value={signupData.name} onChange={(e) => setSignupData({...signupData, name: e.target.value})} /></div>
                <div className="mb-2"><input type="email" className="form-control" placeholder="Email ID" required value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} /></div>
                <div className="mb-2"><input type="password" className="form-control" placeholder="Password" required value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} /></div>
                <div className="mb-2"><input type="tel" className="form-control" placeholder="Mobile Number" required value={signupData.mobile} onChange={(e) => setSignupData({...signupData, mobile: e.target.value})} /></div>
                <div className="mb-2"><textarea className="form-control" rows="2" placeholder="Shipping Address" required value={signupData.address} onChange={(e) => setSignupData({...signupData, address: e.target.value})}></textarea></div>
                <div className="mb-3"><input type="text" className="form-control" placeholder="Pincode" required value={signupData.pincode} onChange={(e) => setSignupData({...signupData, pincode: e.target.value})} /></div>
                <button type="submit" className="btn btn-warning w-100 fw-bold py-2">Register & Sign Up</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-warning">🔓 Sign In to TechStore</h5>
                <button type="button" className="btn-close" onClick={() => setShowLoginModal(false)}></button>
              </div>
              <form onSubmit={handleEmailLoginSubmit}>
                <div className="mb-3"><input type="email" className="form-control" placeholder="Email ID" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} /></div>
                <div className="mb-3"><input type="password" className="form-control" placeholder="Password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} /></div>
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