const I18N_STORAGE_KEY = 'csnseva_lang';

const TRANSLATIONS = {
    en: {
        metaDescription: 'Find trusted local service providers in Chhatrapati Sambhajinagar — electricians, plumbers, taxi, milk delivery and more.',
        pageTitle: 'Chhatrapati Sambhajinagar Seva',
        brandName: 'Chhatrapati Sambhajinagar Seva',
        brandCity: 'Chhatrapati Sambhajinagar (Aurangabad)',
        topLocation: '📍 Aurangabad',
        searchPlaceholder: 'Search for a service or provider...',
        allServices: 'All Services',
        allAreas: 'All Areas',
        searchBtn: '🔍 Search',
        catElectrician: 'Electrician',
        catPlumber: 'Plumber',
        catCarpenter: 'Carpenter',
        catTaxi: 'City Taxi',
        catAuto: 'Auto Services',
        catMilk: 'Milk Service',
        catAc: 'AC Repair',
        catMore: 'More Services',
        popularHeading: 'Popular Services in Chhatrapati Sambhajinagar',
        viewAll: 'View All',
        promoText: 'Your trusted local service directory in Chhatrapati Sambhajinagar (Aurangabad).',
        browseByArea: 'Browse by area',
        allProviders: 'All Service Providers',
        allStatus: 'All Status',
        statusActive: 'Active',
        loading: '⏳ Loading service providers...',
        error: '❌ Error loading data. Please try refreshing the page.',
        noResults: 'No service providers found.',
        popularEmpty: 'Providers will appear here once data is loaded.',
        statProviders: 'Active Providers',
        statServices: 'Service Categories',
        statAreas: 'Areas Covered',
        footerTagline: 'Find trusted local services near you.',
        followUs: 'Follow Us',
        quickLinks: 'Quick Links',
        popularServices: 'Popular Services',
        forProviders: 'For Providers',
        linkHome: 'Home',
        linkAllServices: 'All Services',
        linkSearch: 'Search',
        linkContact: 'Contact Us',
        linkElectrician: 'Electrician',
        linkPlumber: 'Plumber',
        linkCarpenter: 'Carpenter',
        linkTaxi: 'Taxi Services',
        linkMilk: 'Milk Service',
        listBusiness: 'List Your Business',
        updateListing: 'Update Listing',
        support: 'Support',
        terms: 'Terms & Conditions',
        contactInfo: 'Contact Information',
        contactLocation: '📍 Chhatrapati Sambhajinagar, Maharashtra',
        contactEmail: '📧 info@sambhajinagarseva.com',
        phoneComingSoon: '📱 Phone: Coming Soon',
        madeWithLove: 'Made with ❤️ in Chhatrapati Sambhajinagar',
        copyright: 'Chhatrapati Sambhajinagar Seva — Chhatrapati Sambhajinagar (Aurangabad). All rights reserved.',
        call: '📞 Call',
        whatsapp: 'WhatsApp',
        langToggleLabel: 'Language'
    },
    mr: {
        metaDescription: 'छत्रपती संभाजीनगरमध्ये विश्वासार्ह स्थानिक सेवा — इलेक्ट्रिशियन, प्लंबर, टॅक्सी, दूध वितरण आणि अधिक.',
        pageTitle: 'छत्रपती संभाजीनगर सेवा',
        brandName: 'छत्रपती संभाजीनगर सेवा',
        brandCity: 'छत्रपती संभाजीनगर (औरंगाबाद)',
        topLocation: '📍 औरंगाबाद',
        searchPlaceholder: 'सेवा किंवा प्रदाता शोधा...',
        allServices: 'सर्व सेवा',
        allAreas: 'सर्व भाग',
        searchBtn: '🔍 शोध',
        catElectrician: 'इलेक्ट्रिशियन',
        catPlumber: 'प्लंबर',
        catCarpenter: 'सुतार',
        catTaxi: 'शहर टॅक्सी',
        catAuto: 'ऑटो सेवा',
        catMilk: 'दूध सेवा',
        catAc: 'एसी दुरुस्ती',
        catMore: 'अधिक सेवा',
        popularHeading: 'छत्रपती संभाजीनगरमधील लोकप्रिय सेवा',
        viewAll: 'सर्व पहा',
        promoText: 'छत्रपती संभाजीनगर (औरंगाबाद) मधील आपली विश्वासार्ह स्थानिक सेवा निर्देशिका.',
        browseByArea: 'भागानुसार शोधा',
        allProviders: 'सर्व सेवा प्रदाते',
        allStatus: 'सर्व स्थिती',
        statusActive: 'सक्रिय',
        loading: '⏳ सेवा प्रदाते लोड होत आहेत...',
        error: '❌ डेटा लोड करण्यात त्रुटी. कृपया पृष्ठ रीफ्रेश करा.',
        noResults: 'कोणतेही सेवा प्रदाते सापडले नाहीत.',
        popularEmpty: 'डेटा लोड झाल्यावर प्रदाते येथे दिसतील.',
        statProviders: 'सक्रिय प्रदाते',
        statServices: 'सेवा प्रकार',
        statAreas: 'भाग कव्हर',
        footerTagline: 'आपल्या जवळच्या विश्वासार्ह स्थानिक सेवा शोधा.',
        followUs: 'आमचे अनुसरण करा',
        quickLinks: 'द्रुत दुवे',
        popularServices: 'लोकप्रिय सेवा',
        forProviders: 'प्रदात्यांसाठी',
        linkHome: 'मुख्यपृष्ठ',
        linkAllServices: 'सर्व सेवा',
        linkSearch: 'शोध',
        linkContact: 'संपर्क',
        linkElectrician: 'इलेक्ट्रिशियन',
        linkPlumber: 'प्लंबर',
        linkCarpenter: 'सुतार',
        linkTaxi: 'टॅक्सी सेवा',
        linkMilk: 'दूध सेवा',
        listBusiness: 'व्यवसाय नोंदवा',
        updateListing: 'यादी अद्यतनित करा',
        support: 'मदत',
        terms: 'अटी व शर्ती',
        contactInfo: 'संपर्क माहिती',
        contactLocation: '📍 छत्रपती संभाजीनगर, महाराष्ट्र',
        contactEmail: '📧 info@sambhajinagarseva.com',
        phoneComingSoon: '📱 फोन: लवकरच',
        madeWithLove: 'छत्रपती संभाजीनगरमध्ये ❤️ सह बनवले',
        copyright: 'छत्रपती संभाजीनगर सेवा — छत्रपती संभाजीनगर (औरंगाबाद). सर्व हक्क राखीव.',
        call: '📞 कॉल',
        whatsapp: 'व्हॉट्सअॅप',
        langToggleLabel: 'भाषा'
    }
};

