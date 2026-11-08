import axios from 'axios';

export default axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://cc-1-b4mz.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});
