// ========================================
// CHHATRAPATI SAMBHAJINAGAR SEVA
// Enhanced Service Directory Platform
// ========================================
//
// Stack: Google Sheets (DB) → Apps Script (API) → GitHub Pages (UI)
//
// Data shape expected from the API (doGet.gs):
// {
//   providers: [{ provider_id, name, phone, address, area, status, featured,
//                 services: [{ service_id, name, category, emoji }] }],
//   categories: ["Home Services", ...],
//   areas:      ["N1 Cidco", ...]
// }
//
// ========================================

// ==== GLOBAL DATA & CONFIG ====

let allProviders   = [];  // All provider records from API
let allServices    = [];  // Unique service names (extracted from providers[].services[])
let allAreas       = [];  // Unique area names
let allCategories  = [];  // Unique category names
let serviceEmojis  = {};  // service name → emoji (built from API data)
let selectedCategory = ''; // Active category tile filter

// ⚠️  UPDATE THIS URL after redeploying doGet.gs as a new web app deployment.
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZxsjlBZtmfyDolPnCCAp-QJJSe5a15PIKWC9V0x4-dhrZvwnuszEKdTGxxRa4833s/exec';

// ==== INITIALIZATION ====
document.addEventListener('DOMContentLoaded', function() {
    initI18n();

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    window.onLanguageChange = refreshUiForLanguage;

    initFooterServiceLinks();
    initSearchButton();
    initViewAllLinks();
    initClearFiltersButton();

    loadProviders();
});

// ==== DISPLAY HELPERS ====

/** Returns the best available display name for a provider in the current language.
 *  Priority: name_mr (from Bhashini, stored in sheet) → dictionary+transliterate fallback */
function getProviderDisplayName(provider) {
    if (currentLang === 'mr' && provider.name_mr) return provider.name_mr;
    return translateProviderName(provider.name);
}

// ==== DATA LOADING ====
// Fetches once on page load. All subsequent filtering uses in-memory data.

function loadProviders() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage   = document.getElementById('errorMessage');
    const servicesList   = document.getElementById('servicesList');

    loadingMessage.style.display = 'block';
    errorMessage.hidden = true;
    servicesList.innerHTML = '';

    fetch(GOOGLE_APPS_SCRIPT_URL)
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function(data) {
            // Surface API-level errors from doGet.gs try/catch
            if (data.error) {
                throw new Error('API error: ' + data.error);
            }

            // Support new shape { providers, categories, areas }
            // and old flat array shape for backward compatibility
            if (Array.isArray(data)) {
                allProviders = data;
            } else {
                allProviders = data.providers || [];
                // Use server-provided metadata when available
            if (data.areas       && data.areas.length       > 0) allAreas       = data.areas.sort();
            if (data.categories  && data.categories.length  > 0) allCategories  = data.categories.sort();
            }

            if (allProviders.length > 0) {
                console.log('=== PROVIDER DATA DEBUG ===');
                console.table(allProviders[0]);
                console.log('First provider services:', allProviders[0].services);
                console.log('===========================');
            }

            extractUniqueServices();
            if (allAreas.length === 0) extractUniqueAreas();
            buildServiceEmojiMap();

            loadingMessage.style.display = 'none';

            buildFilterOptions();
            buildDynamicAreaChips();
            buildCategoryGrid();
            buildStatistics();
            buildFeaturedSection();

            addEventListeners();
            initAreaChips();
            initCategoryTiles();

            applyAllFilters();
        })
        .catch(function(error) {
            console.error('Error loading providers:', error);
            loadingMessage.style.display = 'none';
            errorMessage.hidden = false;
            servicesList.innerHTML = '';
        });
}

// ==== DATA EXTRACTION ====
// All functions read from the in-memory allProviders array.

function extractUniqueServices() {
    allServices = [...new Set(
        allProviders
            .flatMap(function(p) { return (p.services || []).map(function(s) { return s.name; }); })
            .filter(Boolean)
    )].sort();
}

function extractUniqueAreas() {
    allAreas = [...new Set(
        allProviders.map(function(p) { return p.area; }).filter(Boolean)
    )].sort();
}

// Build emoji lookup from API data (emoji is now stored in Service_Master via setup.gs)
function buildServiceEmojiMap() {
    serviceEmojis = {};
    allProviders.forEach(function(provider) {
        (provider.services || []).forEach(function(svc) {
            if (svc.name && svc.emoji) {
                serviceEmojis[svc.name] = svc.emoji;
            }
        });
    });
}

function getServiceEmoji(serviceName) {
    return serviceEmojis[serviceName] || '📋';
}

// ==== BUILD DYNAMIC UI COMPONENTS ====

function buildFilterOptions() {
    buildServiceFilter();
    buildAreaFilter();
}

