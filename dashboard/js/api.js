// API Configuration
// const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Change to your API URL in production
const API_BASE_URL = 'https://oplueaswsapi.pythonanywhere.com/api'; 



// Token Management
export const TokenManager = {
    getAccessToken() {
        return localStorage.getItem('access_token');
    },

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },

    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        if (refresh) {
            localStorage.setItem('refresh_token', refresh);
        }
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    }
};

// API Client with auto token refresh
class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    // Process failed requests queue
    processQueue(error, token = null) {
        this.failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        this.failedQueue = [];
    }

    // Refresh access token
    async refreshAccessToken() {
        const refreshToken = TokenManager.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.baseURL}/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            TokenManager.setTokens(data.access, data.refresh);
            return data.access;
        } catch (error) {
            TokenManager.clearTokens();
            window.location.href = '/';
            throw error;
        }
    }

    // Main fetch method with auto retry on 401
    async fetch(url, options = {}) {
        const token = TokenManager.getAccessToken();

        // Add authorization header if token exists
        if (token && !options.skipAuth) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };

        }

        // Add default headers
        if (!(options.body instanceof FormData)) {
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
        }

        try {
            let response = await fetch(`${this.baseURL}${url}`, options);
        

            // Handle 401 Unauthorized - try to refresh token
            if (response.status === 401 && !options.skipAuth) {
                if (this.isRefreshing) {
                    // Wait for token refresh to complete
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({ resolve, reject });
                    }).then(token => {
                        options.headers['Authorization'] = `Bearer ${token}`;
                        return fetch(`${this.baseURL}${url}`, options);
                    });
                }

                this.isRefreshing = true;

                try {
                    const newToken = await this.refreshAccessToken();
                    this.isRefreshing = false;
                    this.processQueue(null, newToken);

                    // Retry original request
                    options.headers['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(`${this.baseURL}${url}`, options);
                } catch (error) {
                    this.isRefreshing = false;
                    this.processQueue(error, null);
                    throw error;
                }
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Convenience methods
    get(url, options = {}) {
        return this.fetch(url, { ...options, method: 'GET' });
    }

    post(url, data, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    put(url, data, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    patch(url, data, options = {}) {
        return this.fetch(url, {
            ...options,
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data)
        });
    }

    delete(url, options = {}) {
        return this.fetch(url, { ...options, method: 'DELETE' });
    }
}

// Create and export API instance
const api = new APIClient();

// Authentication API
export const AuthAPI = {
    async login(email, password) {
        const data = await api.post('/auth/login/', {
            email,
            password
        }, { skipAuth: true });

        TokenManager.setTokens(data.access, data.refresh);
        return data;
    },

    async register(userData) {
        return await api.post('/auth/register/', userData, { skipAuth: true });
    },

    logout() {
        TokenManager.clearTokens();
        window.location.href = '/';
    },

    async getProfile() {
        return await api.get('/auth/profile/');
    },

    async updateProfile(userData) {
        return await api.put('/auth/profile/update/', userData);
    }
};

// Invoices API
// Add these methods to your InvoicesAPI in api.js

export const InvoicesAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/invoices/${queryString ? '?' + queryString : ''}`);

        
    },

    async getById(id) {
        return await api.get(`/invoices/${id}/`);
    },

    async create(invoiceData) {
        console.log(invoiceData)
        return await api.post('/invoices/', invoiceData);
    },

    async update(id, invoiceData) {
        return await api.put(`/invoices/${id}/`, invoiceData);
    },

    async delete(id) {
        return await api.delete(`/invoices/${id}/`);
    },

    async getAvailableQuotes() {
        return await api.get('/invoices/available-quotes/');
    },

    async markPaid(id) {
        return await api.post(`/invoices/${id}/mark-paid/`);
    },

    async downloadPDF(id) {
        return await api.get(`/invoices/${id}/download/`);
    }
};

// Receipts API
// export const ReceiptsAPI = {
//     async getAll(params = {}) {
//         const queryString = new URLSearchParams(params).toString();
//         return await api.get(`/receipts/${queryString ? '?' + queryString : ''}`);
//     },

//     async create(receiptData) {
//         return await api.post('/receipts/', receiptData);
//     }
// };






// Add these methods to your ReceiptsAPI in api.js

export const ReceiptsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/receipts/${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return await api.get(`/receipts/${id}/`);
    },

    async create(receiptData) {
        return await api.post('/receipts/', receiptData);
    },

    async delete(id) {
        return await api.delete(`/receipts/${id}/`);
    },

    async getPaidInvoices() {
        return await api.get('/receipts/paid-invoices/');
    },


    async downloadPDF(id) {
        // For file downloads, we need to handle it differently
        const token = TokenManager.getAccessToken();
        const url = `${API_BASE_URL}/receipts/${id}/download/`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }
        
        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `receipt-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    }
};









// Dashboard API
export const DashboardAPI = {
    async getSummary() {
        return await api.get('/dashboard/summary/');
    }
};

// Projects API (from your Ajibo Interiors backend)
export const ProjectsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/projects/${queryString ? '?' + queryString : ''}`);
    },

    async getById(slug) {
        return await api.get(`/projects/${slug}/`);
    }
};




// Contacts API
// Contacts API (which is actually Quotes)
// api.js - Contacts API
export const ContactsAPI = {
    async getAll(params = {}) {
        try {
            // Build query string
            const queryParams = new URLSearchParams();
            
            // Add filters
            if (params.status) {
                queryParams.append('status', params.status);
            }
            if (params.page_size) {
                queryParams.append('page_size', params.page_size);
            }
            
            const queryString = queryParams.toString();
            const url = `/quotes/admin/${queryString ? '?' + queryString : ''}`;
            
            // console.log('Fetching from URL:', url);
            
            const response = await api.fetch(url);
            console.log('Response received:', response);
            
            // Handle both paginated and non-paginated responses
            return {
                results: response.results || response,
                count: response.count,
                next: response.next,
                previous: response.previous
            };
        } catch (error) {
            console.error('ContactsAPI.getAll error:', error);
            throw error;
        }
    },
    
    async updateStatus(id, status) {
        try {
            // console.log(`Updating quote ${id} to status: ${status}`);
            const response = await api.patch(`/quotes/admin/${id}/`, { status });
            // console.log('Status update response:', response);
            return response;
        } catch (error) {
            console.error('ContactsAPI.updateStatus error:', error);
            throw error;
        }
    }
};

// Newsletter API
export const NewsletterAPI = {
    async getSubscribers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/newsletter/${queryString ? '?' + queryString : ''}`);
    }
};




// Services API
export const ServicesAPI = {
    async getAll() {
        return await api.get('/services/');
    }
};

// Testimonials API
export const TestimonialsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/testimonials/${queryString ? '?' + queryString : ''}`);
    },

    async approve(id) {
        return await api.patch(`/testimonials/${id}/`, { is_approved: true });
    }
};



export default api;
