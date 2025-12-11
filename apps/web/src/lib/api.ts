import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // Vite proxy handles the rest
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors (e.g. 401 logout)
    return Promise.reject(error);
  }
);