function buildServiceFilter() {
    const filterDropdown = document.getElementById('serviceFilter');
    if (!filterDropdown) return;

    while (filterDropdown.options.length > 1) filterDropdown.remove(1);

    // Count providers per service
    const serviceCounts = {};
    allProviders.forEach(function(p) {
        (p.services || []).forEach(function(s) {
            if (s.name) serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
        });
    });

    allServices.forEach(function(service) {
        const count  = serviceCounts[service] || 0;
        const option = document.createElement('option');
        option.value = service;
        option.textContent = translateServiceLabel(service) + ' (' + toLocalNum(count) + ')';
        filterDropdown.appendChild(option);
    });

    updateSelectDefaults();
    if (customServiceSelect) customServiceSelect.refresh();
    else initCustomSelects();
}

function buildAreaFilter() {
    const filterDropdown = document.getElementById('areaFilter');
    if (!filterDropdown) return;

    while (filterDropdown.options.length > 1) filterDropdown.remove(1);

    // Count providers per area for the dropdown labels
    const areaCounts = {};
    allProviders.forEach(function(p) {
        const a = (p.area || '').trim();
        if (a) areaCounts[a] = (areaCounts[a] || 0) + 1;
    });

    allAreas.forEach(function(area) {
        const count  = areaCounts[area] || 0;
        const option = document.createElement('option');
        option.value = area;
        option.textContent = translateAreaLabel(area) + ' (' + toLocalNum(count) + ')';
        filterDropdown.appendChild(option);
    });

    // "No area listed" at the bottom of the dropdown
    const noAreaCount = allProviders.filter(function(p) { return !(p.area || '').trim(); }).length;
    if (noAreaCount > 0) {
        const option = document.createElement('option');
        option.value = '__noArea';
        option.textContent = '📋 ' + t('noAreaListed') + ' (' + toLocalNum(noAreaCount) + ')';
        filterDropdown.appendChild(option);
    }

    updateSelectDefaults();
    if (customAreaSelect) customAreaSelect.refresh();
    else initCustomSelects();
}

function buildStatusFilter() {
    const filterDropdown = document.getElementById('statusFilter');
    if (!filterDropdown) return;

    const uniqueStatuses = [...new Set(
        allProviders.map(function(p) { return p.status; }).filter(Boolean)
    )].sort();

    while (filterDropdown.options.length > 1) filterDropdown.remove(1);

    uniqueStatuses.forEach(function(status) {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = translateStatusLabel(status);
        filterDropdown.appendChild(option);
    });

    if ([...filterDropdown.options].some(function(opt) { return opt.value === 'Active'; })) {
        filterDropdown.value = 'Active';
    } else {
        filterDropdown.value = '';
    }

    updateSelectDefaults();
}

function buildDynamicAreaChips() {
    const chipContainer = document.querySelector('.area-chips');
    if (!chipContainer) return;

    chipContainer.innerHTML = '';

    if (allAreas.length === 0) {
        chipContainer.innerHTML = '<span style="color:#888;font-size:0.85rem">No area data yet — run fixAreas.gs first</span>';
        return;
    }

    // Count providers per area
    const areaCounts = {};
    allProviders.forEach(function(p) {
        const a = (p.area || '').trim();
        if (a) areaCounts[a] = (areaCounts[a] || 0) + 1;
    });

    // Sort areas by provider count descending, show only top 8
    const sortedAreas = allAreas.slice().sort(function(a, b) {
        return (areaCounts[b] || 0) - (areaCounts[a] || 0);
    });

    sortedAreas.slice(0, 8).forEach(function(area) {
        const count = areaCounts[area] || 0;
        const chip  = document.createElement('button');
        chip.type   = 'button';
        chip.className = 'area-chip';
        chip.setAttribute('data-area', area);
        chip.innerHTML =
            escapeHtml(translateAreaLabel(area)) +
            ' <span class="area-chip-count">' + toLocalNum(count) + '</span>';
        chipContainer.appendChild(chip);
    });
}

