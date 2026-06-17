// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let state = {
    updates: [],
    filteredUpdates: [],
    activeFilter: 'all',
    searchQuery: '',
    selectedUpdate: null,
    currentTemplate: 'standard'
};

// SVG Circle circumference for the progress indicator
const RING_CIRCUMFERENCE = 2 * Math.PI * 11; // r = 11, approx 69.115

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const DOM = {
    btnRefresh: document.getElementById('btn-refresh'),
    cacheIndicator: document.getElementById('cache-indicator'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterContainer: document.getElementById('filter-container'),
    visibleCount: document.getElementById('visible-count'),
    totalCount: document.getElementById('total-count'),
    shimmerContainer: document.getElementById('shimmer-container'),
    emptyState: document.getElementById('empty-state'),
    updatesContainer: document.getElementById('updates-container'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    modalUpdatePreview: document.getElementById('modal-update-preview'),
    templateContainer: document.querySelector('.template-chips'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    progressCircle: document.getElementById('progress-ring-circle'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCloseBackdrop: document.getElementById('modal-close-backdrop'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnSubmitTweet: document.getElementById('btn-submit-tweet'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnBackToTop: document.getElementById('btn-back-to-top'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// ==========================================================================
// INITS AND LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Load Lucide Icons
    lucide.createIcons();
    
    // Load initial updates
    fetchUpdates(false);
    
    // Theme Initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
    }
    
    // Event Listeners
    DOM.btnThemeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.classList.toggle('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
    
    DOM.btnRefresh.addEventListener('click', () => fetchUpdates(true));
    DOM.btnExportCsv.addEventListener('click', exportToCSV);
    
    // Back to Top Button Listeners
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            DOM.btnBackToTop.classList.add('visible');
        } else {
            DOM.btnBackToTop.classList.remove('visible');
        }
    });
    
    DOM.btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        DOM.btnClearSearch.style.display = state.searchQuery ? 'flex' : 'none';
        applyFilters();
    });
    
    DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        DOM.btnClearSearch.style.display = 'none';
        applyFilters();
    });
    
    DOM.filterContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.filter-badge');
        if (!button) return;
        
        // Toggle active class
        document.querySelectorAll('.filter-badge').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        state.activeFilter = button.dataset.type;
        applyFilters();
    });
    
    // Modal Listeners
    DOM.btnCloseModal.addEventListener('click', closeModal);
    DOM.btnCloseBackdrop.addEventListener('click', closeModal);
    DOM.templateContainer.addEventListener('click', handleTemplateChange);
    DOM.tweetTextarea.addEventListener('input', handleTextareaInput);
    
    DOM.btnCopyTweet.addEventListener('click', copyTweetText);
    DOM.btnSubmitTweet.addEventListener('click', publishTweet);

    // Initial setup of progress ring SVG
    if (DOM.progressCircle) {
        DOM.progressCircle.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
        DOM.progressCircle.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }
});

