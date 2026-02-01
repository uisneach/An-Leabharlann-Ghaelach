import React, { useState, useEffect } from 'react';
import { login, register, searchNodes, SearchOptions } from '@/lib/api';
import { 
  escapeHtml, 
  handleEnterKey, 
  validateUsername, 
  validatePassword,
  setLocalStorage,
  clearAuthTokens,
  getNodeTitle
} from '@/lib/utils';

interface SearchResult {
  nodeId: string;
  labels: string[];
  properties: {
    display_name?: string;
    name?: string;
    title?: string;
    [key: string]: any;
  };
  score: number;
  matchedProperty?: string;
  matchType?: 'exact' | 'prefix' | 'substring';
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalMatches: number;
  returned: number;
}

interface RegisterErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface HeaderProps {
  isAuthenticated: boolean;
  username: string;
  onAuthChange: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAuthenticated, username, onAuthChange }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  
  const [registerUsername, setRegisterUsername] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [registerAlert, setRegisterAlert] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [totalMatches, setTotalMatches] = useState<number>(0);

  // Advanced search filters
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
  const [searchLabels, setSearchLabels] = useState<string>('');
  const [excludeLabels, setExcludeLabels] = useState<string>('');
  const [propertyFilters, setPropertyFilters] = useState<string>('');

  const handleLogin = async (): Promise<void> => {
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Please fill in all fields');
      return;
    }

    try {
      const response = await login(loginUsername, loginPassword);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      if (data.token) setLocalStorage('token', data.token);
      if (data.refreshToken) setLocalStorage('refreshToken', data.refreshToken);

      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      
      onAuthChange();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (): Promise<void> => {
    setRegisterAlert('');
    setRegisterErrors({});

    let valid = true;
    const errors: RegisterErrors = {};

    const usernameValidation = validateUsername(registerUsername);
    if (!usernameValidation.valid) {
      errors.username = usernameValidation.error;
      valid = false;
    }

    const passwordValidation = validatePassword(registerPassword);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error;
      valid = false;
    }

    if (registerPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
      valid = false;
    }

    if (!valid) {
      setRegisterErrors(errors);
      return;
    }

    try {
      const response = await register(registerUsername, registerPassword);
      const data = await response.json();

      if (response.ok) {
        setRegisterAlert('Account created successfully. Logging in...');

        // Auto-login after registration
        const loginResponse = await login(registerUsername, registerPassword);
        const loginData = await loginResponse.json();

        if (!loginResponse.ok || !loginData.token) {
          throw new Error(loginData.error || 'Login failed after registration');
        }

        setLocalStorage('token', loginData.token);
        if (loginData.refreshToken) setLocalStorage('refreshToken', loginData.refreshToken);

        setIsRegisterModalOpen(false);
        setRegisterUsername('');
        setRegisterPassword('');
        setConfirmPassword('');
        
        onAuthChange();
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      setRegisterAlert(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  const handleLogout = (): void => {
    clearAuthTokens();
    setIsDropdownOpen(false);
    onAuthChange();
  };

  const handleSearch = async (): Promise<void> => {
    setSearchError('');
    setSearchLoading(true);

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchError('Please enter at least 2 characters');
      setSearchLoading(false);
      return;
    }

    try {
      let response;
      
      // Build search options if advanced filters are used
      if (showAdvancedSearch && (searchLabels || excludeLabels || propertyFilters)) {
        const options: SearchOptions = {
          query: searchQuery,
        };
        
        if (searchLabels.trim()) {
          options.labels = searchLabels.split(',').map(l => l.trim()).filter(Boolean);
        }
        
        if (excludeLabels.trim()) {
          options.excludeLabels = excludeLabels.split(',').map(l => l.trim()).filter(Boolean);
        }
        
        if (propertyFilters.trim()) {
          const props: Record<string, string> = {};
          const pairs = propertyFilters.split(',');
          for (const pair of pairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
              props[key] = value;
            }
          }
          if (Object.keys(props).length > 0) {
            options.properties = props;
          }
        }
        
        response = await searchNodes(options);
      } else {
        // Simple search
        response = await searchNodes(searchQuery);
      }
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data: SearchResponse = await response.json();
      setSearchResults(data.results || []);
      setTotalMatches(data.totalMatches || 0);
      setIsSearchModalOpen(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setTotalMatches(0);
    setSearchLabels('');
    setExcludeLabels('');
    setPropertyFilters('');
    setShowAdvancedSearch(false);
  };

  const getMatchTypeLabel = (matchType?: 'exact' | 'prefix' | 'substring'): string => {
    switch (matchType) {
      case 'exact': return 'Exact match';
      case 'prefix': return 'Starts with';
      case 'substring': return 'Contains';
      default: return '';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 200) return 'success';
    if (score >= 100) return 'primary';
    if (score >= 50) return 'info';
    return 'secondary';
  };

  return (
    <header>
      <nav>
        <div id="logo-and-header">
          <a className="navbar-brand" href="https://uisneac.com" style={{ marginRight: 0 }}>
            <img src="https://uisneac.com/assets/Gold-Celtic-Design.png" alt="Logo" width="32" height="32" />
          </a>
          <a className="navbar-brand" href="/">An Leabharlann Ghaelach</a>
        </div>
        <div id="search-form">
          <input
            className="form-control"
            type="search"
            placeholder="Search the database…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => handleEnterKey(e, handleSearch)}
            disabled={searchLoading}
          />
          <button 
            className="btn btn-white" 
            id="search-btn" 
            onClick={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <li style={{ position: 'relative' }}>
            <a
              className="nav-link"
              onClick={() => {
                if (isAuthenticated) {
                  setIsDropdownOpen(!isDropdownOpen);
                } else {
                  setIsLoginModalOpen(true);
                }
              }}
            >
              {isAuthenticated ? username : 'Account'}
            </a>
            {isAuthenticated && isDropdownOpen && (
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="account.html">Account</a></li>
                <li><a className="dropdown-item" onClick={handleLogout}>Log out</a></li>
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">Log In</h5>
              <button className="btn-close" onClick={() => setIsLoginModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    onKeyPress={(e) => handleEnterKey(e, handleLogin)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyPress={(e) => handleEnterKey(e, handleLogin)}
                    required
                  />
                </div>
                {loginError && <div className="text-danger mb-3">{loginError}</div>}
                <button className="btn btn-primary btn-blue" onClick={handleLogin}>Log In</button>
                <button
                  className="btn btn-link btn-blue"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setIsRegisterModalOpen(true);
                  }}>
                  Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRegisterModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">Register</h5>
              <button className="btn-close" onClick={() => setIsRegisterModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {registerAlert && (
                <div className={`alert ${registerAlert.includes('success') ? 'alert-success' : 'alert-danger'}`}>
                  {registerAlert}
                </div>
              )}
              <div>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={registerUsername}
                    onChange={(e) => {
                      setRegisterUsername(e.target.value);
                      setRegisterErrors({ ...registerErrors, username: '' });
                    }}
                    onKeyPress={(e) => handleEnterKey(e, handleRegister)}
                    placeholder="Enter a unique username"
                    required
                  />
                  <small className="text-muted">3-20 characters, alphanumeric and underscores only.</small>
                  {registerErrors.username && <div className="invalid-feedback">{registerErrors.username}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={registerPassword}
                    onChange={(e) => {
                      setRegisterPassword(e.target.value);
                      setRegisterErrors({ ...registerErrors, password: '' });
                    }}
                    onKeyPress={(e) => handleEnterKey(e, handleRegister)}
                    placeholder="Create a password"
                    required
                  />
                  <small className="text-muted">At least 8 characters.</small>
                  {registerErrors.password && <div className="invalid-feedback">{registerErrors.password}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setRegisterErrors({ ...registerErrors, confirmPassword: '' });
                    }}
                    onKeyPress={(e) => handleEnterKey(e, handleRegister)}
                    placeholder="Re-enter your password"
                    required
                  />
                  {registerErrors.confirmPassword && <div className="invalid-feedback">{registerErrors.confirmPassword}</div>}
                </div>
                <button className="btn btn-primary w-100" onClick={handleRegister}>Register</button>
              </div>
              <p className="text-center mt-3">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegisterModalOpen(false); setIsLoginModalOpen(true); }}>Log In</a></p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsSearchModalOpen(false); clearSearch(); }}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h5 className="modal-title">
                Search Results for "{searchQuery}"
                {totalMatches > 0 && (
                  <small className="text-muted ms-2">({totalMatches} match{totalMatches !== 1 ? 'es' : ''})</small>
                )}
              </h5>
              <button className="btn-close" onClick={() => { setIsSearchModalOpen(false); clearSearch(); }}>×</button>
            </div>
            <div className="modal-body">
              {/* Advanced Search Toggle */}
              <div className="mb-3">
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  {showAdvancedSearch ? '− Hide' : '+ Show'} Advanced Filters
                </button>
              </div>

              {/* Advanced Search Filters */}
              {showAdvancedSearch && (
                <div className="card mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="card-body">
                    <h6 className="card-title">Advanced Filters</h6>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                        Include Labels (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g., Text, Author, Edition"
                        value={searchLabels}
                        onChange={(e) => setSearchLabels(e.target.value)}
                      />
                      <small className="text-muted">Only search in nodes with these labels</small>
                    </div>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                        Exclude Labels (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g., Translation, Commentary"
                        value={excludeLabels}
                        onChange={(e) => setExcludeLabels(e.target.value)}
                      />
                      <small className="text-muted">Exclude nodes with these labels</small>
                    </div>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                        Property Filters (key:value pairs, comma-separated)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g., language:Irish, period:Medieval"
                        value={propertyFilters}
                        onChange={(e) => setPropertyFilters(e.target.value)}
                      />
                      <small className="text-muted">Filter by property values</small>
                    </div>
                    <button 
                      className="btn btn-sm btn-primary mt-2"
                      onClick={handleSearch}
                      disabled={searchLoading}
                    >
                      {searchLoading ? 'Searching...' : 'Apply Filters'}
                    </button>
                    <button 
                      className="btn btn-sm btn-link"
                      onClick={() => {
                        setSearchLabels('');
                        setExcludeLabels('');
                        setPropertyFilters('');
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Search Error */}
              {searchError && (
                <div className="alert alert-danger">
                  {searchError}
                </div>
              )}

              {/* Search Results */}
              <div className="list-group" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {searchResults.length === 0 && !searchError ? (
                  <p className="text-muted">No results found for "{searchQuery}"</p>
                ) : (
                  searchResults.map((result, idx) => {
                    const label = (result.labels || []).find(l => l !== 'Entity') || 'Node';
                    const displayName = (result.properties && (
                      result.properties.display_name || 
                      result.properties.name || 
                      result.properties.title
                    )) || result.nodeId || 'Unknown';
                    
                    return (
                      <a
                        key={idx}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                        href={`/info?id=${encodeURIComponent(result.nodeId)}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div className="flex-grow-1">
                          <div className="d-flex w-100 justify-content-between align-items-start">
                            <h6 className="mb-1">
                              <strong style={{ color: '#3366cc' }}>{label}</strong>: {escapeHtml(displayName)}
                            </h6>
                            <span className={`badge bg-${getScoreColor(result.score)} rounded-pill ms-2`}>
                              {Math.round(result.score)}
                            </span>
                          </div>
                          {result.matchedProperty && (
                            <small className="text-muted">
                              Matched in <strong>{result.matchedProperty}</strong>
                              {result.matchType && ` (${getMatchTypeLabel(result.matchType)})`}
                            </small>
                          )}
                        </div>
                      </a>
                    );
                  })
                )}
              </div>

              {/* Result Count Info */}
              {searchResults.length > 0 && (
                <div className="mt-3 text-muted" style={{ fontSize: '0.875rem' }}>
                  Showing {searchResults.length} of {totalMatches} results
                  {searchResults.length < totalMatches && ' (top ranked)'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;