function buildCategoryGrid() {
    const categoryRow = document.querySelector('.category-row');
    if (!categoryRow) return;

    const existingTiles = categoryRow.querySelectorAll('.category-tile:not(.category-more)');
    existingTiles.forEach(function(tile) { tile.remove(); });

    // Count unique providers per CATEGORY (not per individual service)
    const categoryCounts = {};
    allProviders.forEach(function(p) {
        const seen = {};
        (p.services || []).forEach(function(s) {
            const cat = s.category || 'Other';
            if (!seen[cat]) {
                seen[cat] = true;
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
        });
    });

    // Sort by count descending, "Other" always last, show top 7
    const sortedCategories = Object.entries(categoryCounts)
        .sort(function(a, b) {
            const aIsOther = a[0].toLowerCase() === 'other';
            const bIsOther = b[0].toLowerCase() === 'other';
            if (aIsOther && !bIsOther) return 1;
            if (!aIsOther && bIsOther) return -1;
            return b[1] - a[1];
        })
        .slice(0, 7);

    sortedCategories.forEach(function(entry) {
        const category = entry[0];
        const count    = entry[1];
        const emoji     = getCategoryEmoji(category);
        const colorClass = getCategoryColorClass(category);
        const label     = translateCategoryLabel(category);

        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'category-tile';
        tile.setAttribute('data-category-filter', category);
        tile.title = count + ' provider' + (count !== 1 ? 's' : '');

        tile.innerHTML =
            '<span class="cat-icon ' + colorClass + '">' + escapeHtml(emoji) + '</span>' +
            '<span class="cat-label">' + escapeHtml(label) + ' (' + count + ')</span>';

        const moreButton = categoryRow.querySelector('.category-more');
        if (moreButton) categoryRow.insertBefore(tile, moreButton);
        else categoryRow.appendChild(tile);
    });
}

// Returns emoji for a broad category name
function getCategoryEmoji(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('home'))                                    return '🏠';
    if (c.includes('construct') || c.includes('improvement')) return '🏗️';
    if (c.includes('health') || c.includes('medical'))        return '🏥';
    if (c.includes('professional'))                           return '💼';
    if (c.includes('auto') || c.includes('vehicle'))          return '🚗';
    if (c.includes('event') || c.includes('hospita'))         return '🎉';
    if (c.includes('retail') || c.includes('shop'))           return '🛍️';
    if (c.includes('personal') || c.includes('care'))         return '💇';
    return '📋';
}

// Returns the CSS color class for the cat-icon circle
function getCategoryColorClass(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('home'))                                    return 'cat-home';
    if (c.includes('construct') || c.includes('improvement')) return 'cat-construction';
    if (c.includes('health') || c.includes('medical'))        return 'cat-health';
    if (c.includes('professional'))                           return 'cat-professional';
    if (c.includes('auto') || c.includes('vehicle'))          return 'cat-automobile';
    if (c.includes('event') || c.includes('hospita'))         return 'cat-events';
    if (c.includes('retail') || c.includes('shop'))           return 'cat-retail';
    if (c.includes('personal') || c.includes('care'))         return 'cat-personal';
    return 'cat-other';
}

// Translates a category name to the current language
function translateCategoryLabel(category) {
    if (currentLang === 'en' || !category) return category;
    const c = category.toLowerCase();
    if (c === 'home services')                     return t('catHomeServices');
    if (c.includes('construct'))                   return t('catConstruction');
    if (c.includes('health') || c.includes('medical')) return t('catHealth');
    if (c.includes('professional'))                return t('catProfessional');
    if (c.includes('auto'))                        return t('catAutomobile');
    if (c.includes('event') || c.includes('hospita')) return t('catEvents');
    if (c.includes('retail') || c.includes('shop'))   return t('catRetail');
    return t('catOther');
}

function buildStatistics() {
    const activeProviders = getActiveProviders();
    const statProviders   = document.getElementById('statProviders');
    const statServices    = document.getElementById('statServices');
    const statAreas       = document.getElementById('statAreas');

    if (!statProviders) return;

    const serviceCount = new Set(
        activeProviders.flatMap(function(p) {
            return (p.services || []).map(function(s) { return s.name; });
        }).filter(Boolean)
    ).size;

    const areaCount = new Set(
        activeProviders.map(function(p) { return p.area; }).filter(Boolean)
    ).size;

    animateValue(statProviders, 0, activeProviders.length, 800);
    animateValue(statServices,  0, serviceCount,           800);
    animateValue(statAreas,     0, areaCount,              800);
}

function buildFeaturedSection() {
    const featuredSection = document.getElementById('featuredSection');
    if (featuredSection) featuredSection.style.display = 'none';
}

// ==== PROVIDER CARD CREATION ====

