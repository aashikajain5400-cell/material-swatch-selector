const { useState, useEffect, useRef } = React;

/**
 * Sanitizes input string to prevent XSS injection attacks.
 * Escapes HTML characters.
 * @param {string} input 
 * @returns {string}
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Logs a simulated telemetry ping when primary actions are completed.
 * @param {string} action - Name of the action
 * @param {Object} details - Details of the action
 */
function logTelemetry(action, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[Analytics] User interacted with Material Swatch Selector | Action: ${action} | Time: ${timestamp}`, details);
}

/**
 * Mock data representing premium material swatches.
 */
const INITIAL_MATERIALS = [
  {
    id: 'mat-1',
    name: 'European White Oak',
    category: 'Wood',
    color: '#E3DAC9',
    finish: 'Matte Satin',
    createdAt: '2026-06-15T08:30:00.000Z'
  },
  {
    id: 'mat-2',
    name: 'Calacatta Lincoln Marble',
    category: 'Stone',
    color: '#F4F5F6',
    finish: 'Polished',
    createdAt: '2026-06-20T10:15:00.000Z'
  },
  {
    id: 'mat-3',
    name: 'Belgian Oyster Linen',
    category: 'Fabric',
    color: '#D2C9BD',
    finish: 'Tactile Woven',
    createdAt: '2026-06-22T14:45:00.000Z'
  },
  {
    id: 'mat-4',
    name: 'Brushed Champagne Brass',
    category: 'Metal',
    color: '#CBB285',
    finish: 'Micro-brushed',
    createdAt: '2026-06-25T11:00:00.000Z'
  },
  {
    id: 'mat-5',
    name: 'Full-Grain Cognac Leather',
    category: 'Leather',
    color: '#834F2E',
    finish: 'Analine Glazed',
    createdAt: '2026-06-29T16:20:00.000Z'
  },
  {
    id: 'mat-6',
    name: 'Charcoal Nero Marquina',
    category: 'Stone',
    color: '#1E1E1E',
    finish: 'Honed Matte',
    createdAt: '2026-07-01T09:00:00.000Z'
  }
];

const CATEGORIES = ['Wood', 'Stone', 'Fabric', 'Metal', 'Leather'];

function App() {
  // --- 1. STATE INITIALIZATION ---
  const [materials, setMaterials] = useState(() => {
    const saved = localStorage.getItem('prodesk_materials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse materials from localStorage', e);
      }
    }
    return INITIAL_MATERIALS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [latencyMode, setLatencyMode] = useState('ideal'); // 'ideal', 'slow', 'offline'
  
  // Loading states
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formColor, setFormColor] = useState('#E5E7EB');
  const [formFinish, setFormFinish] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // UI Interactive States
  const [toasts, setToasts] = useState([]);
  const [previewMaterial, setPreviewMaterial] = useState(null);

  // Ref for search to prevent excessive telemetry logs while typing
  const telemetryDebounceRef = useRef(null);

  // --- 2. EFFECTS & PERSISTENCE ---
  
  // Sync materials with localStorage
  useEffect(() => {
    localStorage.setItem('prodesk_materials', JSON.stringify(materials));
  }, [materials]);

  // Log initial catalog load
  useEffect(() => {
    logTelemetry('Load Catalog', { count: materials.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Telemetry for searching (debounced to avoid spamming the console)
  useEffect(() => {
    if (telemetryDebounceRef.current) {
      clearTimeout(telemetryDebounceRef.current);
    }
    telemetryDebounceRef.current = setTimeout(() => {
      if (searchQuery || selectedCategory !== 'All') {
        logTelemetry('Filter Catalog', { query: searchQuery, category: selectedCategory });
      }
    }, 800);

    return () => clearTimeout(telemetryDebounceRef.current);
  }, [searchQuery, selectedCategory]);

  // Simulated latency effect when search query or category changes
  useEffect(() => {
    if (latencyMode === 'slow') {
      setIsDataLoading(true);
      const timer = setTimeout(() => {
        setIsDataLoading(false);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setIsDataLoading(false);
    }
  }, [searchQuery, selectedCategory, latencyMode]);

  // Keyboard accessibility helper for modal closing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewMaterial(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 3. HELPER ACTIONS ---

  // Add toast message
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss toast
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Close toast manually
  const closeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle network latency state changes
  const handleLatencyChange = (e) => {
    const mode = e.target.value;
    setLatencyMode(mode);
    logTelemetry('Network State Changed', { mode });
    showToast(`Simulated connection: ${mode.toUpperCase()} mode enabled.`, 'warning');
  };

  // Copy Hex Color to clipboard
  const handleCopyHex = (e, color) => {
    e.stopPropagation(); // Avoid triggering card preview modal
    navigator.clipboard.writeText(color).then(
      () => {
        showToast(`Hex code ${color} copied to clipboard!`, 'success');
        logTelemetry('Copy Hex Code', { hex: color });
      },
      () => {
        showToast('Failed to copy hex code.', 'error');
      }
    );
  };

  // --- 4. FORM ACTIONS (ADD / DELETE) ---

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formName.trim()) {
      errors.name = 'Material name is required.';
    } else if (formName.trim().length < 2) {
      errors.name = 'Material name must be at least 2 characters.';
    }

    if (!formCategory) {
      errors.category = 'Please select a material category.';
    }

    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!formColor.trim()) {
      errors.color = 'Hex color is required.';
    } else if (!hexPattern.test(formColor.trim())) {
      errors.color = 'Must be a valid hex color (e.g. #E3DAC9).';
    }

    if (!formFinish.trim()) {
      errors.finish = 'Material finish is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add Material
  const handleAddMaterial = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      logTelemetry('Add Swatch Failed', { errors: 'Form validation errors occurred' });
      showToast('Please correct form errors before submitting.', 'error');
      return;
    }

    // 1. Connection check: Offline state behavior
    if (latencyMode === 'offline') {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        showToast('Offline Error: Failed to add material. Local changes cannot sync with server.', 'error');
        logTelemetry('Add Swatch Offline Failure', { name: formName });
      }, 1000);
      return;
    }

    // 2. Slow connection behavior
    if (latencyMode === 'slow') {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitting(false);
    }

    // Sanitize user inputs to protect against XSS injection
    const sanitizedName = sanitizeInput(formName.trim());
    const sanitizedFinish = sanitizeInput(formFinish.trim());
    const finalColor = formColor.trim().toUpperCase();

    const newMaterial = {
      id: `mat-${Date.now()}`,
      name: sanitizedName,
      category: formCategory,
      color: finalColor,
      finish: sanitizedFinish,
      createdAt: new Date().toISOString()
    };

    setMaterials((prev) => [newMaterial, ...prev]);
    showToast(`Successfully added swatch: "${sanitizedName}"!`, 'success');
    logTelemetry('Add Swatch', { name: sanitizedName, category: formCategory, color: finalColor });

    // Reset Form State
    setFormName('');
    setFormCategory('');
    setFormColor('#E5E7EB');
    setFormFinish('');
    setFormErrors({});
  };

  // Delete Material
  const handleDeleteMaterial = async (e, id, name) => {
    e.stopPropagation(); // Prevent opening the preview modal

    if (latencyMode === 'offline') {
      setDeletingId(id);
      setTimeout(() => {
        setDeletingId(null);
        showToast('Offline Error: Failed to delete material. Connection offline.', 'error');
        logTelemetry('Delete Swatch Offline Failure', { id, name });
      }, 1000);
      return;
    }

    if (latencyMode === 'slow') {
      setDeletingId(id);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setDeletingId(null);
    }

    setMaterials((prev) => prev.filter((m) => m.id !== id));
    showToast(`Swatch "${name}" has been deleted.`, 'success');
    logTelemetry('Delete Swatch', { id, name });

    // If deleting the currently previewed item, close the preview
    if (previewMaterial && previewMaterial.id === id) {
      setPreviewMaterial(null);
    }
  };

  // Reset Filters & Search (from empty state)
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    logTelemetry('Reset Search Filters', {});
  };

  // --- 5. DERIVED STATE & FILTERING ---

  // Filter materials based on search terms and category tabs
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.finish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.color.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      material.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Calculate dashboard statistics
  const totalCount = materials.length;
  const woodCount = materials.filter((m) => m.category === 'Wood').length;
  const stoneCount = materials.filter((m) => m.category === 'Stone').length;
  const recentlyAddedCount = materials.filter((m) => {
    const createdTime = new Date(m.createdAt).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return createdTime >= sevenDaysAgo;
  }).length;

  // Formatting Date helper
  const formatDateString = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (err) {
      console.error(err);
      return 'N/A';
    }
  };

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="app-container">
      
      {/* Offline banner warning at top if offline mode active */}
      {latencyMode === 'offline' && (
        <div className="offline-banner" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.17-2.69M9.08 5.41A10.94 10.94 0 0 1 12 5c2.6 0 4.96.9 6.83 2.41M12 18.5a3 3 0 0 1-3-3" />
          </svg>
          Offline Mode Activated. Dashboard functions in Read-Only mode. Modifications will fail simulated database writes.
        </div>
      )}

      {/* Sticky Premium Header */}
      <header className="header" role="banner">
        <div className="header-inner">
          <div className="header-logo-section">
            <div className="logo-icon" aria-hidden="true">P</div>
            <div className="header-title-group">
              <h1 className="header-title">ProDesk Swatch Selector</h1>
              <span className="header-subtitle">Enterprise Showroom Catalog</span>
            </div>
          </div>
          
          <div className="header-controls">
            <div className="network-selector-container">
              <span className={`network-indicator-dot ${latencyMode === 'offline' ? 'offline' : latencyMode === 'slow' ? 'slow' : ''}`} aria-hidden="true"></span>
              <label htmlFor="network-state-select" className="sr-only">Connection Simulator</label>
              <select 
                id="network-state-select"
                className="network-select" 
                value={latencyMode} 
                onChange={handleLatencyChange}
                aria-label="Simulate Network Latency"
              >
                <option value="ideal">Ideal Connection (0ms)</option>
                <option value="slow">Slow Connection (3G - 800ms)</option>
                <option value="offline">Offline / Disconnected</option>
              </select>
            </div>

            <div className="profile-section">
              <time className="date-text" dateTime={new Date().toISOString().split('T')[0]}>{currentDate}</time>
              <div className="avatar-placeholder" aria-label="Profile Avatar - AJ" title="Logged in as Aashika Jain">
                AJ
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Dashboard Layout */}
      <main className="main-content">
        
        {/* Statistics Grid */}
        <section aria-label="Catalog Summary Statistics" className="stats-grid">
          <div className="stat-card" tabIndex="0">
            <div className="stat-header">
              <span>Total Swatches</span>
              <span className="stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
              </span>
            </div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-description">Active items in catalog</div>
          </div>

          <div className="stat-card" tabIndex="0">
            <div className="stat-header">
              <span>Wood Materials</span>
              <span className="stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </span>
            </div>
            <div className="stat-value">{woodCount}</div>
            <div className="stat-description">Wood boards & veneers</div>
          </div>

          <div className="stat-card" tabIndex="0">
            <div className="stat-header">
              <span>Stone Materials</span>
              <span className="stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v19M5 12h14M12 12L5 5M12 12l7 7" /></svg>
              </span>
            </div>
            <div className="stat-value">{stoneCount}</div>
            <div className="stat-description">Marble, granite & composite</div>
          </div>

          <div className="stat-card" tabIndex="0">
            <div className="stat-header">
              <span>Recently Added</span>
              <span className="stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </span>
            </div>
            <div className="stat-value">{recentlyAddedCount}</div>
            <div className="stat-description">Added in the last 7 days</div>
          </div>
        </section>

        {/* Dashboard Content split into left swatch view and right create swatch */}
        <div className="dashboard-grid">
          
          {/* LEFT AREA: Search, Filter, and Grid of Swatches */}
          <div className="left-panel">
            
            {/* Search and Filters Card */}
            <section aria-label="Search and Filter Controls" className="search-filter-card">
              <div className="search-input-wrapper">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="search"
                  className="search-input"
                  placeholder="Search materials by name, finish, or hex code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search materials by name, finish, or hex code"
                />
                <span className="search-kbd-hint" aria-hidden="true">⌘K</span>
              </div>

              <div className="filter-bar">
                <div className="category-tabs" role="tablist" aria-label="Filter by material category">
                  <button 
                    role="tab"
                    aria-selected={selectedCategory === 'All'}
                    className={`tab-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('All')}
                    aria-label="Show all categories"
                  >
                    All Materials
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      role="tab"
                      aria-selected={selectedCategory === category}
                      className={`tab-btn ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category)}
                      aria-label={`Filter by ${category} category`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {(searchQuery || selectedCategory !== 'All') && (
                  <button 
                    className="clear-search-btn"
                    onClick={handleResetFilters}
                    aria-label="Reset all search filters"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </section>

            {/* Swatch grid section */}
            <section aria-label="Material Swatches">
              <div className="swatches-header-group">
                <div className="section-title-wrapper">
                  <h2 className="section-title">Showroom Swatches</h2>
                  <span className="section-badge" aria-label={`${filteredMaterials.length} results found`}>
                    {filteredMaterials.length}
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                
                {/* 1. Loading state */}
                {isDataLoading ? (
                  <div className="loading-container" role="status" aria-live="polite">
                    <div className="spinner" aria-hidden="true"></div>
                    <p className="loading-text">Fetching Catalog Swatches...</p>
                    <p className="loading-subtext">Simulating slow 3G latency connection</p>
                  </div>
                ) : 
                
                /* 2. Empty state */
                filteredMaterials.length === 0 ? (
                  <div className="empty-container">
                    <div className="empty-illustration" aria-hidden="true">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                      </svg>
                    </div>
                    <h3 className="empty-title">No swatches found</h3>
                    <p className="empty-description">
                      No materials match "{searchQuery}" in category "{selectedCategory}". Try clearing your filters or adding a new material.
                    </p>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleResetFilters}
                      aria-label="Reset search filter to show all materials"
                    >
                      Reset Catalog Filter
                    </button>
                  </div>
                ) : 
                
                /* 3. Happy Path: Catalog Grid */
                (
                  <div className="material-grid">
                    {filteredMaterials.map((material) => (
                      <article 
                        key={material.id} 
                        className="material-card"
                        tabIndex="0"
                        role="button"
                        aria-haspopup="dialog"
                        aria-label={`Preview Swatch: ${material.name}, Category: ${material.category}, Finish: ${material.finish}`}
                        onClick={() => setPreviewMaterial(material)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPreviewMaterial(material);
                          }
                        }}
                      >
                        {/* Interactive Color swatch card graphic */}
                        <div className="swatch-display-area">
                          <div 
                            className="swatch-color-fill" 
                            style={{ backgroundColor: material.color }}
                            aria-hidden="true"
                          ></div>
                          <div className="badge-group">
                            <span className="category-badge">{material.category}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="material-info">
                          <h3 className="material-name" title={material.name}>{material.name}</h3>
                          
                          <div className="material-meta-row">
                            <span className="meta-label">Finish:</span>
                            <span className="meta-value" title={material.finish}>{material.finish}</span>
                          </div>
                          
                          <div className="material-meta-row">
                            <span className="meta-label">Hex Color:</span>
                            <button 
                              className="meta-value color-hex-tag"
                              title="Click to copy hex color"
                              aria-label={`Color value is ${material.color}. Click to copy to clipboard`}
                              onClick={(e) => handleCopyHex(e, material.color)}
                            >
                              {material.color}
                            </button>
                          </div>
                        </div>

                        {/* Footer details + Actions */}
                        <div className="card-footer">
                          <time className="creation-date" dateTime={material.createdAt}>
                            {formatDateString(material.createdAt)}
                          </time>
                          
                          <div className="card-actions">
                            <button 
                              className="btn-danger-outline btn-icon-only"
                              disabled={deletingId === material.id}
                              aria-label={`Delete ${material.name} swatch`}
                              title="Delete swatch"
                              onClick={(e) => handleDeleteMaterial(e, material.id, material.name)}
                            >
                              {deletingId === material.id ? (
                                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', margin: 0 }} aria-hidden="true"></div>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT AREA: Register Material Swatch Form */}
          <aside className="right-panel" aria-label="Add Swatch Panel">
            <section className="form-card">
              <h2 className="form-title">Register Swatch</h2>
              
              <form onSubmit={handleAddMaterial} className="swatch-form" noValidate>
                
                {/* 1. Name */}
                <div className="form-group">
                  <label htmlFor="material-name" className="form-label">Material Name</label>
                  <input 
                    id="material-name"
                    type="text" 
                    className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. American Black Walnut"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                    aria-invalid={!!formErrors.name}
                    aria-required="true"
                    disabled={isSubmitting}
                  />
                  {formErrors.name && (
                    <span id="name-error" className="form-error-msg" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                {/* 2. Category Select */}
                <div className="form-group">
                  <label htmlFor="material-category" className="form-label">Category</label>
                  <select 
                    id="material-category"
                    className={`form-select ${formErrors.category ? 'input-error' : ''}`}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    aria-describedby={formErrors.category ? "category-error" : undefined}
                    aria-invalid={!!formErrors.category}
                    aria-required="true"
                    disabled={isSubmitting}
                  >
                    <option value="">Select a category...</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <span id="category-error" className="form-error-msg" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {formErrors.category}
                    </span>
                  )}
                </div>

                {/* 3. Color Picker (Hex Text Input + Pick Color box) */}
                <div className="form-group">
                  <label htmlFor="material-color" className="form-label">Hex Color</label>
                  <div className="color-picker-row">
                    <input 
                      id="material-color"
                      type="text" 
                      className={`form-input ${formErrors.color ? 'input-error' : ''}`}
                      placeholder="#E5E7EB"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      aria-describedby={formErrors.color ? "color-error" : undefined}
                      aria-invalid={!!formErrors.color}
                      aria-required="true"
                      disabled={isSubmitting}
                    />
                    <input 
                      type="color"
                      className="color-input-picker"
                      value={formColor.startsWith('#') && formColor.length === 7 ? formColor : '#e5e7eb'}
                      onChange={(e) => setFormColor(e.target.value.toUpperCase())}
                      aria-label="Color palette picker"
                      disabled={isSubmitting}
                    />
                  </div>
                  {formErrors.color ? (
                    <span id="color-error" className="form-error-msg" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {formErrors.color}
                    </span>
                  ) : (
                    <span className="date-text" style={{ fontSize: '0.675rem' }}>Visual picker will synchronize uppercase Hex values automatically.</span>
                  )}
                </div>

                {/* 4. Finish */}
                <div className="form-group">
                  <label htmlFor="material-finish" className="form-label">Finish</label>
                  <input 
                    id="material-finish"
                    type="text" 
                    className={`form-input ${formErrors.finish ? 'input-error' : ''}`}
                    placeholder="e.g. Honed Matte, Brushed Satin"
                    value={formFinish}
                    onChange={(e) => setFormFinish(e.target.value)}
                    aria-describedby={formErrors.finish ? "finish-error" : undefined}
                    aria-invalid={!!formErrors.finish}
                    aria-required="true"
                    disabled={isSubmitting}
                  />
                  {formErrors.finish && (
                    <span id="finish-error" className="form-error-msg" role="alert">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {formErrors.finish}
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  className="btn btn-primary submit-btn" 
                  disabled={isSubmitting}
                  aria-label="Add new material swatch to catalog"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderTopColor: '#fff' }} aria-hidden="true"></div>
                      Adding to Database...
                    </>
                  ) : (
                    <>Add Swatch to Catalog</>
                  )}
                </button>
              </form>
            </section>
          </aside>

        </div>
      </main>

      {/* Premium Modal Detail Dialog overlay */}
      {previewMaterial && (
        <div 
          className="modal-overlay" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-headline"
          onClick={() => setPreviewMaterial(null)}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="category-badge">{previewMaterial.category}</span>
                <h2 id="modal-headline" className="modal-title">Swatch Detail View</h2>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setPreviewMaterial(null)}
                aria-label="Close detailed swatch preview modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-large-swatch">
                <div 
                  className="modal-swatch-fill" 
                  style={{ backgroundColor: previewMaterial.color }}
                  aria-hidden="true"
                ></div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{previewMaterial.name}</h3>
                
                <div className="modal-details-grid">
                  <div className="modal-detail-item">
                    <span className="modal-detail-label">Finish Treatment</span>
                    <span className="modal-detail-value">{previewMaterial.finish}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-detail-label">Hex Color Code</span>
                    <span className="modal-detail-value" style={{ fontFamily: 'monospace' }}>{previewMaterial.color}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-detail-label">Material ID</span>
                    <span className="modal-detail-value" style={{ fontFamily: 'monospace' }}>{previewMaterial.id}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="modal-detail-label">Registered Date</span>
                    <span className="modal-detail-value">{formatDateString(previewMaterial.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={(e) => handleCopyHex(e, previewMaterial.color)}
                aria-label={`Copy hex code ${previewMaterial.color} to clipboard`}
              >
                Copy Color Hex
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setPreviewMaterial(null)}
                aria-label="Close modal dialog"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Box */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            <button 
              className="toast-close-btn" 
              onClick={() => closeToast(toast.id)}
              aria-label="Close notification message"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Footnote footer */}
      <footer className="footer" role="contentinfo">
        <div className="footer-inner">
          <p>© 2026 ProDesk Swatch Systems. All rights reserved.</p>
          <p>Version 1.0.0-PRO (Build ENG-55081)</p>
        </div>
      </footer>

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