/** Area names → Marathi (exact + partial keys) */
const AREA_LABELS_MR = {
    cidco: 'सिडको',
    garkheda: 'गरखेडा',
    mukundwadi: 'मुकुंदवाडी',
    satara: 'सातारा',
    osmanpura: 'उस्मानपुरा',
    'jalna road': 'जालना रोड',
    'beed bypass': 'बीड बायपास',
    shahnoorwadi: 'शहनूरवाडी',
    aurangabad: 'औरंगाबाद',
    whitefield: 'व्हाइटफील्ड',
    'chhatrapati sambhajinagar': 'छत्रपती संभाजीनगर',
    sambhajinagar: 'संभाजीनगर',
    cantonment: 'छावणी',
    nashik: 'नाशिक',
    pune: 'पुणे',
    mumbai: 'मुंबई',
    nagar: 'नगर',
    road: 'रोड',
    colony: 'कॉलनी'
};

const CONSONANT_MR = {
    sh: 'श', ch: 'च', chh: 'छ', kh: 'ख', gh: 'घ', th: 'थ', dh: 'ध', ph: 'फ', bh: 'भ', jh: 'झ',
    b: 'ब', c: 'क', d: 'द', f: 'फ', g: 'ग', h: 'ह', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न',
    p: 'प', q: 'क', r: 'र', s: 'स', t: 'त', v: 'व', w: 'व', x: 'क्ष', y: 'य', z: 'ज',
    rr: 'र', nn: 'न', mm: 'म', ll: 'ल', tt: 'ट', dd: 'ड', ng: 'ंग', nk: 'ंक'
};