function createProviderCard(provider, isFeatured) {
    isFeatured = isFeatured || false;
    const card = document.createElement('article');
    card.className = isFeatured ? 'provider-card featured-card' : 'provider-card';

    const phoneStr    = String(provider.phone || '').trim();
    const phoneDigits = phoneStr.replace(/\D/g, '');
    const whatsappLink = 'https://wa.me/' + phoneDigits;

    const address = String(provider.address || '').trim();
    const translatedAddress = address ? translateAreaLabel(address) : '';
    const displayAddress = (translatedAddress && translatedAddress.toLowerCase() !== 'undefined')
        ? escapeHtml(translatedAddress)
        : t('addressNotAvailable');

    const rawArea     = provider.area || '';
    const displayArea = rawArea ? escapeHtml(translateAreaLabel(String(rawArea).trim())) : '';

    const badgeHtml = isFeatured
        ? '<div class="featured-badge" aria-label="Featured">⭐ Featured</div>'
        : '';

    // Build service tags — one chip per service in provider.services[]
    const services = provider.services || [];
    let servicesHtml = '';
    if (services.length > 0) {
        servicesHtml =
            '<div class="card-services">' +
            services.map(function(svc) {
                const cls = getServiceClass(svc.name);
                return '<span class="card-service ' + cls + '">' +
                    escapeHtml(svc.emoji || '📋') + ' ' +
                    escapeHtml(translateServiceLabel(svc.name)) +
                    '</span>';
            }).join('') +
            '</div>';
    } else {
        // Fallback: no services mapped yet
        servicesHtml = '<p class="card-service service-default">' + escapeHtml(t('serviceNotListed')) + '</p>';
    }

    card.innerHTML =
        badgeHtml +
        '<div class="card-top">' +
            '<div class="card-avatar" aria-hidden="true">' + escapeHtml(getInitials(provider.name)) + '</div>' +
            '<div class="card-meta">' +
                '<h3 class="card-name">' + escapeHtml(getProviderDisplayName(provider)) + '</h3>' +
                servicesHtml +
                '<p class="card-location">📍 ' + displayAddress + '</p>' +
                (displayArea
                    ? '<p class="card-area">🏘️ ' + displayArea + '</p>'
                    : '<p class="card-area card-area--unknown">📋 ' + escapeHtml(t('noAreaListed')) + '</p>') +
            '</div>' +
        '</div>' +
        '<div class="card-actions">' +
            '<a href="tel:' + escapeHtml(phoneStr) + '" class="btn-call">' + escapeHtml(t('call')) + '</a>' +
            '<a href="' + whatsappLink + '" class="btn-whatsapp" target="_blank" rel="noopener noreferrer">' + escapeHtml(t('whatsapp')) + '</a>' +
        '</div>';

    return card;
}

// ==== FILTERING & SEARCH ENGINE ====
// AND logic: all active filters must match for a provider to be shown.

function applyAllFilters() {
    const searchText     = document.getElementById('searchBox').value.toLowerCase();
    const selectedService = document.getElementById('serviceFilter').value;
    const selectedArea    = document.getElementById('areaFilter').value;
    const sortFilter = document.getElementById('sortFilter');
    const selectedSort = sortFilter ? sortFilter.value : 'default';

    const filteredProviders = allProviders.filter(function(provider) {
        const matchesSearch = !searchText || matchesAdvancedSearch(provider, searchText);

        // Filter by specific service (dropdown)
        const matchesServiceType = !selectedService ||
            (provider.services || []).some(function(s) { return s.name === selectedService; });

        // Filter by broad category (category tiles)
        const matchesCategory = !selectedCategory ||
            (provider.services || []).some(function(s) { return s.category === selectedCategory; });

        const matchesArea   = !selectedArea
            || (selectedArea === '__noArea' ? !(provider.area || '').trim() : provider.area === selectedArea);
        return matchesSearch && matchesServiceType && matchesCategory && matchesArea;
    });

    // Sort the filtered results
    var sortedProviders = filteredProviders.slice(); // copy
    if (selectedSort === 'name_az') {
        sortedProviders.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    } else if (selectedSort === 'name_za') {
        sortedProviders.sort(function(a, b) { return (b.name || '').localeCompare(a.name || ''); });
    } else if (selectedSort === 'newest') {
        sortedProviders.sort(function(a, b) { return (parseInt(b.provider_id) || 0) - (parseInt(a.provider_id) || 0); });
    } else if (selectedSort === 'oldest') {
        sortedProviders.sort(function(a, b) { return (parseInt(a.provider_id) || 0) - (parseInt(b.provider_id) || 0); });
    }

    // Update live count inside the search box
    const searchCountEl = document.getElementById('searchCount');
    if (searchCountEl) {
        const searchText = document.getElementById('searchBox').value.trim();
        const hasAnyFilter = searchText ||
            document.getElementById('serviceFilter').value ||
            document.getElementById('areaFilter').value ||
            selectedCategory ||
            false;

        if (hasAnyFilter) {
            searchCountEl.textContent = toLocalNum(filteredProviders.length) + ' ' + t('searchFound');
            searchCountEl.style.display = 'inline-block';
        } else {
            searchCountEl.style.display = 'none';
        }
    }

    // If no filter is active at all, show the prompt instead of all providers
    if (!hasActiveFilter()) {
        showBrowsePrompt();
        updateStatistics(allProviders);
        return;
    }

    displayProviders(sortedProviders);
    updateStatistics(filteredProviders);
}

function hasActiveFilter() {
    const searchText  = (document.getElementById('searchBox').value || '').trim();
    const selectedSvc = document.getElementById('serviceFilter').value;
    const selectedArea = document.getElementById('areaFilter').value;
    // Status filter is excluded — "Active" is a system default, not a user intent signal
    return !!(searchText || selectedSvc || selectedArea || selectedCategory);
}