// ==========================================================================
// DATA FETCHING
// ==========================================================================
async function fetchUpdates(forceRefresh = false) {
    toggleLoadingState(true);
    
    try {
        const url = `/api/updates${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            state.updates = result.updates;
            updateCacheBadge(result.cached);
            applyFilters();
        } else {
            showToast(`Error: ${result.error || 'Failed to fetch release notes'}`, 'error');
        }
    } catch (error) {
        showToast('Network error, unable to reach server', 'error');
        console.error(error);
    } finally {
        toggleLoadingState(false);
    }
}

function toggleLoadingState(isLoading) {
    if (isLoading) {
        DOM.shimmerContainer.style.display = 'grid';
        DOM.updatesContainer.style.display = 'none';
        DOM.emptyState.style.display = 'none';
        
        // Add rotate animation to refresh button icon
        const refreshIcon = DOM.btnRefresh.querySelector('.icon-spin-target');
        if (refreshIcon) refreshIcon.classList.add('icon-spin');
        DOM.btnRefresh.disabled = true;
    } else {
        DOM.shimmerContainer.style.display = 'none';
        
        const refreshIcon = DOM.btnRefresh.querySelector('.icon-spin-target');
        if (refreshIcon) refreshIcon.classList.remove('icon-spin');
        DOM.btnRefresh.disabled = false;
    }
}

function updateCacheBadge(isCached) {
    if (isCached) {
        DOM.cacheIndicator.innerText = 'Cached';
        DOM.cacheIndicator.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        DOM.cacheIndicator.style.color = '#60a5fa';
    } else {
        DOM.cacheIndicator.innerText = 'Live Feed (Refreshed)';
        DOM.cacheIndicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        DOM.cacheIndicator.style.color = '#34d399';
    }
}

// ==========================================================================
// FILTERING AND RENDERING
// ==========================================================================
function applyFilters() {
    let filtered = [...state.updates];
    
    // 1. Filter by category
    if (state.activeFilter !== 'all') {
        filtered = filtered.filter(item => item.type.toLowerCase() === state.activeFilter);
    }
    
    // 2. Filter by search query
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            return item.text.toLowerCase().includes(query) || 
                   item.type.toLowerCase().includes(query) ||
                   item.date.toLowerCase().includes(query);
        });
    }
    
    state.filteredUpdates = filtered;
    
    // Update count labels
    DOM.visibleCount.innerText = filtered.length;
    DOM.totalCount.innerText = state.updates.length;
    
    renderUpdatesList();
}

function renderUpdatesList() {
    if (state.filteredUpdates.length === 0) {
        DOM.updatesContainer.style.display = 'none';
        DOM.emptyState.style.display = 'flex';
        return;
    }
    
    DOM.emptyState.style.display = 'none';
    DOM.updatesContainer.style.display = 'grid';
    
    DOM.updatesContainer.innerHTML = state.filteredUpdates.map(item => {
        const badgeClass = getBadgeClass(item.type);
        return `
            <article class="update-card" data-id="${item.id}" id="card-${item.id}">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="badge ${badgeClass}">${item.type}</span>
                        <time class="card-date" datetime="${item.updated_iso}">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            ${item.date}
                        </time>
                    </div>
                </div>
                
                <div class="card-body">
                    ${item.html}
                </div>
                
                <div class="card-actions">
                    <button class="btn-secondary btn-copy-raw" onclick="copyRawText('${item.id}', this)" aria-label="Copy update text">
                        <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
                        <span>Copy</span>
                    </button>
                    <button class="btn-tweet" onclick="openTweetComposer('${item.id}')" aria-label="Share update on Twitter">
                        <i data-lucide="twitter" style="width: 16px; height: 16px;"></i>
                        <span>Tweet</span>
                    </button>
                </div>
            </article>
        `;
    }).join('');
    
    // Reinitialize icons for newly added elements
    lucide.createIcons();
}

function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return 'badge-feature';
    if (t === 'announcement') return 'badge-announcement';
    if (t === 'issue') return 'badge-issue';
    if (t === 'deprecation') return 'badge-deprecation';
    return 'badge-general';
}

// ==========================================================================
// TWEET COMPOSER SYSTEM
// ==========================================================================
function openTweetComposer(updateId) {
    const update = state.updates.find(item => item.id === updateId);
    if (!update) return;
    
    state.selectedUpdate = update;
    state.currentTemplate = 'standard';
    
    // Set active class on standard template chip
    document.querySelectorAll('.template-chip').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.template === 'standard') btn.classList.add('active');
    });
    
    // Load preview
    DOM.modalUpdatePreview.innerText = `[${update.type}] ${update.text}`;
    
    // Generate preset text
    const tweetText = generateTweetText(update, 'standard');
    DOM.tweetTextarea.value = tweetText;
    
    // Update counters
    updateCharacterCount(tweetText.length);
    
    // Open modal
    DOM.tweetModal.classList.add('open');
    DOM.tweetModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeModal() {
    DOM.tweetModal.classList.remove('open');
    DOM.tweetModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Release background scroll
    state.selectedUpdate = null;
}

function handleTemplateChange(e) {
    const chip = e.target.closest('.template-chip');
    if (!chip || !state.selectedUpdate) return;
    
    document.querySelectorAll('.template-chip').forEach(btn => btn.classList.remove('active'));
    chip.classList.add('active');
    
    state.currentTemplate = chip.dataset.template;
    const newText = generateTweetText(state.selectedUpdate, state.currentTemplate);
    DOM.tweetTextarea.value = newText;
    
    updateCharacterCount(newText.length);
}

function handleTextareaInput(e) {
    updateCharacterCount(e.target.value.length);
}

function generateTweetText(update, templateType) {
    const type = update.type;
    const text = update.text;
    
    let prefix = "";
    let suffix = "";
    
    if (templateType === 'standard') {
        prefix = `🚀 Google Cloud #BigQuery ${type}: `;
        suffix = `\n\n#GCP #DataWarehouse`;
    } else if (templateType === 'brief') {
        prefix = `BigQuery ${type}: `;
        suffix = ` #GoogleCloud`;
    } else if (templateType === 'quote') {
        prefix = `“`;
        suffix = `” — BigQuery Release Update`;
    }
    
    // Calculate character budget for original text
    const budget = 280 - prefix.length - suffix.length;
    let mainText = text;
    
    if (text.length > budget) {
        mainText = text.substring(0, budget - 3) + "...";
    }
    
    return `${prefix}${mainText}${suffix}`;
}

