// Variable to store all providers
let allProviders = [];

// Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxZJmQJRr3swLELNHmJd3xkw5DwJKR_whAnux-Chk_nypn_O1MQCxZvHbpfr2EEEKoH/exec';

document.addEventListener('DOMContentLoaded', function() {
    initI18n();

    const yearEl = document.getElementById('footerYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    window.onLanguageChange = refreshUiForLanguage;

    initAreaChips();
    initCategoryTiles();
    initFooterServiceLinks();
    initSearchButton();
    initViewAllLinks();
    loadProviders();
});

function updateSelectDefaults() {
    const serviceFilter = document.getElementById('serviceFilter');
    const areaFilter = document.getElementById('areaFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (serviceFilter && serviceFilter.options[0]) {
        serviceFilter.options[0].textContent = t('allServices');
    }
    if (areaFilter && areaFilter.options[0]) {
        areaFilter.options[0].textContent = t('allAreas');
    }
    if (statusFilter && statusFilter.options[0]) {
        statusFilter.options[0].textContent = t('allStatus');
    }
}

function refreshFilterOptionLabels() {
    const serviceFilter = document.getElementById('serviceFilter');
    const statusFilter = document.getElementById('statusFilter');

    const areaFilter = document.getElementById('areaFilter');

    if (serviceFilter) {
        for (let i = 1; i < serviceFilter.options.length; i++) {
            const opt = serviceFilter.options[i];
            opt.textContent = translateServiceLabel(opt.value);
        }
    }

    if (areaFilter) {
        for (let i = 1; i < areaFilter.options.length; i++) {
            const opt = areaFilter.options[i];
            opt.textContent = translateAreaLabel(opt.value);
        }
    }

    if (statusFilter) {
        for (let i = 1; i < statusFilter.options.length; i++) {
            const opt = statusFilter.options[i];
            opt.textContent = translateStatusLabel(opt.value);
        }
    }
}

function refreshUiForLanguage() {
    updateSelectDefaults();
    refreshFilterOptionLabels();

    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage && loadingMessage.style.display !== 'none') {
        loadingMessage.textContent = t('loading');
    }

    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && !errorMessage.hidden) {
        errorMessage.textContent = t('error');
    }

    if (allProviders.length > 0) {
        displayPopularProviders();
        applySearchAndFilter();
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getInitials(name) {
    const displayName = translateProviderName(name);
    const words = displayName.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';

    if (currentLang === 'mr') {
        return words
            .slice(0, 2)
            .map(word => word.charAt(0))
            .join('');
    }

    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase() || '?';
}

function getServiceClass(service) {
    const s = (service || '').toLowerCase();
    if (s.includes('electric')) return 'service-electric';
    if (s.includes('plumb')) return 'service-plumber';
    if (s.includes('carpent')) return 'service-carpenter';
    if (s.includes('taxi') || s.includes('cab')) return 'service-taxi';
    if (s.includes('auto') || s.includes('rickshaw')) return 'service-auto';
    if (s.includes('milk')) return 'service-milk';
    if (s.includes('ac') || s.includes('air')) return 'service-ac';
    return 'service-default';
}

function setServiceFilterByKeyword(keyword) {
    const serviceFilter = document.getElementById('serviceFilter');
    if (!serviceFilter || !keyword) return false;

    const match = [...serviceFilter.options].find(
        opt => opt.value && opt.value.toLowerCase().includes(keyword.toLowerCase())
    );
    serviceFilter.value = match ? match.value : '';
    return Boolean(match);
}

function initCategoryTiles() {
    document.querySelectorAll('.category-tile[data-service-filter]').forEach(tile => {
        tile.addEventListener('click', function() {
            const keyword = this.getAttribute('data-service-filter');
            document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            setServiceFilterByKeyword(keyword);
            applySearchAndFilter();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function initSearchButton() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', applySearchAndFilter);
    }
}

function initViewAllLinks() {
    const viewAllPopular = document.getElementById('viewAllPopular');
    const viewAllCategories = document.getElementById('viewAllCategories');

    function scrollToListings() {
        document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
    }

    if (viewAllPopular) {
        viewAllPopular.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToListings();
        });
    }

    if (viewAllCategories) {
        viewAllCategories.addEventListener('click', function() {
            document.getElementById('serviceFilter').value = '';
            document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
            applySearchAndFilter();
            scrollToListings();
        });
    }
}

function initAreaChips() {
    const chips = document.querySelectorAll('.area-chip');
    const areaFilter = document.getElementById('areaFilter');

    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            const area = this.getAttribute('data-area');
            const isActive = this.classList.contains('active');

            chips.forEach(c => c.classList.remove('active'));

            if (isActive) {
                if (areaFilter) areaFilter.value = '';
            } else {
                this.classList.add('active');
                if (areaFilter) areaFilter.value = area;
            }

            applySearchAndFilter();
        });
    });

    if (areaFilter) {
        areaFilter.addEventListener('change', function() {
            const selected = this.value;
            chips.forEach(chip => {
                chip.classList.toggle('active', chip.getAttribute('data-area') === selected);
            });
        });
    }
}