const POPULAR_QUICK = [
    { emoji: '⚡', key: 'Electrician' },
    { emoji: '🔧', key: 'Plumber' },
    { emoji: '🪚', key: 'Carpenter' },
    { emoji: '❄️', key: 'AC Repair' },
    { emoji: '🚕', key: 'Taxi Service' },
    { emoji: '🥛', key: 'Milk Delivery' },
    { emoji: '🏗️', key: 'Construction' },
    { emoji: '🎨', key: 'Painter' },
];

function showBrowsePrompt() {
    const servicesList = document.getElementById('servicesList');
    if (!servicesList) return;
    const heading = document.getElementById('listingsHeading');
    if (heading) heading.textContent = t('allProviders');

    // Build popular chips from services that actually exist in the data
    const existingServices = new Set(allServices.map(function(s) { return s.toLowerCase(); }));
    const chips = POPULAR_QUICK
        .filter(function(q) { return existingServices.has(q.key.toLowerCase()); })
        .map(function(q) {
            return '<button type="button" class="popular-quick-chip" data-quick-service="' +
                escapeHtml(q.key) + '">' +
                q.emoji + ' ' + escapeHtml(translateServiceLabel(q.key)) +
                '</button>';
        }).join('');

    servicesList.innerHTML =
        '<div class="browse-prompt">' +
            '<div class="browse-prompt-icon">🔎</div>' +
            '<p class="browse-prompt-title">' + escapeHtml(t('browsePromptTitle')) + '</p>' +
            '<p class="browse-prompt-sub">' + escapeHtml(t('browsePromptSub')) + '</p>' +
            (chips ? '<div class="popular-quick-chips">' + chips + '</div>' : '') +
        '</div>';

    // Wire chip clicks
    servicesList.querySelectorAll('.popular-quick-chip').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const svcName = this.getAttribute('data-quick-service');
            const svcFilter = document.getElementById('serviceFilter');
            if (svcFilter) {
                svcFilter.value = svcName;
                if (customServiceSelect) customServiceSelect.refresh();
                // Sync trigger label
                if (customServiceSelect) customServiceSelect._renderTrigger();
            }
            applyAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Multi-field, multi-word search.
// All search terms must match at least one field (AND across terms, OR across fields).
// Example: "plumber cidco" shows plumbers in CIDCO only.
function matchesAdvancedSearch(provider, searchText) {
    const terms = searchText.split(/\s+/).filter(Boolean);

    const searchFields = [
        (provider.name || '').toLowerCase(),
        (provider.name_mr || '').toLowerCase(),
        translateProviderName(provider.name || '').toLowerCase(),
        (provider.area || '').toLowerCase(),
        translateAreaLabel(provider.area || '').toLowerCase(),
        (provider.keywords || '').toLowerCase(),
        // Search across all services and their categories
    ].concat(
        (provider.services || []).map(function(s) { return (s.name     || '').toLowerCase(); }),
        (provider.services || []).map(function(s) { return (s.category || '').toLowerCase(); }),
        (provider.services || []).map(function(s) { return translateServiceLabel(s.name || '').toLowerCase(); })
    );

    return terms.every(function(term) {
        return searchFields.some(function(field) { return field.includes(term); });
    });
}

function updateListingsHeading() {
    const heading = document.getElementById('listingsHeading');
    if (!heading) return;

    const searchText    = (document.getElementById('searchBox').value || '').trim();
    const selectedSvc   = document.getElementById('serviceFilter').value;
    const selectedArea  = document.getElementById('areaFilter').value;

    if (searchText) {
        heading.textContent = '🔍 "' + searchText + '"';
    } else if (selectedCategory) {
        const label = translateCategoryLabel(selectedCategory);
        heading.textContent = label;
    } else if (selectedSvc) {
        heading.textContent = translateServiceLabel(selectedSvc);
    } else if (selectedArea) {
        if (selectedArea === '__noArea') {
            heading.textContent = t('noAreaListed');
        } else {
            heading.textContent = '🏘️ ' + translateAreaLabel(selectedArea);
        }
    } else {
        heading.textContent = t('allProviders');
    }
}

function displayProviders(providers) {
    const servicesList = document.getElementById('servicesList');
    servicesList.innerHTML = '';
    updateListingsHeading();

    if (providers.length === 0) {
        servicesList.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">🔍</div>' +
                '<p class="empty-message">' + escapeHtml(t('noResults')) + '</p>' +
                '<button type="button" class="btn-clear-filters" onclick="clearAllFilters()">' +
                    (t('clearFilters') || 'Clear Filters') +
                '</button>' +
            '</div>';
        return;
    }

    // Results count banner
    const countBanner = document.createElement('div');
    countBanner.className = 'results-count';
    countBanner.textContent = toLocalNum(providers.length) + ' ' + t('resultsFound');
    servicesList.appendChild(countBanner);

    providers.forEach(function(provider) {
        servicesList.appendChild(createProviderCard(provider));
    });
}

function getActiveProviders() {
    return allProviders.filter(function(p) { return p.status === 'Active'; });
}

// ==== CUSTOM SELECT COMPONENT ====
// Replaces native <select> elements with a searchable, styled dropdown.
// The native select is hidden but kept in the DOM — all existing
// getElementById().value reads and 'change' event listeners still work.

let customServiceSelect  = null;
let customAreaSelect     = null;
const _allCustomSelects  = [];   // registry so they can close each other

function CustomSelect(nativeEl) {
    this.native      = nativeEl;
    this._isOpen     = false;
    this._searchText = '';
    this._init();
}

CustomSelect.prototype._init = function() {
    const self = this;

    // Wrapper replaces the native element visually
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.setAttribute('role', 'listbox');

    const searchInput = document.createElement('input');
    searchInput.type  = 'text';
    searchInput.className = 'custom-select-search';

    const optList = document.createElement('ul');
    optList.className = 'custom-select-options';

    dropdown.appendChild(searchInput);
    dropdown.appendChild(optList);
    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);

    // Insert wrapper right before native select, then hide native
    this.native.parentNode.insertBefore(wrapper, this.native);
    this.native.style.display = 'none';

    this.wrapper     = wrapper;
    this.trigger     = trigger;
    this.dropdown    = dropdown;
    this.searchInput = searchInput;
    this.optList     = optList;

    _allCustomSelects.push(this);   // register

    this._renderTrigger();
    this._renderOptions();
    this._attachEvents();
};

