import { AuthAPI, TokenManager } from './api.js';
import { loadDashboardPage } from './pages/dashboard.js';
import { loadInvoicesPage } from './pages/invoices.js';
import { loadReceiptsPage } from './pages/receipts.js';
import { loadProjectsPage } from './pages/projects.js';
import { loadContactsPage } from './pages/contacts.js';
import { loadNewsletterPage } from './pages/newsletter.js';
import { loadProfilePage } from './pages/profile.js';

// DOM Elements
const loginPage = document.getElementById('loginPage');
const registerPage = document.getElementById('registerPage');
const dashboardLayout = document.getElementById('dashboardLayout');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const pageContent = document.getElementById('pageContent');
const pageTitle = document.getElementById('pageTitle');
const userName = document.getElementById('userName');
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item');

// Utility Functions

export function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

export function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon i');
    const toastTitle = toast.querySelector('.toast-title');
    const toastMessage = toast.querySelector('.toast-message');

    // Update content
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Update icon and type
    toast.className = `toast ${type}`;
    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle';
    } else if (type === 'warning') {
        toastIcon.className = 'fas fa-exclamation-triangle';
    }

    // Show toast
    toast.classList.add('show');

    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

export function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}

// Modal Functions
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Make closeModal global for onclick handlers
window.closeModal = closeModal;

// Format Currency
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format Date
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Page Router
const pages = {
    dashboard: loadDashboardPage,
    invoices: loadInvoicesPage,
    receipts: loadReceiptsPage,
    projects: loadProjectsPage,
    contacts: loadContactsPage,
    newsletter: loadNewsletterPage,
    services: () => pageContent.innerHTML = '<div class="card"><h2>Services Page Coming Soon</h2></div>',
    testimonials: () => pageContent.innerHTML = '<div class="card"><h2>Testimonials Page Coming Soon</h2></div>',
    profile: loadProfilePage
};

export async function navigateTo(page) {
    showLoading();

    try {
        // Update active nav item
        navItems.forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            invoices: 'Invoices',
            receipts: 'Receipts',
            projects: 'Projects',
            quotes: 'Quote Submissions',
            newsletter: 'Newsletter Subscribers',
            services: 'Services',
            testimonials: 'Testimonials',
            profile: 'Profile Settings'
        };
        pageTitle.textContent = titles[page] || 'Dashboard';

        // Load page content
        if (pages[page]) {
            await pages[page]();
        } else {
            pageContent.innerHTML = '<div class="card"><h2>Page not found</h2></div>';
        }
    } catch (error) {
        console.error('Navigation error:', error);
        showToast('error', 'Error', 'Failed to load page');
    } finally {
        showLoading(false);
    }
}

// Check Authentication
function checkAuth() {
    if (TokenManager.isAuthenticated()) {
        showDashboard();
        loadUserProfile();
        navigateTo('dashboard');
    } else {
        showLogin();
    }
}

function showLogin() {
    loginPage.style.display = 'flex';
    registerPage.style.display = 'none';
    dashboardLayout.style.display = 'none';
}

function showRegister() {
    loginPage.style.display = 'none';
    registerPage.style.display = 'flex';
    dashboardLayout.style.display = 'none';
}

function showDashboard() {
    loginPage.style.display = 'none';
    registerPage.style.display = 'none';
    dashboardLayout.style.display = 'flex';
}

async function loadUserProfile() {
    try {
        const profile = await AuthAPI.getProfile();
        userName.textContent = profile.first_name || profile.username || 'Admin';
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    console.log("SENDING LOGIN", { email, password });

    try {
        await AuthAPI.login(email, password);

        showToast('success', 'Welcome Back!', 'Login successful');
        showDashboard();
        loadUserProfile();
        navigateTo('dashboard');
    } catch (error) {
        showToast('error', 'Login Failed', error.message || 'Invalid credentials');
    } finally {
        showLoading(false);
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(registerForm);
    const userData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        password: formData.get('password'),
        password2: formData.get('password2')
    };

    // Validate passwords match
    if (userData.password !== userData.password2) {
        showToast('error', 'Error', 'Passwords do not match');
        showLoading(false);
        return;
    }

    try {
        await AuthAPI.register(userData);
        showToast('success', 'Account Created!', 'Please login with your credentials');
        showLogin();
        registerForm.reset();
    } catch (error) {
        showToast('error', 'Registration Failed', error.message || 'Please try again');
    } finally {
        showLoading(false);
    }
});

// Navigation between login and register
document.getElementById('goToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
});

document.getElementById('goToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        AuthAPI.logout();
    }
});

// Sidebar Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        navigateTo(page);

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('show');
        }
    });
});

// Mobile Sidebar Toggle
document.getElementById('mobileToggle').addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

if (currentTheme === 'dark') {
    themeToggle.querySelector('i').className = 'fas fa-sun';
}

themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !e.target.closest('.mobile-toggle')) {
            sidebar.classList.remove('show');
        }
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Export functions for use in other modules
export { pageContent };