function getActiveProviders() {
    return allProviders.filter(provider => provider.status === 'Active');
}

function updateStatistics(providers) {
    const statProviders = document.getElementById('statProviders');
    const statServices = document.getElementById('statServices');
    const statAreas = document.getElementById('statAreas');
    if (!statProviders) return;

    const serviceCount = new Set(providers.map(p => p.service).filter(Boolean)).size;
    const areaCount = new Set(providers.map(p => p.area).filter(Boolean)).size;

    statProviders.textContent = providers.length;
    statServices.textContent = serviceCount;
    statAreas.textContent = areaCount;
}

function initFooterServiceLinks() {
    document.querySelectorAll('[data-service-filter]').forEach(link => {
        if (link.classList.contains('category-tile')) return;

        link.addEventListener('click', function(e) {
            e.preventDefault();
            const value = this.getAttribute('data-service-filter');
            setServiceFilterByKeyword(value);
            applySearchAndFilter();
            document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function loadProviders() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const servicesList = document.getElementById('servicesList');

    loadingMessage.style.display = 'block';
    errorMessage.hidden = true;
    servicesList.innerHTML = '';

    fetch(GOOGLE_APPS_SCRIPT_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allProviders = data.services || data;

            loadingMessage.style.display = 'none';

            populateServiceFilter();
            populateAreaFilter();
            populateStatusFilter();

            addEventListeners();
            applySearchAndFilter();
            displayPopularProviders();
            updateStatistics(getActiveProviders());
        })
        .catch(error => {
            console.error('Error loading providers:', error);
            loadingMessage.style.display = 'none';
            errorMessage.hidden = false;
            servicesList.innerHTML = '';
            const popularList = document.getElementById('popularList');
            if (popularList) popularList.innerHTML = '';
        });
}

function populateServiceFilter() {
    const uniqueServices = [...new Set(allProviders.map(provider => provider.service))];
    const filterDropdown = document.getElementById('serviceFilter');

    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }

    uniqueServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = translateServiceLabel(service);
        filterDropdown.appendChild(option);
    });

    updateSelectDefaults();
}

function populateAreaFilter() {
    const uniqueAreas = [...new Set(allProviders.map(provider => provider.area))];
    const filterDropdown = document.getElementById('areaFilter');

    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }

    uniqueAreas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = translateAreaLabel(area);
        filterDropdown.appendChild(option);
    });

    updateSelectDefaults();
}

function populateStatusFilter() {
    const uniqueStatuses = [...new Set(allProviders.map(provider => provider.status).filter(Boolean))];
    const filterDropdown = document.getElementById('statusFilter');

    if (!filterDropdown) return;

    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }

    uniqueStatuses.sort().forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = translateStatusLabel(status);
        filterDropdown.appendChild(option);
    });

    // Default: show Active only; user can choose "All Status" for every provider
    if ([...filterDropdown.options].some(opt => opt.value === 'Active')) {
        filterDropdown.value = 'Active';
    } else {
        filterDropdown.value = '';
    }

    updateSelectDefaults();
}