CustomSelect.prototype._getOptions = function() {
    // Read options from the hidden native select
    const opts = [];
    for (let i = 0; i < this.native.options.length; i++) {
        const o = this.native.options[i];
        opts.push({ value: o.value, text: o.textContent, index: i });
    }
    return opts;
};

CustomSelect.prototype._parseOption = function(opt) {
    // Split "Label (42)" → { label: "Label", count: "42" }
    const m = opt.text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (m) return { label: m[1].trim(), count: m[2] };
    return { label: opt.text, count: null };
};

CustomSelect.prototype._renderTrigger = function() {
    const current = this._getOptions().find(function(o) { return o.value === this.native.value; }, this);
    const label   = current ? this._parseOption(current).label : (this._getOptions()[0] && this._parseOption(this._getOptions()[0]).label) || '';
    this.trigger.textContent = label;
    this.trigger.setAttribute('aria-expanded', this._isOpen ? 'true' : 'false');
};

CustomSelect.prototype._renderOptions = function() {
    const self    = this;
    const query   = this._searchText.toLowerCase();
    const options = this._getOptions();

    // Update search placeholder
    this.searchInput.placeholder = '🔍 ' + (currentLang === 'mr' ? 'शोधा...' : 'Search...');

    this.optList.innerHTML = '';
    let shown = 0;

    options.forEach(function(opt) {
        const parsed = self._parseOption(opt);
        if (query && parsed.label.toLowerCase().indexOf(query) === -1) return;

        const li = document.createElement('li');
        li.className = 'custom-select-option' + (opt.value === self.native.value ? ' selected' : '');
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', opt.value);
        li.setAttribute('aria-selected', opt.value === self.native.value ? 'true' : 'false');

        const labelSpan = document.createElement('span');
        labelSpan.className   = 'custom-select-option-label';
        labelSpan.textContent = parsed.label;

        li.appendChild(labelSpan);

        if (parsed.count !== null) {
            const countSpan = document.createElement('span');
            countSpan.className   = 'custom-select-option-count';
            // Convert digits to Devanagari if Marathi
            countSpan.textContent = parsed.count.replace(/[0-9]+/g, function(n) { return toLocalNum(parseInt(n, 10)); });
            li.appendChild(countSpan);
        }

        li.addEventListener('click', function() {
            self.native.value = opt.value;
            self._renderTrigger();
            self._renderOptions();
            self._close();
            // Fire change event so existing listeners (applyAllFilters etc.) trigger
            self.native.dispatchEvent(new Event('change', { bubbles: true }));
        });

        self.optList.appendChild(li);
        shown++;
    });

    if (shown === 0) {
        const empty = document.createElement('li');
        empty.className   = 'custom-select-empty';
        empty.textContent = currentLang === 'mr' ? 'काहीही सापडले नाही' : 'No results';
        this.optList.appendChild(empty);
    }
};

CustomSelect.prototype._open = function() {
    // Close every other custom select first
    _allCustomSelects.forEach(function(cs) { if (cs !== this) cs._close(); }, this);

    this._isOpen = true;
    this.wrapper.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.searchInput.value = '';
    this._searchText       = '';
    this._renderOptions();

    // Position dropdown anchored to trigger using fixed coords
    const rect = this.trigger.getBoundingClientRect();
    const dropW = Math.max(rect.width, 260);
    let left    = rect.left;
    // Clamp to viewport right edge
    if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8;
    this.dropdown.style.top   = (rect.bottom + 4) + 'px';
    this.dropdown.style.left  = left + 'px';
    this.dropdown.style.width = dropW + 'px';

    const sel = this.optList.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
    setTimeout(function() { this.searchInput.focus(); }.bind(this), 50);
};

