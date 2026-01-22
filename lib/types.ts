export interface Source {
  id: string;
  title: string;
  originalTitle?: string;
  century: string;
  language: string;
  url: string;
  description?: string;
  translator?: string;
  yearWritten?: number;
  category: string;
}

export interface SearchParams {
  query?: string;
  century?: string;
  language?: string;
  category?: string;
  limit?: number;
}