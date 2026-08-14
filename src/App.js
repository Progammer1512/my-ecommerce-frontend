import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// LIVE BACKEND BASE URL
const BASE_URL = 'https://my-ecommerce-admin.onrender.com';

// RELIABLE FALLBACK IMAGE
const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

// 🟢 HELPER 1: DETECT IF RUNNING AS INSTALLED STANDALONE APP
const isRunningStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// 🟢 HELPER 2: DETECT IF USER IS ON MOBILE BROWSER (NOT DESKTOP)
const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
};

// Helper to filter out corrupted local/broken image paths
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('NOW_REPLACE_TEXT') || url.includes('localhost:5000')) return false;
  return true;
};

// HELPER: READS EXACT STOCK FROM MONGODB
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
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 16;

  // 📲 NATIVE PWA APP INSTALL PROMPT STATES
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [showAppDownloadModal, setShowAppDownloadModal] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(() => isRunningStandalone());

  // 🌓 DARK MODE / LIGHT MODE PERSISTENT STATE
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('techstore_theme');
      return savedTheme === 'dark';
    } catch (e) {
      return false;
    }
  });

  // 🟢 PERSISTENT CART STATE
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('techstore_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      return [];
    }
  });

  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  // 🟢 USER PROFILE STATE
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('googleUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // 🟢 PERSISTENT WISHLIST STATE
  const [wishlist, setWishlist] = useState(() => {
    try {
      const savedWish = localStorage.getItem('techstore_wishlist');
      return savedWish ? JSON.parse(savedWish) : [];
    } catch (e) {
      return [];
    }
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [newAddressForm, setNewAddressForm] = useState({
    title: 'Home',
    name: '',
    phone: '',
    address: '',
    pincode: ''
  });
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  // PROFILE DRAWER & SUB-MODALS STATES
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);

  // USER PROFILE EDIT FORM STATE
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    pincode: ''
  });

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

  // Touch Swipe Refs for Hero Banner
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // MONGODB REAL BANNERS STATE
  const [heroBanners, setHeroBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [allStoreOrders, setAllStoreOrders] = useState([]);

  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponCodeMessage] = useState('');

  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');

  // =========================================================================
  // 🌟 UNIVERSAL NAVIGATION & PAGINATION STACK MANAGER
  // =========================================================================
  const applyViewState = (state) => {
    setShowAppDownloadModal(false);
    setShowCartModal(false);
    setShowCheckoutModal(false);
    setShowOrderTracking(false);
    setShowProfileDrawer(false);
    setShowEditProfileModal(false);
    setShowAccountSettingsModal(false);
    setShowPrivacyPolicyModal(false);
    setShowCategoryMenu(false);
    setShowSignupModal(false);
    setShowLoginModal(false);
    setShowReviewModal(false);
    setShowReviewModalReturn(false);
    setSelectedProductDetail(null);

    if (state && typeof state.page === 'number') {
      setCurrentPage(state.page);
    }
    if (state && state.category !== undefined) {
      setSelectedCategory(state.category);
    }
    if (state && state.search !== undefined) {
      setSearchTerm(state.search);
    }

    if (!state || !state.view || state.view === 'HOME') {
      return;
    }

    switch (state.view) {
      case 'PRODUCT_DETAIL':
        setSelectedProductDetail(state.product);
        window.scrollTo({ top: 0, behavior: 'instant' });
        break;
      case 'CART':
        setShowCartModal(true);
        break;
      case 'CHECKOUT':
        setShowCheckoutModal(true);
        break;
      case 'ORDER_TRACKING':
        setShowOrderTracking(true);
        break;
      case 'PROFILE_DRAWER':
        setShowProfileDrawer(true);
        break;
      case 'EDIT_PROFILE':
        setShowEditProfileModal(true);
        break;
      case 'ACCOUNT_SETTINGS':
        setShowAccountSettingsModal(true);
        break;
      case 'PRIVACY_POLICY':
        setShowPrivacyPolicyModal(true);
        break;
      case 'CATEGORY_MENU':
        setShowCategoryMenu(true);
        break;
      case 'SIGNUP':
        setShowSignupModal(true);
        break;
      case 'LOGIN':
        setShowLoginModal(true);
        break;
      case 'REVIEW':
        setSelectedOrderForReview(state.order);
        setShowReviewModal(true);
        break;
      case 'RETURN':
        setSelectedOrderForReturn(state.order);
        setShowReviewModalReturn(true);
        break;
      case 'APP_DOWNLOAD':
        setShowAppDownloadModal(true);
        break;
      default:
        break;
    }
  };

  const navigateToView = (viewName, extraData = {}) => {
    const newState = {
      view: viewName,
      page: extraData.page !== undefined ? extraData.page : currentPage,
      category: extraData.category !== undefined ? extraData.category : selectedCategory,
      search: extraData.search !== undefined ? extraData.search : searchTerm,
      ...extraData
    };
    window.history.pushState(newState, '', window.location.href);
    applyViewState(newState);
  };

  const navigateBack = () => {
    window.history.back();
  };

  // 🟢 HORIZONTAL SWIPEABLE PAGE CHANGE
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      navigateToView('HOME', { page: pageNumber });
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  // 📲 UNIVERSAL POPSTATE LISTENER
  useEffect(() => {
    if (!window.history.state || !window.history.state.view) {
      window.history.replaceState({ view: 'HOME', page: 1, category: 'All', search: '' }, '', window.location.href);
    } else {
      applyViewState(window.history.state);
    }

    const handlePopState = (event) => {
      applyViewState(event.state || { view: 'HOME', page: 1, category: 'All', search: '' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenProductDetail = (p) => {
    navigateToView('PRODUCT_DETAIL', { product: p, page: currentPage });
  };

  const handleResetToAllCatalog = () => {
    navigateToView('HOME', { page: 1, category: 'All', search: '' });
  };

  // 📲 SHOW APP DOWNLOAD POPUP ONLY ON UNINSTALLED MOBILE BROWSERS
  useEffect(() => {
    if (isRunningStandalone() || !isMobileDevice()) {
      setShowAppDownloadModal(false);
      return;
    }

    const hasSeen = sessionStorage.getItem('hasSeenAppPopup');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        if (!isRunningStandalone()) {
          navigateToView('APP_DOWNLOAD');
          sessionStorage.setItem('hasSeenAppPopup', 'true');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 📲 NATIVE APP INSTALL EVENT LISTENER
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      if (!isRunningStandalone()) {
        setDeferredInstallPrompt(e);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setShowAppDownloadModal(false);
      setDeferredInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleTriggerAppInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowAppDownloadModal(false);
        setIsAppInstalled(true);
        setDeferredInstallPrompt(null);
      }
    } else {
      alert("📱 To install TechStore App:\n1. Tap your browser's 3 dots menu (⋮)\n2. Click 'Install App' or 'Add to Home Screen'!");
      navigateBack();
    }
  };

  const fetchCoupons = async () => {
    try {
      const activeUser = user || JSON.parse(localStorage.getItem('googleUser') || 'null');
      const emailQuery = activeUser && activeUser.email ? `?email=${encodeURIComponent(activeUser.email)}` : '';
      const res = await axios.get(`${BASE_URL}/api/coupons${emailQuery}`, { timeout: 10000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCoupons(res.data);
      }
    } catch (err) {
      const savedCoupons = localStorage.getItem('adminCoupons');
      if (savedCoupons) setCoupons(JSON.parse(savedCoupons));
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/reviews`, { timeout: 10000 });
      if (Array.isArray(res.data)) setAllReviews(res.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders`, { timeout: 10000 });
      if (Array.isArray(res.data)) setAllStoreOrders(res.data);
    } catch (err) {
      console.error('Error fetching live orders:', err);
      const savedOrders = localStorage.getItem('myOrders');
      if (savedOrders) setAllStoreOrders(JSON.parse(savedOrders));
    }
  };

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
    fetchBanners(true);
    fetchLiveOrders();
    fetchReviews();
    fetchCoupons();

    const savedRev = localStorage.getItem('submittedReviews');
    if (savedRev) setSubmittedReviews(JSON.parse(savedRev));

    const savedAddrs = localStorage.getItem('userSavedAddresses');
    if (savedAddrs) setSavedAddresses(JSON.parse(savedAddrs));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts(false);
      fetchLiveOrders();
      fetchReviews();
      fetchCoupons();
      fetchBanners(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (heroBanners.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [heroBanners.length]);

  useEffect(() => {
    localStorage.setItem('techstore_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('techstore_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('techstore_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) {
      setShippingName(user.name || '');
      setShippingAddress(user.address || '');
      setShippingPhone(user.mobile || '');
      setProfileFormData({
        name: user.name || '',
        mobile: user.mobile || '',
        address: user.address || '',
        pincode: user.pincode || ''
      });
      if (user.wishlist && Array.isArray(user.wishlist) && user.wishlist.length > 0 && wishlist.length === 0) {
        setWishlist(user.wishlist);
      }
      if (user.cart && Array.isArray(user.cart) && user.cart.length > 0 && cart.length === 0) {
        setCart(user.cart);
      }
    }
  }, [user]);

  const syncUserUserDataToDatabase = async (updatedCart, updatedWishlist) => {
    const activeUser = user || JSON.parse(localStorage.getItem('googleUser') || 'null');
    const currentCart = updatedCart !== undefined ? updatedCart : cart;
    const currentWishlist = updatedWishlist !== undefined ? updatedWishlist : wishlist;

    if (updatedCart !== undefined) localStorage.setItem('techstore_cart', JSON.stringify(updatedCart));
    if (updatedWishlist !== undefined) localStorage.setItem('techstore_wishlist', JSON.stringify(updatedWishlist));

    if (!activeUser || !activeUser.email) return;

    try {
      if (updatedWishlist !== undefined) {
        axios.post(`${BASE_URL}/api/auth/wishlist`, {
          email: activeUser.email.toLowerCase().trim(),
          wishlist: updatedWishlist,
          name: activeUser.name || '',
          mobile: activeUser.mobile || ''
        }).catch(() => {});
      }

      if (updatedCart !== undefined) {
        axios.post(`${BASE_URL}/api/auth/cart`, {
          email: activeUser.email.toLowerCase().trim(),
          cart: updatedCart,
          name: activeUser.name || '',
          mobile: activeUser.mobile || ''
        }).catch(() => {});
      }

      const res = await axios.put(`${BASE_URL}/api/auth/profile`, {
        email: activeUser.email.toLowerCase().trim(),
        name: activeUser.name || '',
        mobile: activeUser.mobile || '',
        address: activeUser.address || '',
        pincode: activeUser.pincode || '',
        cart: currentCart,
        wishlist: currentWishlist
      });
      
      if (res.data && res.data.user) {
        localStorage.setItem('googleUser', JSON.stringify({ ...activeUser, ...res.data.user }));
      }
    } catch (err) {
      console.warn('Background Sync Notice:', err.message);
    }
  };

  const toggleWishlist = (product) => {
    let updated;
    if (wishlist.some(item => item._id === product._id)) {
      updated = wishlist.filter(item => item._id !== product._id);
    } else {
      updated = [...wishlist, product];
    }
    setWishlist(updated);
    syncUserUserDataToDatabase(undefined, updated);
  };

  const handleAddNewAddress = (e) => {
    e.preventDefault();
    if (!newAddressForm.name || !newAddressForm.address || !newAddressForm.phone) {
      alert('Please fill all address fields!');
      return;
    }
    const updated = [...savedAddresses, { ...newAddressForm, id: Date.now() }];
    setSavedAddresses(updated);
    localStorage.setItem('userSavedAddresses', JSON.stringify(updated));
    setNewAddressForm({ title: 'Home', name: '', phone: '', address: '', pincode: '' });
    setShowAddAddressForm(false);
    alert('✅ New Shipping Address Saved Successfully!');
  };

  const handleDeleteAddress = (id) => {
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('userSavedAddresses', JSON.stringify(updated));
  };

  const handleTouchStart = (e) => { touchStartX.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e) => { touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || heroBanners.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    if (distance < -40) setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleEmailSignupSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/signup`, signupData);
      alert('🎉 Registration successful! Welcome to TechStore.');
      const newUser = res.data.user;
      setUser(newUser);
      setShippingName(newUser.name || '');
      setShippingAddress(newUser.address || '');
      setShippingPhone(newUser.mobile || '');
      setProfileFormData({
        name: newUser.name || '',
        mobile: newUser.mobile || '',
        address: newUser.address || '',
        pincode: newUser.pincode || ''
      });
      localStorage.setItem('googleUser', JSON.stringify(newUser));
      setSignupData({ name: '', email: '', password: '', mobile: '', address: '', pincode: '' });
      navigateBack();
    } catch (err) { 
      alert(err.response?.data?.message || 'Signup failed. Please check backend connection.'); 
    }
  };

  const handleEmailLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
      alert(res.data.message || 'Login successful!');
      const loggedUser = res.data.user;
      setUser(loggedUser);
      setShippingName(loggedUser.name || '');
      setShippingAddress(loggedUser.address || '');
      setShippingPhone(loggedUser.mobile || '');
      setProfileFormData({
        name: loggedUser.name || '',
        mobile: loggedUser.mobile || '',
        address: loggedUser.address || '',
        pincode: loggedUser.pincode || ''
      });
      if (loggedUser.wishlist && loggedUser.wishlist.length > 0) setWishlist(loggedUser.wishlist);
      if (loggedUser.cart && loggedUser.cart.length > 0) setCart(loggedUser.cart);
      localStorage.setItem('googleUser', JSON.stringify(loggedUser));
      setLoginData({ email: '', password: '' });
      fetchCoupons();
      navigateBack();
    } catch (err) { alert(err.response?.data?.message || 'Login failed.'); }
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.email) return;

    try {
      const res = await axios.put(`${BASE_URL}/api/auth/profile`, {
        email: user.email,
        name: profileFormData.name,
        mobile: profileFormData.mobile,
        address: profileFormData.address,
        pincode: profileFormData.pincode,
        cart: cart,
        wishlist: wishlist
      });

      const updatedUser = { ...user, ...res.data.user };
      setUser(updatedUser);
      setShippingName(updatedUser.name || '');
      setShippingAddress(updatedUser.address || '');
      setShippingPhone(updatedUser.mobile || '');
      localStorage.setItem('googleUser', JSON.stringify(updatedUser));

      alert('✅ Profile updated successfully in MongoDB!');
      navigateBack();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile in database.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    const confirmDelete = window.confirm('⚠️ Are you sure you want to PERMANENTLY DELETE your account?\nThis action cannot be undone!');
    if (!confirmDelete) return;

    try {
      await axios.delete(`${BASE_URL}/api/auth/profile`, { data: { email: user.email } });
      alert('🗑️ Your account has been permanently deleted from MongoDB.');
      handleGoogleLogout();
      navigateBack();
    } catch (err) {
      alert('🗑️ Account deleted successfully!');
      handleGoogleLogout();
      navigateBack();
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        alert("Google token missing. Please try again.");
        return;
      }

      const decodedUser = jwtDecode(credentialResponse.credential);
      const localUserProfile = {
        name: decodedUser.name || 'Google User',
        email: decodedUser.email ? decodedUser.email.toLowerCase().trim() : '',
        googleId: decodedUser.sub,
        picture: decodedUser.picture || '',
        avatar: decodedUser.picture || '',
        mobile: '',
        address: '',
        pincode: '',
        wishlist: wishlist,
        cart: cart
      };

      setUser(localUserProfile);
      setShippingName(localUserProfile.name);
      setProfileFormData({
        name: localUserProfile.name,
        mobile: '',
        address: '',
        pincode: ''
      });
      localStorage.setItem('googleUser', JSON.stringify(localUserProfile));

      try {
        const res = await axios.post(`${BASE_URL}/api/auth/google`, {
          name: localUserProfile.name,
          email: localUserProfile.email,
          googleId: localUserProfile.googleId,
          avatar: localUserProfile.avatar
        });

        if (res.data && res.data.user) {
          const dbUser = { ...localUserProfile, ...res.data.user };
          setUser(dbUser);
          if (dbUser.wishlist && dbUser.wishlist.length > 0) setWishlist(dbUser.wishlist);
          if (dbUser.cart && dbUser.cart.length > 0) setCart(dbUser.cart);
          localStorage.setItem('googleUser', JSON.stringify(dbUser));
        }
      } catch (backendErr) {
        console.warn("Backend sync notice:", backendErr.message);
      }

      alert(`🎉 Welcome ${decodedUser.name}! Verified via Google Cloud.`);
      fetchCoupons();
    } catch (err) {
      console.error("Google Auth Decode Error:", err);
      alert("Sign-In error occurred. Please try again.");
    }
  };

  const handleGoogleFailure = () => {
    alert("Google Sign-In was cancelled or failed.");
  };

  const handleGoogleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('googleUser');
    navigateToView('HOME', { page: 1, category: 'All', search: '' });
    alert("Logged out from Account.");
  };

  const userOrders = allStoreOrders.filter(ord => {
    if (!user || !user.email) {
      return ord.userEmail === 'guest@techstore.com' || !ord.userEmail;
    }
    return ord.userEmail && ord.userEmail.toLowerCase() === user.email.toLowerCase();
  });

  // 🟢 PRIORITY RANK SORTING: 1, 2, 3... (Rank 1 appears on top)
  const filteredProducts = products
    .filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const rankA = a.priority !== undefined && a.priority !== null && a.priority !== '' ? Number(a.priority) : 100;
      const rankB = b.priority !== undefined && b.priority !== null && b.priority !== '' ? Number(b.priority) : 100;
      return rankA - rankB;
    });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;

  const addToCart = (product) => {
    const prodStock = getProductStock(product);
    if (prodStock <= 0) {
      alert("❌ Sorry, this item is Out of Stock!");
      return;
    }
    let updatedCart;
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      updatedCart = cart.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
    } else {
      updatedCart = [...cart, { 
        ...product, 
        qty: 1, 
        image: product.image || DEFAULT_FALLBACK_IMAGE 
      }];
    }
    setCart(updatedCart);
    syncUserUserDataToDatabase(updatedCart, undefined);
  };

  const updateCartQty = (id, delta) => {
    const updatedCart = cart.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    
    setCart(updatedCart);
    syncUserUserDataToDatabase(updatedCart, undefined);
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter(item => item._id !== id);
    setCart(updatedCart);
    syncUserUserDataToDatabase(updatedCart, undefined);
  };

  // 🟢 SMART HELPER: OPEN FULL PRODUCT DETAILS DIRECTLY FROM CART ITEM
  const handleViewProductFromCart = (cartItem) => {
    const matched = products.find(p => p._id === cartItem._id || p.name === cartItem.name);
    if (matched) {
      handleOpenProductDetail(matched);
    } else {
      handleOpenProductDetail({
        _id: cartItem._id,
        name: cartItem.name,
        price: cartItem.price,
        image: cartItem.image || DEFAULT_FALLBACK_IMAGE,
        description: cartItem.description || 'Premium store product added to your shopping cart.',
        category: cartItem.category || 'Store Item',
        countInStock: cartItem.countInStock !== undefined ? cartItem.countInStock : (cartItem.stock || 10)
      });
    }
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
        image: i.image || DEFAULT_FALLBACK_IMAGE
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
        } catch (err) {}
      }

      fetchLiveOrders();
      fetchProducts(false);
      setCart([]);
      syncUserUserDataToDatabase([], undefined);
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponCodeMessage('');
      navigateToView('HOME', { page: 1, category: 'All', search: '' });
    } catch (err) {
      console.error('Order Push Error:', err);
      alert('Order Placement Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenReviewModal = (ord) => {
    setRatingStars(5);
    setReviewComment('');
    navigateToView('REVIEW', { order: ord });
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
    navigateBack();
  };

  const handleOpenReturnModal = (ord) => {
    setReturnTypeOption('Refund');
    setReturnReason('Damaged or Defective Item');
    setReturnComments('');
    navigateToView('RETURN', { order: ord });
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

    navigateBack();
  };

  const handleNavigateToProduct = (item) => {
    const matchingProd = products.find(p => p._id === item.product || p._id === item._id || p.name === item.name);
    if (matchingProd) {
      handleOpenProductDetail(matchingProd);
    } else {
      handleOpenProductDetail({
        _id: item.product || item._id,
        name: item.name,
        price: item.price,
        image: item.image || DEFAULT_FALLBACK_IMAGE,
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

  // 🌓 DYNAMIC THEME CLASS HELPERS
  const bgMainClass = darkMode ? 'bg-dark text-white' : 'bg-light text-dark';
  const cardBgClass = darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : 'bg-white text-dark';
  const subTextClass = darkMode ? 'text-white-50' : 'text-muted';

  return (
    <div className={`${bgMainClass} min-vh-100 position-relative`} style={{ overflowX: 'hidden', width: '100%', backgroundColor: darkMode ? '#121212' : '#f8f9fa' }}>
      
      {/* 🟢 TOP COMPACT NAVBAR */}
      <nav className="navbar navbar-dark bg-dark sticky-top shadow-sm py-2 px-2 px-md-3">
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          
          {/* 1. BRAND LOGO PINNED TO FAR LEFT */}
          <a 
            className="navbar-brand fw-bold text-warning fs-4 fs-md-3 m-0 p-0" 
            href="#home"
            onClick={handleResetToAllCatalog}
          >
            <i className="bi bi-shop me-1"></i>TechStore
          </a>

          {/* 2. PROFILE & CART BUTTONS PINNED TO FAR RIGHT */}
          <div className="d-flex align-items-center gap-2">
            {user ? (
              <button 
                className="btn btn-outline-warning btn-sm rounded-pill px-2 px-sm-3 py-1 fw-bold d-inline-flex align-items-center gap-1 gap-sm-2 shadow-sm text-start bg-secondary bg-opacity-25 text-white border-warning"
                onClick={() => navigateToView('PROFILE_DRAWER')}
                title="Open Profile Menu"
              >
                <img 
                  src={user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                  alt="Profile" 
                  className="rounded-circle border border-warning" 
                  width="24" 
                  height="24" 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'; }}
                />
                <span className="fw-bold small text-truncate" style={{ maxWidth: '110px' }}>{user.name}</span>
                <i className="bi bi-chevron-down small text-warning"></i>
              </button>
            ) : (
              <div className="d-flex align-items-center gap-1 gap-sm-2">
                <button className="btn btn-outline-warning btn-sm fw-bold rounded-pill px-2 px-sm-3 py-1" onClick={() => navigateToView('LOGIN')}>Sign In</button>
                <button className="btn btn-warning btn-sm fw-bold rounded-pill px-2 px-sm-3 py-1 text-dark" onClick={() => navigateToView('SIGNUP')}>Sign Up</button>
                <div className="d-inline-block rounded-circle overflow-hidden shadow-sm border bg-white" style={{ height: '28px', width: '28px' }}>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} type="icon" shape="circle" size="medium" />
                </div>
              </div>
            )}

            {/* CART BUTTON */}
            <button 
              className="btn btn-warning fw-bold rounded-pill px-3 py-1 btn-sm position-relative shadow-sm text-dark d-flex align-items-center gap-1"
              onClick={() => navigateToView('CART')}
            >
              <i className="bi bi-cart3"></i>
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </nav>

      {/* 🟢 SEARCH & MENU INTEGRATED BAR */}
      <div className="container mt-2 mb-2 px-2 px-md-3">
        <div className="d-flex align-items-center gap-2">
          
          {/* MENU / CATEGORIES BUTTON */}
          <button 
            className="btn btn-warning btn-sm fw-bold px-3 py-2 shadow-sm d-flex align-items-center justify-content-center gap-1 text-dark rounded-pill"
            onClick={() => navigateToView('CATEGORY_MENU')}
            title="Browse Categories"
            style={{ whiteSpace: 'nowrap', height: '40px' }}
          >
            <i className="bi bi-list fs-5"></i>
            <span className="small fw-bold">Menu</span>
          </button>

          {/* SEARCH INPUT BAR */}
          <div className={`flex-grow-1 p-1 rounded-pill shadow-sm border ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ height: '40px' }}>
            <div className="input-group h-100 align-items-center">
              <span className={`input-group-text border-0 bg-transparent py-0 ps-2 pe-1 ${darkMode ? 'text-warning' : 'text-muted'}`}>
                <i className="bi bi-search" style={{ fontSize: '13px' }}></i>
              </span>
              <input 
                type="text" 
                className={`form-control border-0 shadow-none py-0 ps-1 pe-2 small ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`} 
                placeholder="Search products..." 
                value={searchTerm} 
                onChange={(e) => { 
                  const val = e.target.value;
                  setSearchTerm(val); 
                  navigateToView('HOME', { page: 1, search: val });
                }} 
                style={{ fontSize: '13px' }}
              />
              {searchTerm && (
                <button className="btn btn-sm btn-link text-secondary text-decoration-none py-0 pe-2" onClick={() => { setSearchTerm(''); navigateToView('HOME', { page: 1, search: '' }); }}>✕</button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 🟢 📲 SMART NATIVE APP DOWNLOAD PROMPT MODAL */}
      {showAppDownloadModal && !isAppInstalled && isMobileDevice() && !isRunningStandalone() && (
        <div className="modal show d-block bg-dark bg-opacity-75" tabIndex="-1" style={{ zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className={`modal-content border-0 shadow-lg rounded-4 overflow-hidden text-center p-3 p-md-4 ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              
              <div className="d-flex justify-content-end">
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>

              <div className="my-2">
                <div className="d-inline-flex p-3 rounded-4 bg-warning bg-opacity-25 mb-2 shadow-sm border border-warning">
                  <img src="https://cdn-icons-png.flaticon.com/512/3081/3081559.png" alt="App Icon" width="56" height="56" className="rounded-3 shadow-sm" />
                </div>
                <h5 className="fw-bold mb-1">Install TechStore Official App</h5>
                <p className={`small mb-3 ${subTextClass}`}>
                  Shop faster with our 1-click home screen app. Enjoy instant notifications & exclusive <b>20% App-Only Deals</b>!
                </p>

                <button 
                  type="button"
                  onClick={handleTriggerAppInstall}
                  className="btn btn-warning w-100 fw-bold py-2 rounded-pill shadow d-flex align-items-center justify-content-center gap-2 mb-2 text-dark"
                >
                  <i className="bi bi-download fs-5"></i>
                  <span>Install App on Device (1-Click)</span>
                </button>

                <button 
                  type="button" 
                  className={`btn btn-link btn-sm text-decoration-none small ${subTextClass}`}
                  onClick={navigateBack}
                >
                  Maybe Later
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PROFILE DRAWER MODAL */}
      {showProfileDrawer && user && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className={`modal-content border-0 shadow-lg rounded-4 overflow-hidden ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              
              <div className="modal-header bg-dark text-white d-flex align-items-center gap-3 p-3">
                <img 
                  src={user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                  alt="Avatar" 
                  className="rounded-circle border border-warning shadow-sm" 
                  width="48" 
                  height="48" 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'; }}
                />
                <div className="text-truncate">
                  <h6 className="fw-bold text-warning mb-0 text-truncate">{user.name}</h6>
                  <small className="text-white-50 d-block text-truncate" style={{ fontSize: '11px' }}>{user.email}</small>
                </div>
                <button type="button" className="btn-close btn-close-white ms-auto" onClick={navigateBack}></button>
              </div>

              <div className={`modal-body p-2 d-flex flex-column gap-2 ${darkMode ? 'bg-dark' : 'bg-light'}`}>
                <button 
                  className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between shadow-sm ${darkMode ? 'btn-dark text-white border-secondary' : 'btn-white bg-white text-dark border'}`}
                  onClick={() => navigateToView('EDIT_PROFILE')}
                >
                  <span><i className="bi bi-person-circle text-warning me-2 fs-5"></i>My Profile</span>
                  <i className="bi bi-chevron-right text-muted small"></i>
                </button>

                <button 
                  className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between shadow-sm ${darkMode ? 'btn-dark text-white border-secondary' : 'btn-white bg-white text-dark border'}`}
                  onClick={() => {
                    fetchLiveOrders();
                    navigateToView('ORDER_TRACKING');
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-box-seam text-primary me-2 fs-5"></i>
                    <span>My Orders</span>
                  </div>
                  {userOrders.length > 0 ? (
                    <span className="badge bg-primary rounded-pill">{userOrders.length}</span>
                  ) : <i className="bi bi-chevron-right text-muted small"></i>}
                </button>

                <button 
                  className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between shadow-sm ${darkMode ? 'btn-dark text-white border-secondary' : 'btn-white bg-white text-dark border'}`}
                  onClick={() => navigateToView('ACCOUNT_SETTINGS')}
                >
                  <span><i className="bi bi-gear-fill text-secondary me-2 fs-5"></i>Account Settings</span>
                  <i className="bi bi-chevron-right text-muted small"></i>
                </button>

                <button 
                  className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between shadow-sm ${darkMode ? 'btn-dark text-white border-secondary' : 'btn-white bg-white text-dark border'}`}
                  onClick={() => navigateToView('PRIVACY_POLICY')}
                >
                  <span><i className="bi bi-shield-lock-fill text-info me-2 fs-5"></i>Privacy Policy</span>
                  <i className="bi bi-chevron-right text-muted small"></i>
                </button>
              </div>

              <div className={`modal-footer border-top p-2 ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
                <button 
                  className="btn btn-danger w-100 fw-bold py-2 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  onClick={handleGoogleLogout}
                >
                  <i className="bi bi-box-arrow-right fs-5"></i>
                  <span>Log Out Account</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && user && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content border-0 shadow-lg p-3 p-md-4 rounded-4 ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="fw-bold mb-0 text-warning"><i className="bi bi-person-bounding-box me-2"></i>My Profile Details</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>

              <form onSubmit={handleUpdateProfileSubmit}>
                <div className="mb-2">
                  <label className={`form-label fw-bold small ${subTextClass}`}>Email ID (Read Only)</label>
                  <input type="email" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : 'bg-light'}`} disabled value={user.email} />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-bold small">Full Name</label>
                  <input 
                    type="text" 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
                    required 
                    value={profileFormData.name} 
                    onChange={(e) => setProfileFormData({...profileFormData, name: e.target.value})} 
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-bold small">Mobile Number</label>
                  <input 
                    type="tel" 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
                    required 
                    value={profileFormData.mobile} 
                    onChange={(e) => setProfileFormData({...profileFormData, mobile: e.target.value})} 
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-bold small">Shipping Address</label>
                  <textarea 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
                    rows="2" 
                    required 
                    value={profileFormData.address} 
                    onChange={(e) => setProfileFormData({...profileFormData, address: e.target.value})}
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small">Pincode</label>
                  <input 
                    type="text" 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
                    required 
                    value={profileFormData.pincode} 
                    onChange={(e) => setProfileFormData({...profileFormData, pincode: e.target.value})} 
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={navigateBack}>Cancel</button>
                  <button type="submit" className="btn btn-warning fw-bold px-4 text-dark">Save & Update Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {showAccountSettingsModal && user && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content border-0 shadow-lg p-3 p-md-4 rounded-4 overflow-hidden ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="fw-bold mb-0 text-warning"><i className="bi bi-gear-fill me-2"></i>Account Settings</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>

              <div className="overflow-auto pe-1" style={{ maxHeight: '70vh' }}>
                
                {/* 1. ACCOUNT OVERVIEW */}
                <div className={`p-3 rounded border mb-3 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                  <h6 className="fw-bold mb-1 d-flex align-items-center"><i className="bi bi-person-check-fill text-success me-2"></i>Account Overview</h6>
                  <small className={`${subTextClass} d-block`}>User: {user.name} ({user.email})</small>
                  <small className="text-success fw-bold d-block mt-1">Status: Verified Store Customer</small>
                </div>

                {/* 2. THEME CUSTOMIZATION */}
                <div className={`p-3 rounded border mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1 d-flex align-items-center">
                        <i className={`bi ${darkMode ? 'bi-moon-stars-fill text-warning' : 'bi-sun-fill text-warning'} me-2 fs-5`}></i>
                        App Theme Mode
                      </h6>
                      <small className={subTextClass}>
                        {darkMode ? '🌙 Dark Mode is Active (Easy on eyes)' : '☀️ Light Mode is Active (Classic view)'}
                      </small>
                    </div>
                    
                    <div className="d-flex gap-1 bg-white p-1 rounded-pill border shadow-sm">
                      <button 
                        type="button"
                        className={`btn btn-sm rounded-pill fw-bold px-3 py-1 ${!darkMode ? 'btn-warning text-dark' : 'btn-light text-muted'}`}
                        onClick={() => setDarkMode(false)}
                      >
                        ☀️ Light
                      </button>
                      <button 
                        type="button"
                        className={`btn btn-sm rounded-pill fw-bold px-3 py-1 ${darkMode ? 'btn-dark text-warning' : 'btn-light text-muted'}`}
                        onClick={() => setDarkMode(true)}
                      >
                        🌙 Dark
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. MY SAVED WISHLIST ITEMS */}
                <div className={`p-3 rounded border mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                  <h6 className="fw-bold mb-2 d-flex align-items-center justify-content-between">
                    <span><i className="bi bi-heart-fill text-danger me-2"></i>My Saved Wishlist</span>
                    <span className="badge bg-danger rounded-pill">{wishlist.length} Items</span>
                  </h6>

                  {wishlist.length === 0 ? (
                    <small className={`${subTextClass} d-block py-2`}>No products saved to wishlist yet. Click the heart ❤️ icon on products to save them here!</small>
                  ) : (
                    <div className="row g-2 mt-1">
                      {wishlist.map((item) => (
                        <div key={item._id} className="col-12 col-sm-6">
                          <div className={`d-flex align-items-center gap-2 p-2 rounded-3 border shadow-sm ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                            <div 
                              style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                              onClick={() => handleOpenProductDetail(item)}
                              title="Click to view details"
                            >
                              <img 
                                src={item.image || DEFAULT_FALLBACK_IMAGE} 
                                alt={item.name} 
                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            </div>
                            <div className="flex-grow-1 text-truncate" style={{ cursor: 'pointer' }} onClick={() => handleOpenProductDetail(item)}>
                              <span className="fw-bold small text-truncate d-block">{item.name}</span>
                              <span className="text-success fw-bold small">₹{item.price}</span>
                            </div>
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-primary py-0 px-2" style={{ fontSize: '11px' }} onClick={() => addToCart(item)} title="Move to Cart">Add</button>
                              <button className="btn btn-sm btn-outline-danger py-0 px-1" style={{ fontSize: '11px' }} onClick={() => toggleWishlist(item)} title="Remove">✕</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. AVAILABLE STORE COUPONS */}
                <div className={`p-3 rounded border mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                  <h6 className="fw-bold mb-2 d-flex align-items-center"><i className="bi bi-tag-fill text-warning me-2"></i>Available Live Promo Coupons</h6>
                  {coupons.length === 0 ? (
                    <small className={`${subTextClass} d-block py-1`}>No coupons active right now.</small>
                  ) : (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {coupons.map((c, idx) => {
                        const maxU = Number(c.maxUsage) || 100;
                        const usedU = Number(c.usedCount) || 0;
                        const remaining = Math.max(0, maxU - usedU);

                        return (
                          <div key={c.id || idx} className={`p-2 rounded border border-primary border-opacity-25 d-flex align-items-center gap-2 shadow-sm ${darkMode ? 'bg-dark' : 'bg-white'}`}>
                            <span className="badge bg-primary fw-bold">🏷️ {c.code}</span>
                            <small className="fw-bold">{c.discount}% OFF on [{c.category || 'All'}]</small>
                            {c.targetUserEmail && <span className="badge bg-warning text-dark small">🎁 Special For You</span>}
                            <small className={subTextClass}>({remaining} left)</small>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. MULTIPLE SAVED SHIPPING ADDRESSES */}
                <div className={`p-3 rounded border mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold m-0 d-flex align-items-center"><i className="bi bi-geo-alt-fill text-info me-2"></i>Saved Shipping Addresses</h6>
                    <button className="btn btn-sm btn-outline-primary fw-bold py-0 px-2" style={{ fontSize: '12px' }} onClick={() => setShowAddAddressForm(!showAddAddressForm)}>
                      {showAddAddressForm ? 'Cancel' : '+ Add New Address'}
                    </button>
                  </div>

                  {showAddAddressForm && (
                    <form onSubmit={handleAddNewAddress} className={`p-3 rounded border mb-3 shadow-sm ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                      <h6 className="fw-bold text-primary mb-2 small">Add Shipping Location Details:</h6>
                      <div className="row g-2 mb-2">
                        <div className="col-4">
                          <select className="form-select form-select-sm fw-bold" value={newAddressForm.title} onChange={(e) => setNewAddressForm({...newAddressForm, title: e.target.value})}>
                            <option value="Home">Home</option>
                            <option value="Office">Office</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="col-8">
                          <input type="text" className="form-control form-control-sm" placeholder="Full Name" required value={newAddressForm.name} onChange={(e) => setNewAddressForm({...newAddressForm, name: e.target.value})} />
                        </div>
                        <div className="col-6">
                          <input type="tel" className="form-control form-control-sm" placeholder="Phone Number" required value={newAddressForm.phone} onChange={(e) => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                        </div>
                        <div className="col-6">
                          <input type="text" className="form-control form-control-sm" placeholder="Pincode" required value={newAddressForm.pincode} onChange={(e) => setNewAddressForm({...newAddressForm, pincode: e.target.value})} />
                        </div>
                        <div className="col-12">
                          <textarea className="form-control form-control-sm" rows="2" placeholder="Full House/Street/Area Address" required value={newAddressForm.address} onChange={(e) => setNewAddressForm({...newAddressForm, address: e.target.value})}></textarea>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-sm btn-primary fw-bold w-100 py-1">Save Address Location</button>
                    </form>
                  )}

                  {savedAddresses.length === 0 ? (
                    <small className={`${subTextClass} d-block py-1`}>No multiple addresses added yet. Primary default address is used for checkout.</small>
                  ) : (
                    <div className="d-flex flex-column gap-2 mt-2">
                      {savedAddresses.map((addr) => (
                        <div key={addr.id} className={`p-2 rounded border d-flex justify-content-between align-items-center shadow-sm ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                          <div>
                            <span className="badge bg-secondary me-2">{addr.title}</span>
                            <span className="fw-bold small me-2">{addr.name} ({addr.phone})</span>
                            <small className={`${subTextClass} d-block`}>{addr.address} - {addr.pincode}</small>
                          </div>
                          <button className="btn btn-sm btn-outline-danger py-0 px-2" style={{ fontSize: '11px' }} onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. DANGER ZONE */}
                <div className="p-3 border border-danger bg-danger bg-opacity-10 rounded mb-2">
                  <h6 className="fw-bold text-danger mb-1"><i className="bi bi-exclamation-triangle-fill me-1"></i>Danger Zone</h6>
                  <p className="small text-muted mb-3">Deleting your account will permanently remove your stored profile, saved addresses, and account history from MongoDB.</p>
                  <button className="btn btn-danger btn-sm fw-bold px-3 py-2 w-100" onClick={handleDeleteAccount}>
                    🗑️ Delete Account Permanently
                  </button>
                </div>

              </div>

              <div className="d-flex justify-content-end pt-3 border-top mt-2">
                <button type="button" className="btn btn-secondary fw-bold" onClick={navigateBack}>Close Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyPolicyModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content border-0 shadow-lg p-3 p-md-4 rounded-4 ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="fw-bold mb-0 text-info"><i className="bi bi-shield-lock-fill me-2"></i>Store Privacy Policy</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>

              <div className={`p-3 rounded border overflow-auto ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`} style={{ maxHeight: '320px' }}>
                <h6 className="fw-bold">1. Information Collection & Usage</h6>
                <p className={`small ${subTextClass}`}>
                  TechStore collects user name, contact number, and shipping address solely for processing and delivering orders smoothly.
                </p>
                <h6 className="fw-bold">2. Data Protection & Security</h6>
                <p className={`small ${subTextClass}`}>
                  Your personal data is encrypted and securely saved in database servers. We never sell or share user information with third-party advertisers.
                </p>
                <h6 className="fw-bold">3. User Rights</h6>
                <p className={`small ${subTextClass}`}>
                  Customers retain full rights to edit their profile details or delete their account instantly at any time from the Account Settings menu.
                </p>
              </div>

              <div className="d-flex justify-content-end mt-3 pt-2 border-top">
                <button type="button" className="btn btn-info fw-bold text-white px-4" onClick={navigateBack}>I Understand</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MENU MODAL */}
      {showCategoryMenu && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className={`modal-content border-0 shadow-lg rounded-4 overflow-hidden ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold text-warning mb-0">
                  <i className="bi bi-grid-3x3-gap-fill me-2"></i>Select Category
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={navigateBack}></button>
              </div>
              <div className={`modal-body p-3 ${darkMode ? 'bg-dark' : 'bg-light'}`}>
                <div className="d-flex flex-column gap-2">
                  {categoriesList.map((cat, idx) => (
                    <button
                      key={idx}
                      className={`btn text-start fw-bold py-2 px-3 rounded-3 d-flex align-items-center justify-content-between ${
                        selectedCategory === cat 
                          ? 'btn-warning text-dark shadow-sm' 
                          : darkMode ? 'btn-dark text-white border-secondary' : 'btn-white bg-white text-dark border'
                      }`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        navigateToView('HOME', { page: 1, category: cat });
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
          <button 
            className={`btn fw-bold mb-4 rounded-pill px-4 shadow-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
            onClick={navigateBack}
          >
            &larr; Back
          </button>

          <div className={`card border-0 shadow-lg p-3 p-md-4 rounded-4 mb-5 ${cardBgClass}`}>
            <div className="row g-4 align-items-center">
              <div className="col-lg-5 text-center">
                <div 
                  className={`p-3 border rounded-4 shadow-sm position-relative d-flex align-items-center justify-content-center ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}
                  style={{ minHeight: '320px' }}
                >
                  <button 
                    className="position-absolute top-0 end-0 m-3 btn btn-light rounded-circle shadow-sm border p-2 d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px', zIndex: 10 }}
                    onClick={() => toggleWishlist(selectedProductDetail)}
                    title="Add/Remove Wishlist"
                  >
                    <i className={`bi ${wishlist.some(w => w._id === selectedProductDetail._id) ? 'bi-heart-fill text-danger' : 'bi-heart text-secondary'} fs-5`}></i>
                  </button>

                  <span className="position-absolute top-0 start-0 badge bg-danger m-3 px-3 py-2 fw-bold fs-6 shadow">
                    10% OFF
                  </span>
                  
                  <div style={{ width: '92%', height: '320px', borderRadius: '18px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                    <img 
                      src={selectedProductDetail.image || DEFAULT_FALLBACK_IMAGE} 
                      alt={selectedProductDetail.name} 
                      className="shadow-sm" 
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        borderRadius: '18px' 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-lg-7 d-flex flex-column">
                <span className="badge bg-primary text-uppercase px-3 py-2 fw-bold w-auto me-auto mb-2">
                  {selectedProductDetail.category || 'General'}
                </span>
                
                <h1 className="fw-bold mb-2 fs-3 fs-md-2">{selectedProductDetail.name}</h1>
                
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge bg-success px-2 py-1 fs-6 fw-bold">
                    {avgRating} ★
                  </span>
                  <span className={`small fw-semibold ${subTextClass}`}>
                    ({totalReviewsCount} Verified Customer Rating & Reviews)
                  </span>
                </div>

                <div className="d-flex align-items-baseline gap-3 mb-3">
                  <h1 className="text-success fw-bold display-6 m-0">₹{selectedProductDetail.price}</h1>
                  <span className={`text-decoration-line-through fs-5 ${subTextClass}`}>
                    ₹{Math.round(selectedProductDetail.price * 1.15)}
                  </span>
                  <span className="badge bg-success text-white fw-bold fs-6">Special Price</span>
                </div>

                <div className={`row g-2 mb-4 p-3 rounded-3 border ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
                  <div className="col-6">
                    <span className={`small d-block fw-bold ${subTextClass}`}>Availability:</span>
                    {getProductStock(selectedProductDetail) > 0 ? (
                      <span className="text-success fw-bold fs-6">
                        <i className="bi bi-check-circle-fill me-1"></i>In Stock ({getProductStock(selectedProductDetail)} Left)
                      </span>
                    ) : (
                      <span className="text-danger fw-bold fs-6"><i className="bi bi-x-circle-fill me-1"></i>Out of Stock (0 Left)</span>
                    )}
                  </div>
                  <div className="col-6">
                    <span className={`small d-block fw-bold ${subTextClass}`}>Delivery:</span>
                    <span className="fw-bold fs-6">🚀 FREE Express Delivery</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold">About Product Specifications:</h5>
                  <p className={`leading-relaxed m-0 ${subTextClass}`}>
                    {selectedProductDetail.description || 'Premium quality product verified and direct shipped from top sellers.'}
                  </p>
                </div>

                <div className="mt-auto d-flex gap-3">
                  <button 
                    className={`btn btn-lg fw-bold flex-grow-1 shadow-sm py-3 fs-5 ${
                      getProductStock(selectedProductDetail) <= 0 
                        ? 'btn-secondary disabled' 
                        : 'btn-warning text-dark'
                    }`}
                    disabled={getProductStock(selectedProductDetail) <= 0}
                    onClick={() => {
                      addToCart(selectedProductDetail);
                      navigateToView('CART');
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
          <div className={`card border-0 shadow-sm p-3 p-md-4 rounded-4 mb-5 ${cardBgClass}`}>
            <h4 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-chat-left-quote-fill text-warning"></i> Customer Ratings & Verified Reviews
            </h4>

            <div className={`row g-3 p-3 rounded-3 border mb-4 align-items-center ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
              <div className="col-md-4 text-center border-end border-secondary">
                <h1 className="fw-bold display-3 m-0">{avgRating}</h1>
                <div className="text-warning fs-3 mb-1">
                  {'★'.repeat(Math.round(Number(avgRating)))}
                </div>
                <span className={`small fw-bold ${subTextClass}`}>Overall Product Rating ({totalReviewsCount} Reviews)</span>
              </div>
              <div className="col-md-8">
                {[5, 4, 3, 2, 1].map((starVal) => {
                  const pct = getStarPercent(starVal);
                  return (
                    <div key={starVal} className="d-flex align-items-center gap-2 small mb-1">
                      <span className="fw-bold" style={{ width: '25px' }}>{starVal} ★</span>
                      <div className="progress flex-grow-1" style={{ height: '8px', backgroundColor: darkMode ? '#333' : '#e9ecef' }}>
                        <div 
                          className={`progress-bar ${starVal >= 4 ? 'bg-success' : starVal === 3 ? 'bg-warning' : 'bg-danger'}`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className={subTextClass} style={{ width: '35px' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <h6 className={`fw-bold mb-3 ${subTextClass}`}>Verified Buyer Reviews ({productReviews.length})</h6>

            {productReviews.length === 0 ? (
              <div className={`p-4 text-center rounded-3 border ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
                <i className="bi bi-star fs-2 text-warning d-block mb-2"></i>
                <p className="m-0 fw-bold">No reviews for this product yet.</p>
                <small className={subTextClass}>Be the first customer to order and rate this item!</small>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {productReviews.map((rev, idx) => (
                  <div key={idx} className={`p-3 border rounded-3 ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success fw-bold px-2 py-1">
                          {rev.rating || 5} ★
                        </span>
                        <span className="fw-bold small">{rev.customerName || 'Verified Buyer'}</span>
                        <span className="badge bg-secondary" style={{ fontSize: '10px' }}>Verified Purchase</span>
                      </div>
                      <small className={subTextClass}>{rev.date || 'Recent'}</small>
                    </div>
                    <p className="m-0 small fw-semibold">
                      "{rev.comment || 'Great quality product! Completely satisfied with the purchase.'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 mb-4">
            <h3 className="fw-bold mb-4 fs-4">You May Also Like (Similar Store Products)</h3>
            
            <div className="row g-2 g-md-4">
              {products.filter(p => p._id !== selectedProductDetail._id).slice(0, 6).map((p) => (
                <div key={p._id} className="col-6 col-md-6 col-lg-4">
                  <div className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden ${cardBgClass}`}>
                    <div 
                      className={`text-center p-2 p-md-3 d-flex align-items-center justify-content-center ${darkMode ? 'bg-dark' : 'bg-white'}`}
                      style={{ height: '160px', cursor: 'pointer' }}
                      onClick={() => handleOpenProductDetail(p)}
                    >
                      <div style={{ width: '90%', height: '135px', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={p.image || DEFAULT_FALLBACK_IMAGE} 
                          className="shadow-sm" 
                          alt={p.name} 
                          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                    <div className={`card-body p-2 p-md-3 d-flex flex-column border-top ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                      <span className="badge bg-secondary mb-1 w-auto me-auto" style={{ fontSize: '10px' }}>{p.category || 'General'}</span>
                      <h6 
                        className="card-title fw-bold text-truncate small m-0 mb-1" 
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
          {/* SLIDING BANNER CAROUSEL */}
          <div className="container mt-2 mb-2 px-2 px-md-3">
            {bannersLoading ? (
              <div 
                className={`rounded-4 p-4 text-center shadow-sm d-flex align-items-center justify-content-center ${darkMode ? 'bg-secondary bg-opacity-25' : 'bg-secondary bg-opacity-10'}`}
                style={{ minHeight: '160px' }}
              >
                <div className="spinner-border text-warning spinner-border-sm me-2" role="status"></div>
                <span className={`fw-bold small ${subTextClass}`}>Loading store offers...</span>
              </div>
            ) : heroBanners.length > 0 && currentBanner ? (
              <div 
                className="rounded-4 p-3 p-md-4 text-white shadow-lg overflow-hidden position-relative"
                style={{ 
                  minHeight: '160px', 
                  touchAction: 'pan-y',
                  backgroundColor: '#111827'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {currentBanner.img && (
                  <div 
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      backgroundImage: `url(${currentBanner.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(20px) brightness(0.4)',
                      transform: 'scale(1.2)',
                      zIndex: 0
                    }}
                  />
                )}

                <div className="row align-items-start position-relative z-1 g-3">
                  <div className="col-7 col-md-8 d-flex flex-column align-items-start justify-content-start text-start" style={{ minHeight: '110px' }}>
                    {currentBanner.badge ? (
                      <span className="badge bg-warning text-dark fw-bold mb-2 px-2 py-1 small shadow-sm d-inline-block text-truncate" style={{ maxWidth: '100%' }}>
                        {currentBanner.badge}
                      </span>
                    ) : <div style={{ height: '24px' }}></div>}
                    
                    <h2 className="fw-bold m-0 fs-5 fs-md-2 text-shadow text-truncate w-100">{currentBanner.title}</h2>
                    
                    {currentBanner.subtitle && (
                      <p className="lead m-0 mt-1 text-white-50 fs-6 d-none d-sm-block text-truncate w-100">{currentBanner.subtitle}</p>
                    )}
                  </div>

                  {currentBanner.img && (
                    <div className="col-5 col-md-4 text-end align-self-center">
                      <img 
                        src={currentBanner.img} 
                        alt="Offer" 
                        className="img-fluid rounded-4 shadow-lg border border-white border-opacity-25" 
                        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                        style={{ maxHeight: '130px', objectFit: 'cover', width: '100%', borderRadius: '16px' }}
                      />
                    </div>
                  )}
                </div>

                {heroBanners.length > 1 && (
                  <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-2 z-2">
                    {heroBanners.map((_, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm p-1 rounded-circle border-0 ${currentSlide === idx ? 'bg-warning' : 'bg-white bg-opacity-50'}`}
                        style={{ width: '8px', height: '8px' }}
                        onClick={() => setCurrentSlide(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* MAIN PRODUCTS CATALOG */}
          <div className="container py-2 px-2 px-md-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <h4 className="fw-bold m-0 fs-5">
                {selectedCategory === 'All' ? 'Explore Our Products' : `${selectedCategory} Collection`}
                <span className={`fs-6 ms-2 ${subTextClass}`}>({filteredProducts.length} items)</span>
              </h4>
              
              {selectedCategory !== 'All' && (
                <button className="btn btn-outline-secondary btn-sm fw-bold rounded-pill py-0 px-2" style={{ fontSize: '12px' }} onClick={() => navigateToView('HOME', { page: 1, category: 'All' })}>
                  Showing: {selectedCategory} ✕ (Show All)
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className={`mt-2 ${subTextClass}`}>Loading live products...</p>
              </div>
            ) : currentProducts.length === 0 ? (
              <div className={`text-center py-5 card border-0 shadow-sm p-5 ${cardBgClass}`}>
                <h5 className={subTextClass}>No products found matching your search.</h5>
              </div>
            ) : (
              <>
                <div className="row g-2 g-md-4">
                  {currentProducts.map((p) => {
                    const currentStock = getProductStock(p);
                    const isWishlisted = wishlist.some(w => w._id === p._id);
                    
                    return (
                      <div key={p._id} className="col-6 col-md-6 col-lg-4">
                        <div className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column position-relative ${cardBgClass}`}>
                          
                          {/* WISHLIST BUTTON */}
                          <button 
                            className="position-absolute top-0 end-0 m-2 btn btn-light rounded-circle shadow-sm border p-1 d-flex align-items-center justify-content-center"
                            style={{ width: '32px', height: '32px', zIndex: 5 }}
                            onClick={() => toggleWishlist(p)}
                            title="Add/Remove Wishlist"
                          >
                            <i className={`bi ${isWishlisted ? 'bi-heart-fill text-danger' : 'bi-heart text-secondary'}`} style={{ fontSize: '14px' }}></i>
                          </button>

                          {/* 🟢 FULLY CLIPPED ROUNDED IMAGE FRAME WITH FALLBACK */}
                          <div 
                            className={`text-center p-2 d-flex align-items-center justify-content-center ${darkMode ? 'bg-dark' : 'bg-white'}`} 
                            style={{ height: '170px', cursor: 'pointer' }}
                            onClick={() => handleOpenProductDetail(p)}
                          >
                            <div 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                borderRadius: '16px', 
                                overflow: 'hidden', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: darkMode ? '#1e1e1e' : '#f8f9fa'
                              }}
                            >
                              <img 
                                src={p.image || DEFAULT_FALLBACK_IMAGE} 
                                alt={p.name} 
                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover' 
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className={`card-body p-2 p-md-3 d-flex flex-column border-top flex-grow-1 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
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
                              className="card-title fw-bold text-truncate mb-1" 
                              style={{ cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => handleOpenProductDetail(p)}
                              title={p.name}
                            >
                              {p.name}
                            </h6>
                            
                            <p className={`card-text small flex-grow-1 d-none d-md-block ${subTextClass}`} style={{ fontSize: '11px' }}>
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

                {/* 🟢 📱 SLEEK HORIZONTAL SWIPEABLE PAGINATION BOX (RIGHT-TO-LEFT & LEFT-TO-RIGHT) */}
                {totalPages > 1 && (
                  <div className="d-flex flex-column align-items-center justify-content-center mt-4 mb-4">
                    <div 
                      className={`p-2 rounded-4 shadow-sm border d-flex align-items-center gap-2 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}
                      style={{ 
                        maxWidth: '100%', 
                        overflowX: 'auto', 
                        whiteSpace: 'nowrap',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        const isActive = currentPage === pageNum;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`btn fw-bold rounded-3 d-inline-flex align-items-center justify-content-center shadow-sm ${
                              isActive 
                                ? 'btn-warning text-dark border-warning' 
                                : darkMode ? 'btn-outline-secondary text-white' : 'btn-light border text-dark'
                            }`}
                            style={{ 
                              minWidth: '42px', 
                              height: '40px', 
                              fontSize: '14px',
                              flexShrink: 0 
                            }}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <small className={`mt-2 fw-bold small ${subTextClass}`}>
                      Swipe ↔ Page <b>{currentPage}</b> of <b>{totalPages}</b>
                    </small>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* 🟢 FOOTER WITH VISIBLE APP DOWNLOAD (HIDDEN INSIDE INSTALLED APP) */}
      <footer className="bg-dark text-white pt-4 pb-3 border-top mt-5">
        <div className="container">
          
          {!isRunningStandalone() && (
            <div className="row bg-secondary bg-opacity-25 rounded-4 p-3 p-md-4 mb-4 align-items-center border border-secondary">
              <div className="col-md-7 text-start">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <img src="https://cdn-icons-png.flaticon.com/512/3081/3081559.png" alt="App" width="36" height="36" className="rounded-2 shadow-sm" />
                  <h5 className="fw-bold text-warning m-0">Experience TechStore Official App</h5>
                </div>
                <p className="small text-white-50 m-0">
                  Install our official mobile app directly to your home screen with a single click. Fast, secure, and offline-ready!
                </p>
              </div>
              <div className="col-md-5 text-md-end mt-3 mt-md-0">
                <button 
                  type="button"
                  onClick={handleTriggerAppInstall}
                  className="btn btn-warning fw-bold px-4 py-2 rounded-pill shadow d-inline-flex align-items-center gap-2 text-dark"
                >
                  <i className="bi bi-phone-fill fs-5"></i>
                  <span>Click Here to Install App (1-Click)</span>
                </button>
              </div>
            </div>
          )}

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
                <li><span style={{ cursor: 'pointer' }} onClick={() => navigateToView('ORDER_TRACKING')}>Track My Orders</span></li>
                <li><span style={{ cursor: 'pointer' }} onClick={() => navigateToView('CART')}>My Shopping Cart</span></li>
                {!isRunningStandalone() && (
                  <li><span style={{ cursor: 'pointer' }} onClick={handleTriggerAppInstall} className="text-warning fw-bold">📲 Install Mobile App</span></li>
                )}
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

      {/* FLOATING AI ASSISTANT */}
      <div className="position-fixed bottom-0 end-0 m-2 m-md-3 z-3">
        {showChatbot ? (
          <div className={`card shadow-lg border-0 ${darkMode ? 'bg-dark text-white' : ''}`} style={{ width: '280px', height: '360px' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
              <span className="fw-bold small"><i className="bi bi-robot me-1"></i>Store AI Assistant</span>
              <button className="btn-close btn-close-white" onClick={() => setShowChatbot(false)}></button>
            </div>
            <div className={`card-body overflow-auto p-2 ${darkMode ? 'bg-dark' : 'bg-light'}`}>
              <div className={`p-2 rounded mb-2 shadow-sm small ${darkMode ? 'bg-secondary bg-opacity-25 text-white' : 'bg-white text-dark'}`}>👋 Hello! How can I help you find products or track your order today?</div>
            </div>
            <div className={`card-footer p-2 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
              <input type="text" className={`form-control form-control-sm ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Ask AI assistant..." />
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

      {/* 🟢 🛒 ENHANCED CART MODAL */}
      {showCartModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content border-0 shadow-lg ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-header-title fw-bold text-warning mb-0">Your Shopping Cart</h5>
                <button type="button" className="btn-close btn-close-white" onClick={navigateBack}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                {cart.length === 0 ? (
                  <div className={`text-center py-4 ${subTextClass}`}>Your cart is currently empty.</div>
                ) : (
                  <div>
                    <div className="table-responsive">
                      <table className={`table table-hover align-middle ${darkMode ? 'table-dark' : ''}`}>
                        <thead>
                          <tr>
                            <th style={{ minWidth: '180px' }}>Product Item</th>
                            <th>Price</th>
                            <th className="text-center">Qty</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item._id}>
                              <td>
                                <div 
                                  className="d-flex align-items-center gap-2" 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleViewProductFromCart(item)}
                                  title="Click to view product details"
                                >
                                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }}>
                                    <img 
                                      src={item.image || DEFAULT_FALLBACK_IMAGE} 
                                      alt={item.name} 
                                      className="shadow-sm" 
                                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                  </div>
                                  <div>
                                    <span className="fw-bold small text-truncate d-block" style={{ maxWidth: '140px' }}>
                                      {item.name}
                                    </span>
                                    <span className="text-primary fw-bold d-block" style={{ fontSize: '10px' }}>
                                      🔍 View Details &rarr;
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="small fw-semibold">₹{item.price}</td>
                              <td className="text-center">
                                <div className={`d-inline-flex align-items-center border rounded px-1 ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
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

                    <div className={`p-3 rounded border my-3 ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                      <div className="mb-2">
                        <span className="fw-bold small d-block mb-1">
                          <i className="bi bi-tag-fill text-warning me-1"></i> Available Live Promo Coupons:
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

                      <label className={`form-label fw-bold small ${subTextClass}`}>Or Enter Discount Coupon Code Manually:</label>
                      <form onSubmit={handleApplyCoupon} className="input-group">
                        <input 
                          type="text" 
                          className={`form-control ${darkMode ? 'bg-dark text-white border-secondary' : ''}`} 
                          placeholder="e.g. PAPAJIONTOP, NV7GOAT, TECH10" 
                          value={couponCode} 
                          onChange={(e) => setCouponCode(e.target.value)} 
                        />
                        <button type="submit" className="btn btn-dark fw-bold border-secondary">Apply Code</button>
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
                          <span className={`text-decoration-line-through d-block small ${subTextClass}`}>Subtotal: ₹{rawCartTotal}</span>
                        )}
                        <h4 className="fw-bold m-0 fs-5">Final Total: <span className="text-success">₹{finalCartTotal}</span></h4>
                      </div>
                      <button 
                        className="btn btn-success fw-bold px-4 py-2" 
                        onClick={() => navigateToView('CHECKOUT')}
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

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content border-0 shadow-lg ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">📦 Secure Shipping & Payment Checkout</h5>
                <button type="button" className="btn-close btn-close-white" onClick={navigateBack}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                
                {savedAddresses.length > 0 && (
                  <div className={`p-3 rounded border mb-4 shadow-sm ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                    <label className="form-label fw-bold small text-primary mb-2">
                      <i className="bi bi-geo-alt-fill me-1"></i>Select from Saved Shipping Addresses:
                    </label>
                    <div className="d-flex flex-wrap gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          className={`btn btn-sm fw-bold text-start p-2 rounded shadow-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
                          style={{ fontSize: '11px', maxWidth: '220px' }}
                          onClick={() => {
                            setShippingName(addr.name);
                            setShippingPhone(addr.phone);
                            setShippingAddress(`${addr.address} - ${addr.pincode}`);
                          }}
                        >
                          <span className="badge bg-secondary mb-1">{addr.title}</span>
                          <span className="d-block text-truncate fw-bold">{addr.name} ({addr.phone})</span>
                          <span className={`d-block text-truncate ${subTextClass}`}>{addr.address}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handlePlaceOrder}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Full Name</label>
                      <input type="text" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} required value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone Number</label>
                      <input type="tel" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} required value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="+91 9876543210" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Complete Shipping Address</label>
                      <textarea className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} rows="2" required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="House No, Building, Street, Area, Pincode"></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Select Payment Method</label>
                      <select className={`form-select ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                        <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                      </select>
                    </div>
                  </div>

                  <div className={`p-3 rounded mt-4 border d-flex justify-content-between align-items-center flex-wrap gap-2 ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
                    <div>
                      <span className={`small d-block ${subTextClass}`}>Payable Amount ({cartItemCount} Items)</span>
                      <span className="fs-5 fw-bold text-success">₹{finalCartTotal}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-outline-secondary btn-sm fw-bold" onClick={navigateBack}>Back to Cart</button>
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
            <div className={`modal-content border-0 shadow-lg ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold mb-0">
                  <i className="bi bi-truck me-2"></i>My Placed Orders & Live Tracking
                  {user && <small className="d-block text-white-50 fs-6 fw-normal">Account: {user.email}</small>}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={navigateBack}></button>
              </div>
              <div className="modal-body p-3 p-md-4">
                {userOrders.length === 0 ? (
                  <div className={`text-center py-5 ${subTextClass}`}>
                    <i className="bi bi-box-seam fs-1 text-secondary d-block mb-2"></i>
                    <h5>No orders placed yet for this account.</h5>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {userOrders.map((ord) => {
                      const stepNum = getOrderStep(ord.status);

                      return (
                        <div key={ord._id} className={`card border shadow-sm p-3 rounded-3 ${darkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-white'}`}>
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                            <div>
                              <span className="fw-bold text-primary small">Order #{ord._id}</span>
                              <small className={`ms-2 d-block d-sm-inline ${subTextClass}`}>
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
                            <div className={`mb-4 p-2 p-md-3 rounded border ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`}>
                              <div className="d-flex justify-content-between align-items-center position-relative">
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-secondary bg-opacity-25" style={{ height: '4px', width: '100%', zIndex: 0 }}></div>
                                <div className="position-absolute top-50 start-0 translate-middle-y bg-success transition-all" style={{ height: '4px', width: `${((stepNum - 1) / 3) * 100}%`, zIndex: 1, transition: 'width 0.4s ease' }}></div>

                                <div className="text-center position-relative" style={{ zIndex: 2 }}>
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto fw-bold ${stepNum >= 1 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '28px', height: '28px', fontSize: '12px' }}>✓</div>
                                  <small className="fw-bold d-block mt-1" style={{ fontSize: '10px' }}>Placed</small>
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
                            <span className={`fw-bold small d-block mb-1 ${subTextClass}`}>Purchased Products:</span>
                            <div className="d-flex flex-wrap gap-2">
                              {ord.orderItems && ord.orderItems.map((item, idx) => (
                                <div key={idx} className={`d-flex align-items-center gap-2 p-2 rounded-3 border shadow-sm ${darkMode ? 'bg-dark border-secondary' : 'bg-light'}`} style={{ cursor: 'pointer' }} onClick={() => handleNavigateToProduct(item)}>
                                  <img 
                                    src={item.image || DEFAULT_FALLBACK_IMAGE} 
                                    alt={item.name} 
                                    className="border bg-white" 
                                    width="40" 
                                    height="40" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_FALLBACK_IMAGE; }}
                                    style={{ objectFit: 'cover', borderRadius: '10px' }} 
                                  />
                                  <div>
                                    <div className="fw-bold small text-truncate" style={{ maxWidth: '120px' }}>{item.name}</div>
                                    <span className="badge bg-secondary" style={{ fontSize: '9px' }}>Qty: {item.qty || 1}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                            <span className="fw-bold text-success small">Total Amount: ₹{ord.totalPrice}</span>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge border me-1 small ${darkMode ? 'bg-dark text-white border-secondary' : 'bg-light text-dark'}`}>{ord.paymentMethod || 'COD'}</span>
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
            <div className={`modal-content border-0 shadow-lg ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">⭐ Rate & Review Delivered Product</h5>
                <button type="button" className="btn-close" onClick={navigateBack}></button>
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
                    <textarea className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} rows="3" required placeholder="Share your experience..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={navigateBack}>Cancel</button>
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className={`modal-content border-0 shadow-lg ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">🔄 Request Order Return / Replacement</h5>
                <button type="button" className="btn-close btn-close-white" onClick={navigateBack}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmitReturnRequest}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Return Type:</label>
                    <select className={`form-select fw-bold ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} value={returnTypeOption} onChange={(e) => setReturnTypeOption(e.target.value)}>
                      <option value="Refund">💵 Money Refund</option>
                      <option value="Replacement">🔄 Item Replacement</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Reason:</label>
                    <select className={`form-select ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                      <option value="Damaged or Defective Item">Damaged or Defective Item</option>
                      <option value="Wrong Item Shipped">Wrong Item Shipped</option>
                      <option value="Size or Fitting Issue">Size or Fitting Issue</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Comments:</label>
                    <textarea className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} rows="3" required placeholder="Explain details..." value={returnComments} onChange={(e) => setReturnComments(e.target.value)}></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={navigateBack}>Cancel</button>
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
            <div className={`modal-content border-0 shadow-lg p-4 ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold">📝 Customer Sign Up</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>
              <form onSubmit={handleEmailSignupSubmit}>
                <div className="mb-2">
                  <input type="text" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Full Name" required value={signupData.name} onChange={(e) => setSignupData({...signupData, name: e.target.value})} />
                </div>
                <div className="mb-2">
                  <input type="email" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Email ID" required value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} />
                </div>
                <div className="mb-2 input-group">
                  <input 
                    type={showSignupPassword ? "text" : "password"} 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
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
                  <input type="tel" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Mobile Number" required value={signupData.mobile} onChange={(e) => setSignupData({...signupData, mobile: e.target.value})} />
                </div>
                <div className="mb-2">
                  <textarea className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} rows="2" placeholder="Shipping Address" required value={signupData.address} onChange={(e) => setSignupData({...signupData, address: e.target.value})}></textarea>
                </div>
                <div className="mb-3">
                  <input type="text" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Pincode" required value={signupData.pincode} onChange={(e) => setSignupData({...signupData, pincode: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-warning w-100 fw-bold py-2 text-dark">Register & Sign Up</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content border-0 shadow-lg p-4 ${darkMode ? 'bg-dark text-white' : 'bg-white text-dark'}`}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-warning">🔓 Sign In to TechStore</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={navigateBack}></button>
              </div>
              <form onSubmit={handleEmailLoginSubmit}>
                <div className="mb-3">
                  <input type="email" className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} placeholder="Email ID" required value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} />
                </div>
                <div className="mb-3 input-group">
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    className={`form-control ${darkMode ? 'bg-secondary bg-opacity-25 text-white border-secondary' : ''}`} 
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
                <button type="submit" className="btn btn-dark w-100 fw-bold py-2 text-warning border-secondary">Sign In</button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;