CustomSelect.prototype._close = function() {
    this._isOpen = false;
    this.wrapper.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
};

CustomSelect.prototype._toggle = function() {
    this._isOpen ? this._close() : this._open();
};

CustomSelect.prototype.refresh = function() {
    // Re-reads native options (called after buildServiceFilter / buildAreaFilter)
    this._renderTrigger();
    this._renderOptions();
};

CustomSelect.prototype.reset = function() {
    this.native.value = '';
    this._renderTrigger();
    this._renderOptions();
};

CustomSelect.prototype._attachEvents = function() {
    const self = this;

    this.trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        self._toggle();
    });

    this.searchInput.addEventListener('input', function() {
        self._searchText = this.value;
        self._renderOptions();
    });

    this.searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && self._isOpen) self._close();
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (self._isOpen && !self.wrapper.contains(e.target)) self._close();
    });

    // Close on scroll so the fixed dropdown doesn't drift
    window.addEventListener('scroll', function() {
        if (self._isOpen) self._close();
    }, { passive: true });
};

function initCustomSelects() {
    const serviceNative = document.getElementById('serviceFilter');
    const areaNative    = document.getElementById('areaFilter');

    if (serviceNative && !customServiceSelect) {
        customServiceSelect = new CustomSelect(serviceNative);
    }
    if (areaNative && !customAreaSelect) {
        customAreaSelect = new CustomSelect(areaNative);
    }
}

// ==== UTILITY FUNCTIONS ====

function updateStatistics(providers) {
    const statProviders = document.getElementById('statProviders');
    const statServices  = document.getElementById('statServices');
    const statAreas     = document.getElementById('statAreas');

    if (!statProviders) return;

    const serviceCount = new Set(
        providers.flatMap(function(p) {
            return (p.services || []).map(function(s) { return s.name; });
        }).filter(Boolean)
    ).size;

    const areaCount = new Set(
        providers.map(function(p) { return p.area; }).filter(Boolean)
    ).size;

    statProviders.textContent = providers.length;
    statServices.textContent  = serviceCount;
    statAreas.textContent     = areaCount;
}

// Smooth count-up animation for statistics cards
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = function(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// XSS prevention
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Avatar initials from provider name
function getInitials(name) {
    const displayName = translateProviderName(name || '');
    const words = displayName.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';

    if (currentLang === 'mr') {
        return words.slice(0, 2).map(function(w) { return w.charAt(0); }).join('');
    }

    return (name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function(w) { return w[0]; })
        .join('')
        .toUpperCase() || '?';
}

// Maps a service name to a CSS color class
function getServiceClass(service) {
    const s = (service || '').toLowerCase();
    if (s.includes('electric') || s.includes('mseb') || s.includes('wiring')) return 'service-electric';
    if (s.includes('plumb'))     return 'service-plumber';
    if (s.includes('carpent'))   return 'service-carpenter';
    if (s.includes('taxi') || s.includes('cab')) return 'service-taxi';
    if (s.includes('auto') || s.includes('rickshaw')) return 'service-auto';
    if (s.includes('milk') || s.includes('dairy'))    return 'service-milk';
    if (s.includes('ac') || s.includes('air') || s.includes('freeze') || s.includes('refriger')) return 'service-ac';
    return 'service-default';
}

// Finds the service dropdown option whose value includes the keyword
function setServiceFilterByKeyword(keyword) {
    const serviceFilter = document.getElementById('serviceFilter');
    if (!serviceFilter || !keyword) return false;

    const match = [...serviceFilter.options].find(function(opt) {
        return opt.value && opt.value.toLowerCase().includes(keyword.toLowerCase());
    });
    serviceFilter.value = match ? match.value : '';
    return Boolean(match);
}

// ==== CLEAR FILTERS ====

function clearAllFilters() {
    document.getElementById('searchBox').value = '';
    selectedCategory = '';

    if (customServiceSelect) customServiceSelect.reset();
    else document.getElementById('serviceFilter').value = '';

    if (customAreaSelect) customAreaSelect.reset();
    else document.getElementById('areaFilter').value = '';

    document.querySelectorAll('.category-tile').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.area-chip').forEach(function(c) { c.classList.remove('active'); });

    applyAllFilters();
    document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
}

function initClearFiltersButton() {
    // Handler is set via inline onclick in the empty-state HTML
}

// ==== EVENT LISTENERS & INITIALIZATION ====

function updateSelectDefaults() {
    const serviceFilter = document.getElementById('serviceFilter');
    const areaFilter    = document.getElementById('areaFilter');
    const serviceCount  = allServices.length;
    const areaCount     = allAreas.length;

    if (serviceFilter && serviceFilter.options[0])
        serviceFilter.options[0].textContent = t('allServices') + (serviceCount > 0 ? ' (' + toLocalNum(serviceCount) + ')' : '');
    if (areaFilter && areaFilter.options[0])
        areaFilter.options[0].textContent    = t('allAreas')    + (areaCount    > 0 ? ' (' + toLocalNum(areaCount)    + ')' : '');
}

function refreshFilterOptionLabels() {
    const serviceFilter = document.getElementById('serviceFilter');
    const areaFilter    = document.getElementById('areaFilter');

    if (serviceFilter) {
        buildServiceFilter();
    }
    if (areaFilter) {
        buildAreaFilter();
        const prev = areaFilter._prevValue;
        if (prev) areaFilter.value = prev;
    }
}

function refreshUiForLanguage() {
    updateSelectDefaults();
    refreshFilterOptionLabels();
    buildDynamicAreaChips();
    buildCategoryGrid();

    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage && loadingMessage.style.display !== 'none') {
        loadingMessage.textContent = t('loading');
    }
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && !errorMessage.hidden) {
        errorMessage.textContent = t('error');
    }

    if (allProviders.length > 0) {
        buildFeaturedSection();
        applyAllFilters();
    }
}

