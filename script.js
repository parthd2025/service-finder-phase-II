// Variable to store all providers
let allProviders = [];

// Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxZJmQJRr3swLELNHmJd3xkw5DwJKR_whAnux-Chk_nypn_O1MQCxZvHbpfr2EEEKoH/exec';

// Run when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadProviders();
});

// Load provider data from Google Apps Script URL
function loadProviders() {
    // Show loading message
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const servicesList = document.getElementById('servicesList');
    
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    servicesList.innerHTML = '';
    
    // Use fetch to get data from Google Apps Script
    fetch(GOOGLE_APPS_SCRIPT_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();  // Convert response to JSON
        })
        .then(data => {
            // Handle the data from Google Apps Script
            allProviders = data.services || data;  // Support both formats
            
            // Hide loading message
            loadingMessage.style.display = 'none';
            
            // Display providers
            displayProviders(allProviders);
            
            // Populate filters after data loads
            populateServiceFilter();
            populateAreaFilter();
            
            // Add event listeners
            addEventListeners();
        })
        .catch(error => {
            console.error('Error loading providers:', error);
            
            // Hide loading, show error
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
            servicesList.innerHTML = '';
        });
}

// Populate the service type dropdown filter with unique services
function populateServiceFilter() {
    // Get unique service types from all providers
    const uniqueServices = [...new Set(allProviders.map(provider => provider.service))];
    
    // Get the dropdown element
    const filterDropdown = document.getElementById('serviceFilter');
    
    // Clear existing options (keep the default "All Services" option)
    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }
    
    // Add each unique service as an option
    uniqueServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service;           // Set the value
        option.textContent = service;     // Set the display text
        filterDropdown.appendChild(option);
    });
}

// Populate the area dropdown filter with unique areas
function populateAreaFilter() {
    // Get unique areas from all providers
    const uniqueAreas = [...new Set(allProviders.map(provider => provider.area))];
    
    // Get the dropdown element
    const filterDropdown = document.getElementById('areaFilter');
    
    // Clear existing options (keep the default "All Areas" option)
    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }
    
    // Add each unique area as an option
    uniqueAreas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;              // Set the value
        option.textContent = area;        // Set the display text
        filterDropdown.appendChild(option);
    });
}

// Display providers on the page
function displayProviders(providers) {
    const servicesList = document.getElementById('servicesList');
    
    // Clear any previous content
    servicesList.innerHTML = '';
    
    // Check if there are any providers to display
    if (providers.length === 0) {
        servicesList.innerHTML = '<p class="no-results">No service providers found.</p>';
        return;
    }
    
    // Create a card for each provider and add to page
    providers.forEach(provider => {
        const card = createProviderCard(provider);
        servicesList.appendChild(card);
    });
}

// Create a provider card element
function createProviderCard(provider) {
    // Create a new div for the card
    const card = document.createElement('div');
    card.className = 'service-card';
    
    // Convert phone to string and handle both string and number formats
    const phoneStr = String(provider.phone).trim();
    const phoneDigits = phoneStr.replace(/\D/g, '');  // Remove all non-digits
    const whatsappLink = `https://wa.me/${phoneDigits}`;
    
    // Add content to the card with provider information and Unicode icons
    card.innerHTML = `
        <div class="card-header">
            <h2>🏢 ${provider.name}</h2>
        </div>
        <div class="card-body">
            <div class="card-info-item">
                <span class="info-icon">🔧</span>
                <div class="info-content">
                    <span class="info-label">Service Type</span>
                    <span class="info-value">${provider.service}</span>
                </div>
            </div>
            <div class="card-info-item">
                <span class="info-icon">📍</span>
                <div class="info-content">
                    <span class="info-label">Area</span>
                    <span class="info-value">${provider.area}</span>
                </div>
            </div>
            <div class="card-info-item">
                <span class="info-icon">📱</span>
                <div class="info-content">
                    <span class="info-label">Phone</span>
                    <span class="info-value">${phoneStr}</span>
                </div>
            </div>
        </div>
        <div class="card-footer">
            <div class="button-group">
                <a href="tel:${phoneStr}" class="call-button">📞 Call Now</a>
                <a href="${whatsappLink}" class="whatsapp-button" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
            </div>
        </div>
    `;
    
    return card;
}

// Function to apply search and both filters
function applySearchAndFilter() {
    // Get search text from search box
    const searchText = document.getElementById('searchBox').value.toLowerCase();
    
    // Get selected service type from dropdown
    const selectedService = document.getElementById('serviceFilter').value;
    
    // Get selected area from dropdown
    const selectedArea = document.getElementById('areaFilter').value;
    
    // Filter providers based on search, service type, AND area
    const filteredProviders = allProviders.filter(provider => {
        // Check if search text matches name, service, or area (if no search text, this passes)
        const matchesSearch = searchText === '' ||
            provider.name.toLowerCase().includes(searchText) ||
            provider.service.toLowerCase().includes(searchText) ||
            provider.area.toLowerCase().includes(searchText);
        
        // Check if service type matches (if no filter selected, this passes)
        const matchesServiceType = selectedService === '' || provider.service === selectedService;
        
        // Check if area matches (if no filter selected, this passes)
        const matchesArea = selectedArea === '' || provider.area === selectedArea;
        
        // Return true only if ALL conditions are true
        return matchesSearch && matchesServiceType && matchesArea;
    });
    
    // Display filtered providers
    displayProviders(filteredProviders);
}

// Function to add event listeners to search and filter elements
function addEventListeners() {
    // Add event listener to search box for real-time filtering
    document.getElementById('searchBox').addEventListener('input', function() {
        applySearchAndFilter();
    });

    // Add event listener to service filter dropdown
    document.getElementById('serviceFilter').addEventListener('change', function() {
        applySearchAndFilter();
    });

    // Add event listener to area filter dropdown
    document.getElementById('areaFilter').addEventListener('change', function() {
        applySearchAndFilter();
    });
}
