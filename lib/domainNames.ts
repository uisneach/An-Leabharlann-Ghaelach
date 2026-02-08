/**
 * Domain to Display Name Mapping
 * 
 * Maps external link domains to their friendly display names
 * Used in the info page to show recognizable names instead of generic "External Link"
 */

export const DOMAIN_NAMES: Record<string, string> = {
  // Archives & Digital Libraries
  'archive.org': 'The Internet Archive',
  'web.archive.org': 'The Internet Archive',
  
  // Irish & Celtic Studies
  'celt.ucc.ie': 'CELT',
  'celt.dias.ie': 'CELT',
  'isos.dias.ie': 'Irish Script on Screen',
  'vanhamel.nl': "Bernhard Mees' Website",
  'maryjones.us': "Mary Jones' Celtic Literature Collective",
  
  // Academic & Research
  'jstor.org': 'JSTOR',
  'academia.edu': 'Academia.edu',
  'researchgate.net': 'ResearchGate',
  'scholar.google.com': 'Google Scholar',
  'doi.org': 'DOI',
  
  // Libraries & Repositories
  'worldcat.org': 'WorldCat',
  'loc.gov': 'Library of Congress',
  'bl.uk': 'British Library',
  'bodleian.ox.ac.uk': 'Bodleian Library',
  'tcd.ie': 'Trinity College Dublin',
  
  // Publishers
  'oxfordreference.com': 'Oxford Reference',
  'cambridge.org': 'Cambridge University Press',
  'brill.com': 'Brill',
  
  // Journals
  'erudit.org': 'Érudit',
  'persee.fr': 'Persée',
  
  // Wikipedia & Wikimedia
  'wikipedia.org': 'Wikipedia',
  'en.wikipedia.org': 'Wikipedia',
  'ga.wikipedia.org': 'Vicipéid (Irish Wikipedia)',
  'wikisource.org': 'Wikisource',
  'commons.wikimedia.org': 'Wikimedia Commons',
  
  // Other Resources
  'googlebooks.com': 'Google Books',
  'books.google.com': 'Google Books',
  'hathitrust.org': 'HathiTrust',
  'biodiversitylibrary.org': 'Biodiversity Heritage Library',
};

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get display name for a URL based on its domain
 * Returns the mapped name if found, otherwise returns the domain itself
 */
export function getDomainDisplayName(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;
  
  // Check exact match first
  if (DOMAIN_NAMES[domain]) {
    return DOMAIN_NAMES[domain];
  }
  
  // Check if any key is a subdomain match
  for (const [key, value] of Object.entries(DOMAIN_NAMES)) {
    if (domain.endsWith(key)) {
      return value;
    }
  }
  
  // Return the domain itself as fallback
  return domain;
}

/**
 * Get display text for an external link
 * Uses custom name if available, otherwise uses the property key
 */
export function getExternalLinkText(url: string, propertyKey: string): string {
  const displayName = getDomainDisplayName(url);
  
  if (displayName) {
    return displayName;
  }
  
  // Fallback to cleaned property key
  return propertyKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}