function initCategoryTiles() {
    // Use event delegation on the parent so dynamically rebuilt tiles always work
    const categoryRow = document.querySelector('.category-row');
    if (!categoryRow) return;

    categoryRow.addEventListener('click', function(e) {
        const tile = e.target.closest('.category-tile');
        if (!tile) return;

        // "More Services" — show all & clear filters
        if (tile.classList.contains('category-more')) {
            clearAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const isActive = tile.classList.contains('active');
        document.querySelectorAll('.category-tile:not(.category-more)').forEach(function(t) {
            t.classList.remove('active');
        });

        if (tile.hasAttribute('data-category-filter')) {
            if (isActive) {
                selectedCategory = '';
            } else {
                tile.classList.add('active');
                selectedCategory = tile.getAttribute('data-category-filter');
                document.getElementById('serviceFilter').value = '';
            }
            applyAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });

        } else if (tile.hasAttribute('data-service-filter')) {
            if (!isActive) {
                tile.classList.add('active');
                selectedCategory = '';
                setServiceFilterByKeyword(tile.getAttribute('data-service-filter'));
            } else {
                document.getElementById('serviceFilter').value = '';
            }
            applyAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function initSearchButton() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', applyAllFilters);
}

function initViewAllLinks() {
    const viewAllCategories = document.getElementById('viewAllCategories');
    if (viewAllCategories) {
        viewAllCategories.addEventListener('click', function() {
            clearAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function initAreaChips() {
    const chipContainer = document.querySelector('.area-chips');
    const areaFilter    = document.getElementById('areaFilter');

    // Event delegation — works even after chips are rebuilt
    if (chipContainer && !chipContainer._areaListenerAttached) {
        chipContainer._areaListenerAttached = true;
        chipContainer.addEventListener('click', function(e) {
            const chip = e.target.closest('.area-chip');
            if (!chip) return;

            const area     = chip.getAttribute('data-area');
            const isActive = chip.classList.contains('active');

            chipContainer.querySelectorAll('.area-chip').forEach(function(c) { c.classList.remove('active'); });

            if (isActive) {
                if (areaFilter) areaFilter.value = '';
            } else {
                chip.classList.add('active');
                if (areaFilter) areaFilter.value = area;
            }
            applyAllFilters();
            document.getElementById('allProviders')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (areaFilter && !areaFilter._changeListenerAttached) {
        areaFilter._changeListenerAttached = true;
        areaFilter.addEventListener('change', function() {
            const selected = this.value;
            if (chipContainer) {
                chipContainer.querySelectorAll('.area-chip').forEach(function(chip) {
                    chip.classList.toggle('active', chip.getAttribute('data-area') === selected);
                });
            }
        });
    }
}

function initFooterServiceLinks() {
    document.querySelectorAll('[data-service-filter]').forEach(function(link) {
        if (link.classList.contains('category-tile')) return;
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const value = this.getAttribute('data-service-filter');
            setServiceFilterByKeyword(value);
            applyAllFilters();
            document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function addEventListeners() {
    document.getElementById('searchBox').addEventListener('input', applyAllFilters);

    document.getElementById('serviceFilter').addEventListener('change', function() {
        document.querySelectorAll('.category-tile[data-service-filter]').forEach(function(tile) {
            const keyword = tile.getAttribute('data-service-filter');
            const active  = this.value && this.value.toLowerCase().includes(keyword.toLowerCase());
            tile.classList.toggle('active', active);
        }.bind(this));
        applyAllFilters();
    });

    document.getElementById('areaFilter').addEventListener('change', applyAllFilters);

    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) sortFilter.addEventListener('change', applyAllFilters);
}
