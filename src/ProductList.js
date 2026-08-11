import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

// LIVE BACKEND BASE URL (NO TRAILING SLASH)
const BASE_URL = 'https://my-ecommerce-project-nmfj.onrender.com';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 15;

  // Fetch Live Products from Backend Database
  const fetchProducts = async () => {
    try {
      setLoading(true);
      // 🔧 FIXED: Changed local 5000 URL to Live Render Backend Base URL
      const res = await axios.get(`${BASE_URL}/api/products`);
      
      // Normalize response array
      const productList = Array.isArray(res.data) ? res.data : (res.data.products || []);
      setProducts(productList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products from database');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Pagination Calculations
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-outline-primary" onClick={fetchProducts}>Retry Fetching</button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4 text-center">Explore Our Store Products</h2>
      
      {products.length === 0 ? (
        <div className="text-center py-5">
          <h5 className="text-muted">No products available in database.</h5>
          <p className="small text-secondary">Please add products using the Admin Portal.</p>
        </div>
      ) : (
        <>
          <div className="row g-4">
            {currentProducts.map((p) => {
              const currentStock = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0;
              return (
              <div key={p._id || p.id} className="col-md-4 col-sm-6">
                <div className="card h-100 border-0 shadow-sm">
                  <img 
                    src={p.image || 'https://via.placeholder.com/300x200'} 
                    className="card-img-top p-3" 
                    alt={p.name} 
                    style={{ height: '220px', objectFit: 'contain' }}
                  />
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-secondary">{p.category || 'General'}</span>
                      
                      {/* 🟢 DYNAMIC MONGO DB LIVE STOCK BADGE */}
                      {currentStock <= 0 ? (
                        <span className="badge bg-danger">Out of Stock (0 Left)</span>
                      ) : currentStock < 5 ? (
                        <span className="badge bg-warning text-dark">Low Stock ({currentStock} Left)</span>
                      ) : (
                        <span className="badge bg-success">In Stock ({currentStock} Left)</span>
                      )}
                    </div>

                    <h5 className="card-title fw-bold">{p.name}</h5>
                    <p className="card-text text-muted small flex-grow-1">
                      {p.description ? p.description.substring(0, 80) + '...' : 'No description'}
                    </p>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <span className="fs-4 fw-bold text-success">₹{p.price}</span>
                      <button 
                        className={`btn fw-bold ${currentStock <= 0 ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={currentStock <= 0}
                      >
                        <i className="bi bi-cart-plus me-1"></i> {currentStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center mt-5">
              <nav>
                <ul className="pagination pagination-lg shadow-sm">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-item-link btn btn-outline-primary me-2 fw-bold" 
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      &laquo; Previous
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <li key={page} className="page-item me-1">
                      <button
                        className={`btn fw-bold ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-item-link btn btn-outline-primary ms-2 fw-bold" 
                      onClick={() => handlePageChange(currentPage + 1)}
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
  );
}

export default ProductList;