const VOWEL_MATRA_MR = {
    a: '', aa: 'ा', i: 'ि', ee: 'ी', ii: 'ी', u: 'ु', oo: 'ू', uu: 'ू', e: 'े', ai: 'ै', o: 'ो', au: 'ौ'
};

/** Common service names from sheet → Marathi display */
const SERVICE_LABELS_MR = {
    electrician: 'इलेक्ट्रिशियन',
    electric: 'इलेक्ट्रिक',
    plumber: 'प्लंबर',
    plumbing: 'प्लंबिंग',
    carpenter: 'सुतार',
    carpentry: 'सुतारकाम',
    taxi: 'टॅक्सी',
    cab: 'टॅक्सी',
    auto: 'ऑटो',
    rickshaw: 'रिक्षा',
    milk: 'दूध',
    'ac repair': 'एसी दुरुस्ती',
    ac: 'एसी',
    painter: 'पेंटर',
    cleaning: 'साफसफाई',
    pest: 'कीटक नियंत्रण'
};

let currentLang = 'en';

function getStoredLanguage() {
    const stored = localStorage.getItem(I18N_STORAGE_KEY);
    return stored === 'mr' || stored === 'en' ? stored : 'en';
}

function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'mr') return;
    currentLang = lang;
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'mr' ? 'mr' : 'en';
    document.body.classList.toggle('lang-mr', lang === 'mr');

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('metaDescription'));
    document.title = t('pageTitle');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = value;
        } else {
            el.textContent = value;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    const langEn = document.getElementById('langEn');
    const langMr = document.getElementById('langMr');
    if (langEn && langMr) {
        const isEn = lang === 'en';
        langEn.classList.toggle('lang-active', isEn);
        langMr.classList.toggle('lang-active', !isEn);
        langEn.setAttribute('aria-pressed', isEn);
        langMr.setAttribute('aria-pressed', !isEn);
    }

    if (typeof window.onLanguageChange === 'function') {
        window.onLanguageChange(lang);
    }
}

function transliterateWord(word) {
    const s = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return word;

    let out = '';
    let i = 0;

    while (i < s.length) {
        let consonant = '';
        for (const len of [3, 2, 1]) {
            const chunk = s.substring(i, i + len);
            if (CONSONANT_MR[chunk]) {
                consonant = CONSONANT_MR[chunk];
                i += len;
                break;
            }
        }

        if (!consonant) {
            i += 1;
            continue;
        }

        let vowel = 'a';
        for (const len of [2, 1]) {
            const v = s.substring(i, i + len);
            if (Object.prototype.hasOwnProperty.call(VOWEL_MATRA_MR, v)) {
                vowel = v;
                i += len;
                break;
            }
        }

        out += consonant + (VOWEL_MATRA_MR[vowel] ?? '');
    }

    return out || word;
}

function transliterateLatin(text) {
    if (!text) return text;
    return text
        .trim()
        .split(/\s+/)
        .map(part => transliterateWord(part))
        .join(' ');
}

function translateAreaLabel(area) {
    if (currentLang === 'en' || !area) return area;

    const lower = area.toLowerCase().trim();
    if (AREA_LABELS_MR[lower]) return AREA_LABELS_MR[lower];

    for (const [key, label] of Object.entries(AREA_LABELS_MR)) {
        if (lower.includes(key)) return label;
    }

    return transliterateLatin(area);
}

function translateProviderName(name) {
    if (currentLang === 'en' || !name) return name;
    return transliterateLatin(name);
}

function translateServiceLabel(service) {
    if (currentLang === 'en' || !service) return service;
    const lower = service.toLowerCase();
    for (const [keyword, label] of Object.entries(SERVICE_LABELS_MR)) {
        if (lower.includes(keyword)) return label;
    }
    return transliterateLatin(service);
}

function translateStatusLabel(status) {
    if (currentLang === 'en' || !status) return status;
    if (status === 'Active') return t('statusActive');
    return status;
}

function initI18n() {
    currentLang = getStoredLanguage();
    setLanguage(currentLang);

    const langEn = document.getElementById('langEn');
    const langMr = document.getElementById('langMr');
    if (langEn) langEn.addEventListener('click', () => setLanguage('en'));
    if (langMr) langMr.addEventListener('click', () => setLanguage('mr'));
}
