// Header.tsx
import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Form, Button, Modal, Alert, Dropdown } from 'react-bootstrap';
import { login, register, refresh, search } from '@/api';

function parseJwt(token: string) {
  try {
    const part = token.split('.')[1];
    return JSON.parse(atob(part));
  } catch (e) {
    return {};
  }
}

const Header: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSearchResultsModal, setShowSearchResultsModal] = useState(false);
  const [username, setUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    document.addEventListener('authChange', checkAuthStatus);
    return () => {
      document.removeEventListener('authChange', checkAuthStatus);
    };
  }, []);

  const checkAuthStatus = async () => {
    let token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token) {
      setIsAuthenticated(false);
      setUsername('');
      return;
    }

    try {
      let payload = parseJwt(token);
      if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
        if (!refreshToken) throw new Error('Token expired');
        const res = await refresh(refreshToken);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Token refresh failed');
        if (data.token) {
          localStorage.setItem('token', data.token);
          token = data.token;
          payload = parseJwt(token);
        }
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      }
      const user = payload.username || payload.sub || 'User';
      setUsername(user);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Auth check error:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      setUsername('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    try {
      const response = await login(loginUsername, loginPassword);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Login failed');
      if (data.token) localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      setErrorMessage('');
      setShowLoginModal(false);
      const payload = parseJwt(data.token);
      setUsername(payload.username || loginUsername);
      setIsAuthenticated(true);
      document.dispatchEvent(new Event('authChange'));
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(registerUsername)) {
      setRegisterError('Username must be 3-20 characters, alphanumeric and underscores only.');
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters long.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
    try {
      const response = await register(registerUsername, registerPassword);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Registration failed');
      // Auto-login
      const loginResponse = await login(registerUsername, registerPassword);
      const loginData = await loginResponse.json();
      if (!loginResponse.ok) throw new Error(loginData.error?.message || 'Login failed after registration');
      localStorage.setItem('token', loginData.token);
      if (loginData.refreshToken) localStorage.setItem('refreshToken', loginData.refreshToken);
      setShowRegisterModal(false);
      setUsername(registerUsername);
      setIsAuthenticated(true);
      document.dispatchEvent(new Event('authChange'));
      // Redirect if needed
      // window.location.href = '/';
    } catch (error: any) {
      setRegisterError(error.message);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) {
      setErrorMessage('Please enter at least 2 characters');
      return;
    }
    try {
      const response = await search(searchQuery);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Search failed');
      }
      const results = await response.json();
      setSearchResults(results);
      setShowSearchResultsModal(true);
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Search failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUsername('');
    document.dispatchEvent(new Event('authChange'));
  };

  const escapeHtml = (str: string) => {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  };

  return (
    <header>
      <style>{`.form-label, .modal { color: black; }`}</style>
      <Navbar expand="lg">
        <div id="logo-and-header">
          <Navbar.Brand href="https://uisneac.com" style={{ marginRight: 0 }}>
            <img src="https://uisneac.com/assets/Gold-Celtic-Design.png" alt="Logo" width={32} height={32} className="d-inline-block align-text-top" />
          </Navbar.Brand>
          <Navbar.Brand href="/leabharlann/index.html">An Leabharlann Ghaelach</Navbar.Brand>
        </div>
        <Form id="search-form" className="d-flex mx-3" style={{ flex: 1 }} onSubmit={handleSearch}>
          <Form.Control
            id="search-input"
            className="me-2"
            type="search"
            placeholder="Search the database…"
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="light" type="submit">Search</Button>
        </Form>
        <Nav>
          {isAuthenticated ? (
            <Dropdown>
              <Dropdown.Toggle as="a" className="nav-link" id="profileMenu">
                {username}
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                <Dropdown.Item href="account.html">Account</Dropdown.Item>
                <Dropdown.Item onClick={handleLogout}>Log out</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <Nav.Link id="profileMenu" onClick={() => setShowLoginModal(true)}>Account</Nav.Link>
          )}
        </Nav>
      </Navbar>

      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Log In</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="loginForm" onSubmit={handleLogin}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control type="text" id="login-username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" id="login-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            </Form.Group>
            {errorMessage && <div className="text-danger mb-3">{errorMessage}</div>}
            <Button variant="primary" type="submit">Log In</Button>
            <Button variant="link" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}>Register</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Register</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {registerError && <Alert variant="danger">{registerError}</Alert>}
          <Form id="register-form" onSubmit={handleRegister}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                id="register-username"
                placeholder="Enter a unique username"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                required
              />
              <Form.Text muted>3-20 characters, alphanumeric and underscores only.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                id="register-password"
                placeholder="Create a password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
              <Form.Text muted>At least 8 characters.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                id="confirm-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">Register</Button>
          </Form>
          <p className="text-center mt-3">Already have an account? <a href="#" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}>Log In</a></p>
        </Modal.Body>
      </Modal>

      <Modal show={showSearchResultsModal} onHide={() => setShowSearchResultsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Search Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div id="headerSearchResults" className="list-group">
            {searchResults.length === 0 ? (
              <p className="text-muted">No results found for "{searchQuery}"</p>
            ) : (
              searchResults.map((node, index) => {
                const label = (node.labels || []).find((l: string) => l !== 'Entity') || 'Node';
                const displayName = (node.properties && (node.properties.display_name || node.properties.name || node.properties.title)) || node.id || 'Unknown';
                return (
                  <a
                    key={index}
                    className="list-group-item list-group-item-action"
                    href={`/leabharlann/info/index.html?label=${encodeURIComponent(label)}&id=${encodeURIComponent(node.id)}`}
                  >
                    <strong>{label}</strong>: {escapeHtml(String(displayName))}
                  </a>
                );
              })
            )}
          </div>
        </Modal.Body>
      </Modal>
    </header>
  );
};

export default Header;