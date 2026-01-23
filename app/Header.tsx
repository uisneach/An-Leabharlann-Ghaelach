'use client';
import React, { useState, useEffect } from 'react';

export default function Header() {
	return (
		<header>
		  <nav className="navbar navbar-expand-lg">
		    <div id="logo-and-header">
		      <a className="navbar-brand" href="https://uisneac.com" style={{marginRight: `0px`}}>
		        <img src="https://uisneac.com/assets/Gold-Celtic-Design.png" alt="Logo" width="32" height="32" className="d-inline-block align-text-top" />
		      </a>
		      <a className="navbar-brand" href="/leabharlann/index.html">An Leabharlann Ghaelach</a>
		    </div>
		    <form id="search-form" className="d-flex mx-3" style={{flex: `1`}}>
		      <input id="search-input" className="form-control me-2" type="search" placeholder="Search the database…" aria-label="Search" />
		      <button className="btn btn-light" type="submit">Search</button>
		    </form>
		  </nav>
		</header>
		);
}

