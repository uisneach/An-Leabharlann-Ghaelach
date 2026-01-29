import React, { useState, useEffect } from 'react';

interface JwtPayload {
  username?: string;
  sub?: string;
  exp?: number;
}

interface Node {
  id: string;
  labels?: string[];
  properties?: {
    display_name?: string;
    name?: string;
    title?: string;
  };
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
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [searchError, setSearchError] = useState<string>('');

  const parseJwt = (token: string): JwtPayload => {
    try {
      const part = token.split('.')[1];
      return JSON.parse(atob(part));
    } catch (e) {
      return {};
    }
  };

  const handleLogin = async (): Promise<void> => {
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      if (data.token) localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      
      // Trigger auth check in parent
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

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(registerUsername)) {
      errors.username = 'Username must be 3-20 characters, alphanumeric and underscores only.';
      valid = false;
    }
    if (registerPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
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
      const response = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: registerUsername, password: registerPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setRegisterAlert('Account created successfully. Logging in...');

        // Auto-login after registration
        const loginResponse = await fetch('/api/auth?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: registerUsername, password: registerPassword })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok || !loginData.token) {
          throw new Error(loginData.error || 'Login failed after registration');
        }

        localStorage.setItem('token', loginData.token);
        if (loginData.refreshToken) localStorage.setItem('refreshToken', loginData.refreshToken);

        setIsRegisterModalOpen(false);
        setRegisterUsername('');
        setRegisterPassword('');
        setConfirmPassword('');
        
        // Trigger auth check in parent
        onAuthChange();
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      setRegisterAlert(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setIsDropdownOpen(false);
    
    // Trigger auth check in parent
    onAuthChange();
  };

  const handleSearch = async (): Promise<void> => {
    setSearchError('');

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchError('Please enter at least 2 characters');
      return;
    }

    try {
      const response = await fetch(`/api/util?action=search&q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
      setIsSearchModalOpen(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    }
  };

  const escapeHtml = (str: string): string => {
    return str.replace(/[&<>"']/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return escapeMap[match];
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
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
            onKeyPress={(e) => handleKeyPress(e, handleSearch)}
          />
          <button className="btn btn-white" id="search-btn" onClick={handleSearch}>Search</button>
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
                    onKeyPress={(e) => handleKeyPress(e, handleLogin)}
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
                    onKeyPress={(e) => handleKeyPress(e, handleLogin)}
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
                    onKeyPress={(e) => handleKeyPress(e, handleRegister)}
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
                    onKeyPress={(e) => handleKeyPress(e, handleRegister)}
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
                    onKeyPress={(e) => handleKeyPress(e, handleRegister)}
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

      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">Search Results</h5>
              <button className="btn-close" onClick={() => setIsSearchModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="list-group">
                {searchResults.length === 0 ? (
                  <p className="text-muted">No results found for "{searchQuery}"</p>
                ) : (
                  searchResults.map((node, idx) => {
                    const label = (node.labels || []).find(l => l !== 'Entity') || 'Node';
                    const displayName = (node.properties && (node.properties.display_name || node.properties.name || node.properties.title)) || node.id || 'Unknown';
                    return (
                      <a
                        key={idx}
                        className="list-group-item"
                        href={`/leabharlann/info/index.html?label=${encodeURIComponent(label)}&id=${encodeURIComponent(node.id)}`}
                      >
                        <strong>{label}</strong>: {escapeHtml(displayName)}
                      </a>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;