function displayPopularProviders() {
    const popularList = document.getElementById('popularList');
    if (!popularList) return;

    popularList.innerHTML = '';
    const popular = getActiveProviders().slice(0, 5);

    if (popular.length === 0) {
        popularList.innerHTML = `<p class="popular-empty">${escapeHtml(t('popularEmpty'))}</p>`;
        return;
    }

    popular.forEach(provider => {
        popularList.appendChild(createProviderCard(provider));
    });
}

function displayProviders(providers) {
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';

    if (providers.length === 0) {
        servicesList.innerHTML = `<p class="no-results">${escapeHtml(t('noResults'))}</p>`;
        return;
    }

    providers.forEach(provider => {
        servicesList.appendChild(createProviderCard(provider));
    });
}

function createProviderCard(provider) {
    const card = document.createElement('article');
    card.className = 'provider-card';

    const phoneStr = String(provider.phone).trim();
    const phoneDigits = phoneStr.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${phoneDigits}`;
    const serviceClass = getServiceClass(provider.service);

    card.innerHTML = `
        <div class="card-top">
            <div class="card-avatar" aria-hidden="true">${escapeHtml(getInitials(provider.name))}</div>
            <div class="card-meta">
                <h3 class="card-name">${escapeHtml(translateProviderName(provider.name))}</h3>
                <p class="card-service ${serviceClass}">${escapeHtml(translateServiceLabel(provider.service))}</p>
                <p class="card-location">📍 ${escapeHtml(translateAreaLabel(provider.area))}</p>
            </div>
        </div>
        <div class="card-actions">
            <a href="tel:${escapeHtml(phoneStr)}" class="btn-call">${escapeHtml(t('call'))}</a>
            <a href="${whatsappLink}" class="btn-whatsapp" target="_blank" rel="noopener noreferrer">${escapeHtml(t('whatsapp'))}</a>
        </div>
    `;

    return card;
}

function applySearchAndFilter() {
    const searchText = document.getElementById('searchBox').value.toLowerCase();
    const selectedService = document.getElementById('serviceFilter').value;
    const selectedArea = document.getElementById('areaFilter').value;
    const statusFilter = document.getElementById('statusFilter');
    // Empty value = "All Status" (show every provider)
    const selectedStatus = statusFilter ? statusFilter.value : '';

    const filteredProviders = allProviders.filter(provider => {
        const matchesSearch = searchText === '' ||
            provider.name.toLowerCase().includes(searchText) ||
            translateProviderName(provider.name).toLowerCase().includes(searchText) ||
            provider.service.toLowerCase().includes(searchText) ||
            translateServiceLabel(provider.service).toLowerCase().includes(searchText) ||
            provider.area.toLowerCase().includes(searchText) ||
            translateAreaLabel(provider.area).toLowerCase().includes(searchText);

        const matchesServiceType = selectedService === '' || provider.service === selectedService;
        const matchesArea = selectedArea === '' || provider.area === selectedArea;
        const matchesStatus = selectedStatus === '' || provider.status === selectedStatus;

        return matchesSearch && matchesServiceType && matchesArea && matchesStatus;
    });

    displayProviders(filteredProviders);
}

function addEventListeners() {
    document.getElementById('searchBox').addEventListener('input', applySearchAndFilter);

    document.getElementById('serviceFilter').addEventListener('change', function() {
        document.querySelectorAll('.category-tile[data-service-filter]').forEach(tile => {
            const keyword = tile.getAttribute('data-service-filter');
            const active = this.value && this.value.toLowerCase().includes(keyword.toLowerCase());
            tile.classList.toggle('active', active);
        });
        applySearchAndFilter();
    });

    document.getElementById('areaFilter').addEventListener('change', applySearchAndFilter);

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applySearchAndFilter);
    }
}