function updateCharacterCount(length) {
    const remaining = 280 - length;
    DOM.charCount.innerText = remaining;
    
    // Progress Ring Calculations
    const progress = Math.min(length / 280, 1);
    const offset = RING_CIRCUMFERENCE - (progress * RING_CIRCUMFERENCE);
    
    DOM.progressCircle.style.strokeDashoffset = offset;
    
    // Visual indicators depending on characters left
    if (remaining < 0) {
        DOM.charCount.style.color = '#ef4444'; // Red
        DOM.progressCircle.style.stroke = '#ef4444';
        DOM.btnSubmitTweet.disabled = true;
        DOM.btnSubmitTweet.style.opacity = '0.5';
        DOM.btnSubmitTweet.style.pointerEvents = 'none';
    } else if (remaining <= 20) {
        DOM.charCount.style.color = '#f59e0b'; // Amber
        DOM.progressCircle.style.stroke = '#f59e0b';
        DOM.btnSubmitTweet.disabled = false;
        DOM.btnSubmitTweet.style.opacity = '1';
        DOM.btnSubmitTweet.style.pointerEvents = 'auto';
    } else {
        DOM.charCount.style.color = 'var(--text-muted)';
        DOM.progressCircle.style.stroke = 'var(--twitter-blue)';
        DOM.btnSubmitTweet.disabled = false;
        DOM.btnSubmitTweet.style.opacity = '1';
        DOM.btnSubmitTweet.style.pointerEvents = 'auto';
    }
}

// ==========================================================================
// TWEET SHARE AND UTILS
// ==========================================================================
function copyTweetText() {
    const text = DOM.tweetTextarea.value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet draft copied to clipboard!');
        
        // Visual button feedback
        const originalHTML = DOM.btnCopyTweet.innerHTML;
        DOM.btnCopyTweet.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg><span>Copied!</span>';
        DOM.btnCopyTweet.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            DOM.btnCopyTweet.innerHTML = originalHTML;
            DOM.btnCopyTweet.style.transform = 'scale(1)';
        }, 1500);
    });
}

function publishTweet() {
    const text = DOM.tweetTextarea.value;
    if (text.length > 280) {
        showToast('Draft exceeds character limit!', 'error');
        return;
    }
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    closeModal();
}

function copyRawText(updateId, buttonEl) {
    const update = state.updates.find(item => item.id === updateId);
    if (!update) return;
    
    navigator.clipboard.writeText(update.text).then(() => {
        showToast('Release note text copied!');
        
        if (buttonEl) {
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg><span>Copied!</span>';
            buttonEl.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                buttonEl.style.transform = 'scale(1)';
            }, 1500);
        }
    });
}

function exportToCSV() {
    if (state.filteredUpdates.length === 0) {
        showToast('No updates to export', 'error');
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Content'];
    const rows = state.filteredUpdates.map(upd => [
        upd.id,
        upd.date,
        upd.type,
        upd.text.replace(/"/g, '""') // Escape double quotes
    ]);
    
    // Construct CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const filterName = state.activeFilter;
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `bigquery_releases_${filterName}_${timestamp}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully!');
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    
    DOM.toastMessage.innerText = message;
    
    // Stylize based on type
    const icon = DOM.toast.querySelector('.toast-icon');
    if (type === 'error') {
        DOM.toast.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        if (icon) {
            icon.style.color = '#ef4444';
            icon.setAttribute('data-lucide', 'alert-triangle');
        }
    } else {
        DOM.toast.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        if (icon) {
            icon.style.color = '#10b981';
            icon.setAttribute('data-lucide', 'check-circle');
        }
    }
    
    // Refresh lucide icons in toast
    lucide.createIcons();
    
    DOM.toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}
