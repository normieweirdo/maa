// IIFE Modules for Maa by Rigel

// --- Dynamic PWA Update Toast ---
window.showUpdateToast = (worker) => {
  if (document.getElementById('pwa-update-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.className = 'update-toast';
  
  toast.innerHTML = `
    <strong style="color: var(--color-obsidian); font-size: 1rem; margin-bottom: 0.25rem;">Update Available</strong>
    <span style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">A new version of Maa is ready. Reload to apply updates.</span>
    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
      <button id="update-toast-dismiss" class="btn btn-ghost btn-sm" style="font-size: 0.8rem; border: 1px solid var(--red-200); padding: 0.3rem 0.8rem;">Dismiss</button>
      <button id="update-toast-accept" class="btn btn-primary btn-sm" style="font-size: 0.8rem; padding: 0.3rem 0.8rem;">Update</button>
    </div>
  `;

  document.body.appendChild(toast);

  const dismissBtn = document.getElementById('update-toast-dismiss');
  const acceptBtn = document.getElementById('update-toast-accept');

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      worker.postMessage({ action: 'skipWaiting' });
      toast.remove();
    });
  }
};

// --- Utility Functions ---
const fetchJSON = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error("Error fetching " + url, e);
    return null;
  }
};

// --- Disorder Modal Logic ---
window.openDisorderModal = (title, description) => {
  const modal = document.getElementById('disorder-modal');
  if (!modal) return;
  document.getElementById('disorder-modal-title').textContent = title;
  document.getElementById('disorder-modal-desc').textContent = description;
  modal.classList.add('active');
};

window.closeDisorderModal = () => {
  const modal = document.getElementById('disorder-modal');
  if (modal) modal.classList.remove('active');
};

document.addEventListener('click', (e) => {
  const modal = document.getElementById('disorder-modal');
  if (modal && e.target === modal) {
    window.closeDisorderModal();
  }
});

// --- Language Module ---
const LangModule = (() => {
  let currentLang = localStorage.getItem('maa_lang') || 'en';
  let translations = {};

  const init = async () => {
    const mainSelector = document.getElementById('lang-selector');
    const welcomeSelector = document.getElementById('welcome-lang-selector');
    if (welcomeSelector && mainSelector) {
      welcomeSelector.innerHTML = mainSelector.innerHTML;
      welcomeSelector.value = currentLang;
    }

    if (!localStorage.getItem('maa_lang_selected')) {
      const modal = document.getElementById('welcome-lang-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        document.getElementById('welcome-lang-btn').addEventListener('click', () => {
          const selectedLang = welcomeSelector.value;
          setLanguage(selectedLang);
          mainSelector.value = selectedLang;
          localStorage.setItem('maa_lang_selected', 'true');
          modal.classList.add('hidden');
          document.body.style.overflow = '';
        });
      }
    }

    if (mainSelector) mainSelector.value = currentLang;
    if (mainSelector) {
      mainSelector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
        localStorage.setItem('maa_lang_selected', 'true');
      });
    }

    // Perform initial load and trigger translation
    await setLanguage(currentLang);
  };

  const setLanguage = async (lang) => {
    currentLang = lang;
    localStorage.setItem('maa_lang', lang);
    await loadLanguage(lang);

    // Dynamic re-rendering of tracker modules on language changes
    if (typeof TrackerModule !== 'undefined' && TrackerModule.renderCalendar) {
      TrackerModule.renderCalendar();
      TrackerModule.renderForecastTable();
      TrackerModule.recalculateAndRefresh();
    }

    // Robustly trigger Google Translate
    const triggerTranslate = (retries = 10) => {
      const gtCombo = document.querySelector('.goog-te-combo');
      if (gtCombo) {
        const gtMap = {
          'mni': 'mni-Mtei', // Google translate uses specific code for Manipuri
          'en': '' // Empty string resets to default
        };
        gtCombo.value = gtMap[lang] !== undefined ? gtMap[lang] : lang;
        gtCombo.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      } else if (retries > 0) {
        setTimeout(() => triggerTranslate(retries - 1), 500);
      }
    };

    triggerTranslate();
  };

  const loadLanguage = async (lang) => {
    const data = await fetchJSON(`data/content_${lang}.json`);
    if (data) {
      translations = data;
      applyTranslations();
      // Also re-render dynamic content that relies on translations if needed
      ContentLoader.renderLearnCards(data.learn);
      
      // Dynamic Typed.js refresh for visual localization
      if (typeof window.initTypedEffect === 'function') {
        window.initTypedEffect();
      }
    }
  };

  const applyTranslations = () => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const keys = key.split('.');
      let val = translations;
      keys.forEach(k => {
        if (val) val = val[k];
      });
      if (val) {
        el.textContent = val;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const keys = key.split('.');
      let val = translations;
      keys.forEach(k => {
        if (val) val = val[k];
      });
      if (val) {
        el.placeholder = val;
      }
    });
  };

  return { init, getTranslations: () => translations, getLang: () => currentLang };
})();

// --- Content Loader Module ---
const ContentLoader = (() => {
  const init = async () => {
    const schemesData = await fetchJSON('data/govt_resources.json');
    if (schemesData && schemesData.schemes) {
      renderSchemeCards(schemesData.schemes);
    }

  };

  const renderLearnCards = (learnData) => {
    if (!learnData) return;
    const grid = document.getElementById('learn-grid');
    grid.innerHTML = `
      <div class="card learn-card" data-aos="fade-up" data-aos-delay="100">
        <img src="media/Cycle%20Basics.png" alt="Basics" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
        <h3><i data-lucide="droplet"></i> ${learnData.basics_title}</h3>
        <p>${learnData.basics_content}</p>
      </div>
      <div class="card learn-card" data-aos="fade-up" data-aos-delay="200">
        <img src="media/Hygine%20Practice.png" alt="Hygiene" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
        <h3 style="display:flex; align-items:center; gap:0.5rem;"><i data-lucide="shield-check"></i> ${learnData.hygiene_title}</h3>
        <p>${learnData.hygiene_content}</p>
      </div>
      <div class="card learn-card" data-aos="fade-up" data-aos-delay="300">
        <img src="media/MYTHS_FACTS.png" alt="Myths" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
        <h3 style="display:flex; align-items:center; gap:0.5rem;"><i data-lucide="scale"></i> ${learnData.myths_title}</h3>
        <p>${learnData.myths_content}</p>
      </div>
      <div class="card learn-card" data-aos="fade-up" data-aos-delay="400">
        <img src="media/Nutrition%20Tips.png" alt="Nutrition" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
        <h3 style="display:flex; align-items:center; gap:0.5rem;"><i data-lucide="apple"></i> ${learnData.nutrition_title}</h3>
        <p>${learnData.nutrition_content}</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (typeof AOS !== 'undefined') AOS.refresh();
    if (window.init3DTilt) window.init3DTilt();
  };

  const renderSchemeCards = (schemes) => {
    const grid = document.getElementById('schemes-grid');
    grid.innerHTML = schemes.map(s => `
      <div class="scheme-card-rich" data-ministry="${s.tags[0]}">
        <div class="scheme-card-header">
          <span class="scheme-icon">${s.icon || '<i data-lucide="landmark"></i>'}</span>
          <div class="scheme-card-header-text">
            <h3>${s.title}</h3>
            <span class="scheme-ministry-tag">${s.ministry}</span>
          </div>
        </div>
        <div class="scheme-card-body">
          <p>${s.description}</p>
          <ul class="scheme-benefits">
            ${s.benefits.map(b => `<li style="display: flex; align-items: flex-start; gap: 0.5rem;"><i data-lucide="check-circle-2" style="color: var(--color-success); flex-shrink: 0; width: 1.2rem; height: 1.2rem; margin-top: 0.2rem;"></i> <span>${b}</span></li>`).join('')}
          </ul>
          <div class="scheme-eligibility">
            <strong>Eligibility:</strong> ${s.eligibility}
          </div>
        </div>
        <div class="scheme-card-footer">
          <span class="scheme-helpline-pill"><i data-lucide="phone"></i> ${s.helpline}</span>
          <a href="${s.link}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Visit Portal <i data-lucide="arrow-up-right"></i></a>
        </div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Filter logic
    document.querySelectorAll('.scheme-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scheme-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ministry = btn.getAttribute('data-ministry');
        document.querySelectorAll('.scheme-card-rich').forEach(card => {
          const match = ministry === 'all' || card.getAttribute('data-ministry') === ministry;
          card.style.display = match ? 'flex' : 'none';
        });
      });
    });
    if (typeof AOS !== 'undefined') AOS.refresh();
    if (window.init3DTilt) window.init3DTilt();
  };



  return { init, renderLearnCards };
})();

// --- Tracker Module ---
const TrackerModule = (() => {
  const PHASES = {
    menstrual: {
      label: "Menstrual Phase",
      desc: "Your period has begun. Estrogen and progesterone are at baseline. Google-funded mcPHASES research shows Resting Heart Rate (RHR) and core body temperature drop to their lowest cycle levels during early menses. Rest when you can, and eat iron-rich foods.",
      icon: `<svg width="44" height="44" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="#FFF0F2" stroke="#F2C4CC" stroke-width="1"/><path d="M20 10 C16 14 12 17 12 21 C12 25.4 15.6 29 20 29 C24.4 29 28 25.4 28 21 C28 17 24 14 20 10Z" fill="#F0635A" opacity="0.85"/><path d="M20 14 C18 17 15 19 15 22 C15 24.8 17.2 27 20 27" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.5"/></svg>`,
      color: "#FF4757"
    },
    follicular: {
      label: "Follicular Phase",
      desc: "Energy is rising. Estrogen rises to mature follicles in the ovaries. Google-funded mcPHASES research shows a steady increase in Heart Rate Variability (HRV) during this phase, indicating enhanced physical recovery and autonomic nervous system resilience.",
      icon: `<svg width="44" height="44" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="#FFF0F2" stroke="#F2C4CC" stroke-width="1"/><circle cx="20" cy="20" r="7" fill="#F9B4B4" opacity="0.7"/><circle cx="20" cy="20" r="4" fill="#F0635A"/><path d="M20 8 L20 13M20 27 L20 32M8 20 L13 20M27 20 L32 20" stroke="#F0635A" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>`,
      color: "#FF6B81"
    },
    ovulation: {
      label: "Ovulation Phase",
      desc: "An egg is being released. You are in your peak fertile window. LH surges to trigger release. Research highlights peak estrogen and metabolic fluctuations, with subtle variations in insulin sensitivity and glucose levels.",
      icon: `<svg width="44" height="44" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="#FFF0F2" stroke="#F2C4CC" stroke-width="1"/><circle cx="20" cy="18" r="6" fill="#F0635A"/><path d="M20 24 L20 31" stroke="#F0635A" stroke-width="2" stroke-linecap="round"/><path d="M15 28 C15 28 17 25 20 25 C23 25 25 28 25 28" stroke="#F0635A" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/><circle cx="20" cy="18" r="3" fill="#fff" opacity="0.5"/></svg>`,
      color: "#FFB5A7"
    },
    luteal: {
      label: "Luteal Phase",
      desc: "The body prepares for possible pregnancy. Progesterone rises, elevating Resting Heart Rate (RHR) by 2–4 bpm and core body temperature by 0.3°C–0.5°C under its thermogenic effects. You may notice PMS symptoms.",
      icon: `<svg width="44" height="44" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="#FFF0F2" stroke="#F2C4CC" stroke-width="1"/><path d="M20 11 C20 11 28 15 28 22 C28 27 24.4 30 20 30 C15.6 30 12 27 12 22 C12 15 20 11 20 11Z" fill="#F9B4B4" opacity="0.7"/><path d="M20 14 C20 14 25 17 25 22 C25 25.3 22.8 27 20 27" stroke="#F0635A" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/></svg>`,
      color: "#FFA07A"
    }
  };

    const forecastTranslations = {
    en: {
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      calendarWeekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      phases: {
        menstrual: "Menstrual Phase",
        follicular: "Follicular Phase",
        ovulation: "Ovulation Phase",
        luteal: "Luteal Phase"
      },
      status: {
        "Period": "Period",
        "Fertile": "Fertile Window",
        "Ovulation": "Ovulation Day",
        "Normal": "Normal Cycle Day"
      },
      noRecords: "No matching forecast records found. Try another query!",
      pageOf: "Page {page} of {total}"
    },
    hi: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
      weekdays: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
      weekdaysShort: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
      calendarWeekdays: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
      phases: {
        menstrual: "मासिक धर्म चरण",
        follicular: "फॉलिक्युलर चरण",
        ovulation: "ओव्यूलेशन चरण",
        luteal: "ल्यूटियल चरण"
      },
      status: {
        "Period": "माहवारी",
        "Fertile": "उर्वरता विंडो",
        "Ovulation": "ओव्यूलेशन दिन",
        "Normal": "सामान्य चक्र दिन"
      },
      noRecords: "कोई मिलान पूर्वानुमान रिकॉर्ड नहीं मिला। दूसरा प्रयास करें!",
      pageOf: "पृष्ठ {page} का {total}"
    },
    bn: {
      months: ["জানুয়ারী", "ফেব্রুয়ারী", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
      monthsShort: ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
      weekdays: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
      weekdaysShort: ["রবি", "সোম", "मंगल", "বুধ", "বৃহ", "শুক্র", "শনি"],
      calendarWeekdays: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"],
      phases: {
        menstrual: "ঋতুস্রাব পর্ব",
        follicular: "ফলিকুলার পর্ব",
        ovulation: "ডিম্বস্ফোটন পর্ব",
        luteal: "লুটিয়াল পর্ব"
      },
      status: {
        "Period": "মাসিক",
        "Fertile": "উর্বর উইন্ডো",
        "Ovulation": "ডিম্বস্ফোটন দিন",
        "Normal": "স্বাভাবিক चक्र দিন"
      },
      noRecords: "কোনো মেলানো পূর্বাভাস রেকর্ড পাওয়া যায়নি। অন্য অনুসন্ধান চেষ্টা করুন!",
      pageOf: "পৃষ্ঠা {page} / {total}"
    },
    as: {
      months: ["জানুৱাৰী", "ফেব্ৰুৱাৰী", "মাৰ্চ", "এপ্ৰিল", "মে", "জুন", "জুলাই", "আগষ্ট", "ছেপ্টেম্বৰ", "অক্টোবৰ", "নৱেম্বৰ", "ডিচেম্বৰ"],
      monthsShort: ["জানু", "ফেব্ৰু", "মাৰ্চ", "এপ্ৰি", "মে", "জুন", "জুলা", "আগ", "ছেপ্টে", "অক্টো", "নৱে", "ডিচে"],
      weekdays: ["দেওবাৰ", "সোমবাৰ", "মঙ্গলবাৰ", "বুধবাৰ", "বৃহস্পতিবাৰ", "শুক্ৰবাৰ", "শনিবাৰ"],
      weekdaysShort: ["দেও", "সোম", "মং", "বুধ", "বৃহ", "শুক্ৰ", "শনি"],
      calendarWeekdays: ["দেও", "সোম", "মং", "বুধ", "বৃহ", "শুক্ৰ", "শনি"],
      phases: {
        menstrual: "ঋতুস্ৰাৱৰ পৰ্যায়",
        follicular: "ফলিকুলৰ পৰ্যায়",
        ovulation: "ডিম্বস্ফোটন পৰ্যায়",
        luteal: "লুটিয়াল পৰ্যায়"
      },
      status: {
        "Period": "ঋতুস্ৰাৱ",
        "Fertile": "উৰ্বৰ উইণ্ড'",
        "Ovulation": "ডিম্বস্ফোটন দিন",
        "Normal": "স্বাভাৱিক দিন"
      },
      noRecords: "কোনো পূৰ্বাভাস ৰেকৰ্ড পোৱা নগ’ল। আন এটা চেষ্টা কৰক!",
      pageOf: "পৃষ্ঠা {page} / {total}"
    },
    brx: {
      months: ["जनावारी", "फेब्रुवारी", "मार्स", "एप्रिल", "मे", "जुन", "जुलाइ", "आगष्ट", "सेप्टेम्बर", "अक्टोबर", "नभेम्बर", "डिसेम्बर"],
      monthsShort: ["जन", "फेब", "मार", "एप्रि", "मे", "जुन", "जुल", "आग", "सेप", "अक्ट", "नभ", "डिस"],
      weekdays: ["रबिबार", "समबार", "मङ्गलबार", "बुधबार", "बृहसपतिबार", "सुक्रबार", "सनिबार"],
      weekdaysShort: ["रबि", "सम", "मं", "बुध", "बृह", "सुक्र", "सनि"],
      calendarWeekdays: ["रबि", "सम", "मं", "बुध", "बृह", "सुक्र", "सनि"],
      phases: {
        menstrual: "मासिक धर्म बाहागो",
        follicular: "फॉलिक्युलर बाहागो",
        ovulation: "अण्डोत्सर्ग बाहागो",
        luteal: "ल्यूटियल बाहागो"
      },
      status: {
        "Period": "मासिक धर्म",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "अण्डोत्सर्ग सान",
        "Normal": "साधारण सान"
      },
      noRecords: "जेबो फोरमानलाइ मोनखायिसै। गुबुन नागिर!",
      pageOf: "बिलाइ {page} / {total}"
    },
    doi: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
      weekdays: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "वीरवार", "शुक्रवार", "शनिवार"],
      weekdaysShort: ["रवि", "सोम", "मंगल", "बुध", "वीर", "शुक्र", "शनि"],
      calendarWeekdays: ["रवि", "सोम", "मंगल", "बुध", "वीर", "शुक्र", "शनि"],
      phases: {
        menstrual: "मासिक धर्म चरण",
        follicular: "फॉलिक्युलर चरण",
        ovulation: "डिंबोत्सर्जन चरण",
        luteal: "ल्यूटियल चरण"
      },
      status: {
        "Period": "मासिक धर्म",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "डिंबोत्सर्जन दिन",
        "Normal": "सामान्य दिन"
      },
      noRecords: "कोई रिकॉर्ड नहीं मिल्या। दोबारा कोशिश करो!",
      pageOf: "सफ़ा {page} / {total}"
    },
    gom: {
      months: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलाय", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
      monthsShort: ["जान", "फेब", "मार्च", "एप्रि", "मे", "जून", "जुल", "ऑग", "सप्टे", "ऑक्ट", "नोव्ह", "डिस"],
      weekdays: ["आयतार", "सोमार", "मंगळार", "बुधवार", "बिरेस्तार", "सुक्रार", "शन्वार"],
      weekdaysShort: ["आय", "सोम", "मंग", "बुध", "बिर", "सुक्र", "शनि"],
      calendarWeekdays: ["आय", "सोm", "मं", "बु", "बि", "सु", "श"],
      phases: {
        menstrual: "मासिक पाळी काळ",
        follicular: "फॉलिक्युलर काळ",
        ovulation: "अण्डोत्सर्ग काळ",
        luteal: "ल्यूटियल काळ"
      },
      status: {
        "Period": "मासिक पाळी",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "अण्डोत्सर्ग दीस",
        "Normal": "सामान्य दीस"
      },
      noRecords: "काहीच मेळ मेळ्ळो ना. परत सोधात!",
      pageOf: "पान {page} / {total}"
    },
    gu: {
      months: ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"],
      monthsShort: ["જાન્યુ", "ફેબ્રુ", "માર્ચ", "એપ્રિ", "મે", "જૂન", "જુલા", "ઓગ", "સપ્ટે", "ઓક્ટો", "નવે", "ડિસે"],
      weekdays: ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"],
      weekdaysShort: ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"],
      calendarWeekdays: ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"],
      phases: {
        menstrual: "માસિક ધર્મ તબક્કો",
        follicular: "ફોલિક્યુલર તબક્કો",
        ovulation: "અંડોત્સર્ગ તબક્કો",
        luteal: "લ્યુટીયલ તબક્કો"
      },
      status: {
        "Period": "માસિક ધર્મ",
        "Fertile": "ફળદ્રુપ સમયગાળો",
        "Ovulation": "ઓવ્યુલેશન દિવસ",
        "Normal": "સામાન્ય ચક્ર દિવસ"
      },
      noRecords: "કોઈ રેકોર્ડ મળ્યા નથી. બીજી શોધ કરો!",
      pageOf: "પાનું {page} of {total}"
    },
    kn: {
      months: ["ಜನವರಿ", "ಫೆಬ್ರವರಿ", "ಮಾರ್ಚ್", "ಏಪ್ರಿಲ್", "ಮೇ", "ಜೂನ್", "ಜುಲೈ", "ಆಗಸ್ಟ್", "ಸೆಪ್ಟೆಂಬರ್", "ಅಕ್ಟೋಬರ್", "ನವೆಂಬರ್", "ಡಿಸೆಂಬರ್"],
      monthsShort: ["ಜನ", "ಫೆಬ್ರ", "ಮಾರ್ಚ್", "ಏಪ್ರಿ", "ಮೇ", "ಜೂನ್", "ಜುಲೈ", "ಆಗ", "ಸೆಪ್ಟೆ", "ಅಕ್ಟೋ", "ನವೆ", "ಡಿಸೆ"],
      weekdays: ["ಭಾನುವಾರ", "ಸೋಮವಾರ", "ಮಂಗಳವಾರ", "ಬುಧವಾರ", "ಗುರುವಾರ", "ಶುಕ್ರವಾರ", "ಶನಿವಾರ"],
      weekdaysShort: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
      calendarWeekdays: ["ಭಾನು", "ಸೋಮ", "ಮಂಗಳ", "ಬುಧ", "ಗುರು", "ಶುಕ್ರ", "ಶನಿ"],
      phases: {
        menstrual: "ಋತುಚಕ್ರದ ಹಂತ",
        follicular: "ಫೋಲಿಕ್ಯುಲರ್ ಹಂತ",
        ovulation: "ಅಂಡೋತ್ಪತ್ತಿ ಹಂತ",
        luteal: "ಲೂಟಿಯಲ್ ಹಂತ"
      },
      status: {
        "Period": "ಋತುಸ್ರಾವ",
        "Fertile": "ಫಲವತ್ತಾದ ದಿನಗಳು",
        "Ovulation": "ಅಂಡೋತ್ಪತ್ತಿ ದಿನ",
        "Normal": "ಸಾಮಾನ್ಯ ದಿನ"
      },
      noRecords: "ಯಾವುದೇ ಮುನ್ಸೂಚನೆ ಲಭ್ಯವಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ!",
      pageOf: "ಪುಟ {page} / {total}"
    },
    ks: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
      weekdays: ["आथवार", "चँद्रवार", "बुमवार", "बोदवार", "ब्रैसवार", "जुमवार", "बटवार"],
      weekdaysShort: ["आथ", "चँद", "बुम", "बोद", "ब्रै", "जुम", "बट"],
      calendarWeekdays: ["आथ", "चँद", "बुम", "बोद", "ब्रै", "जुम", "बट"],
      phases: {
        menstrual: "माहवारी चरण",
        follicular: "फॉलिक्युलर चरण",
        ovulation: "ओव्यूलेशन चरण",
        luteal: "ल्यूटियल चरण"
      },
      status: {
        "Period": "माहवारी",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "ओव्यूलेशन दिन",
        "Normal": "सामान्य दिन"
      },
      noRecords: "कंह ति रिकॉर्ड मिल्योव न। दोबारा कोशिश कर्यु!",
      pageOf: "सफ़ा {page} / {total}"
    },
    gom: {
      months: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलाय", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
      monthsShort: ["जान", "फेब", "मार्च", "एप्रि", "मे", "जून", "जुल", "ऑग", "सप्टे", "ऑक्ट", "नोव्ह", "डिस"],
      weekdays: ["आयतार", "सोमार", "मंगळार", "बुधवार", "बिरेस्तार", "सुक्रार", "शन्वार"],
      weekdaysShort: ["आय", "सोम", "मंग", "बुध", "बिर", "सुक्र", "शनि"],
      calendarWeekdays: ["आय", "सोम", "मंग", "बुध", "बिर", "सुक्र", "शनि"],
      phases: {
        menstrual: "मासिक पाळी काळ",
        follicular: "फॉलिक्युलर काळ",
        ovulation: "अण्डोत्सर्ग काळ",
        luteal: "ल्यूटियल काळ"
      },
      status: {
        "Period": "मासिक पाळी",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "अण्डोत्सर्ग दीस",
        "Normal": "सामान्य दीस"
      },
      noRecords: "काहीच मेळ मेळ्ळो ना. परत सोधात!",
      pageOf: "पान {page} / {total}"
    },
    mai: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
      weekdays: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "बृहस्पतिवार", "शुक्रवार", "शनिवार"],
      weekdaysShort: ["रवि", "सोम", "मंगल", "बुध", "बृह", "शुक्र", "शनि"],
      calendarWeekdays: ["रवि", "सोम", "मंगल", "बुध", "बृह", "शुक्र", "शनि"],
      phases: {
        menstrual: "मासिक धर्म चरण",
        follicular: "फॉलिक्युलर चरण",
        ovulation: "अंडोत्सर्ग चरण",
        luteal: "ल्यूटियल चरण"
      },
      status: {
        "Period": "मासिक धर्म",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "अंडोत्सर्ग दिन",
        "Normal": "सामान्य दिन"
      },
      noRecords: "कोई रिकॉर्ड नै भेटल। दोसर कोशिश करू!",
      pageOf: "पृष्ठ {page} / {total}"
    },
    ml: {
      months: ["ജനുവരി", "ഫെബ്രുവരി", "മാർച്ച്", "ഏപ്രിൽ", "മേയ്", "ജൂൺ", "ജൂലൈ", "ആഗസ്റ്റ്", "സെപ്റ്റംബർ", "ഒക്ടോബർ", "നവംബർ", "ഡിസംബർ"],
      monthsShort: ["ജനു", "ഫെബ്രു", "മാർച്ച്", "ഏപ്രി", "മേയ്", "ജൂൺ", "ജൂലൈ", "ആഗ", "സെപ്റ്റെ", "ഒക്ടോ", "നവം", "ഡിസം"],
      weekdays: ["ഞായറാഴ്ച", "തിങ്കളാഴ്ച", "ചൊവ്വാഴ്ച", "ബുധനാഴ്ച", "വ്യാഴാഴ്ച", "വെള്ളിയാഴ്ച", "ശനിയാഴ്ച"],
      weekdaysShort: ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"],
      calendarWeekdays: ["ഞാ", "തി", "ചൊ", "ബു", "വ്യാ", "വെ", "ശ"],
      phases: {
        menstrual: "ആർത്തവ ഘട്ടം",
        follicular: "ഫോളിക്കുലാർ ഘട്ടം",
        ovulation: "അണ്ഡോത്സർഗ്ഗ ഘട്ടം",
        luteal: "ലൂട്ടിയൽ ഘട്ടം"
      },
      status: {
        "Period": "ആർത്തവം",
        "Fertile": "ഫലഭൂയിഷ്ഠമായ സമയം",
        "Ovulation": "അണ്ഡോത്സർഗ്ഗ ദിവസം",
        "Normal": "സാധാരണ ദിവസം"
      },
      noRecords: "രേഖകളൊന്നും കണ്ടെത്താനായില്ല. മറ്റൊന്ന് ശ്രമിക്കുക!",
      pageOf: "പേജ് {page} / {total}"
    },
    mni: {
      months: ["জানুৱারী", "ফেব্রুৱারী", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগষ্ট", "সেপ্তেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
      monthsShort: ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
      weekdays: ["নোংমাইজিং", "নিংথৌকাবা", "লৈপাকপোকপা", "য়ুমশাকৈশা", "শাগোলশেন", "ইরাই", "থাংজা"],
      weekdaysShort: ["নোং", "নিং", "লৈ", "য়ুম", "শা", "ই", "থাং"],
      calendarWeekdays: ["নোং", "নিং", "লৈ", "য়ুম", "শা", "ই", "থাং"],
      phases: {
        menstrual: "মেনস্ত্রুএল ফেস",
        follicular: "ফোলিকুলার ফেস",
        ovulation: "ওভুলেশন ফেস",
        luteal: "লুটিএল ফেস"
      },
      status: {
        "Period": "থা নাইবা",
        "Fertile": "ওভুলেশন উইন্ডো",
        "Ovulation": "ওভুলেশন নুমিৎ",
        "Normal": "স্বাভাবিক নুমিৎ"
      },
      noRecords: "রেকোর্ড ফংদে। অমুক্কা হান্না হোৎনৌ!",
      pageOf: "লমাই {page} / {total}"
    },
    mr: {
      months: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
      monthsShort: ["जाने", "फेब्रु", "मार्च", "एप्रि", "मे", "जून", "जुलै", "ऑग", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"],
      weekdays: ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
      weekdaysShort: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
      calendarWeekdays: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
      phases: {
        menstrual: "मासिक पाळीचा टप्पा",
        follicular: "फॉलिक्युलर टप्पा",
        ovulation: "ओव्हुलेशन टप्पा",
        luteal: "ल्युटियल टप्पा"
      },
      status: {
        "Period": "मासिक पाळी",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "ओव्हुलेशन दिवस",
        "Normal": "सामान्य दिवस"
      },
      noRecords: "अंदाज सापडला नाही. पुन्हा प्रयत्न करा!",
      pageOf: "पान {page} / {total}"
    },
    ne: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रिल", "मई", "जुन", "जुलाई", "अगस्त", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रि", "मई", "जुन", "जुल", "अग", "सेप्ट", "अक्ट", "नोभ", "डिस"],
      weekdays: ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"],
      weekdaysShort: ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"],
      calendarWeekdays: ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"],
      phases: {
        menstrual: "मासिक धर्म चरण",
        follicular: "फॉलिक्युलर चरण",
        ovulation: "अण्डोत्सर्ग चरण",
        luteal: "ल्यूटियल चरण"
      },
      status: {
        "Period": "मासिक धर्म",
        "Fertile": "उर्वरता विन्डो",
        "Ovulation": "अण्डोत्सर्ग दिन",
        "Normal": "सामान्य दिन"
      },
      noRecords: "कुनै रेकर्ड फेला परेन। फेरि प्रयास गर्नुहोस्!",
      pageOf: "पृष्ठ {page} / {total}"
    },
    or: {
      months: ["ଜାନୁଆରୀ", "ଫେବୃଆରୀ", "ମାର୍ଚ୍ଚ", "ଏପ୍ରିଲ୍", "ମଇ", "ଜୁନ୍", "ଜୁଲାଇ", "ଅଗଷ୍ଟ", "ସେପ୍ଟେମ୍ବର", "ଅକ୍ଟୋବର", "ନଭେମ୍ବର", "ଡିସେମ୍ବର"],
      monthsShort: ["ଜାନୁ", "ଫେବୃ", "ମାର୍ଚ୍ଚ", "ଏପ୍ରି", "ମଇ", "ଜୁନ୍", "ଜୁଲା", "ଅଗ", "ସେପ୍ଟେ", "ଅକ୍ଟୋ", "ନଭେ", "ଡିସେ"],
      weekdays: ["ରବିବାର", "ସୋମବାର", "ମଙ୍ଗଳବାର", "ବୁଧବାର", "ଗୁରୁବାର", "ଶୁକ୍ରବାର", "ଶନିବାର"],
      weekdaysShort: ["ରବି", "ସୋମ", "ମଙ୍ଗଳ", "ବୁଧ", "ଗୁରୁ", "ଶୁକ୍ର", "ଶନି"],
      calendarWeekdays: ["ରବି", "ସୋମ", "ମଙ୍ଗଳ", "ବୁଧ", "ଗୁରୁ", "ଶୁକ୍ର", "ଶନି"],
      phases: {
        menstrual: "ଋତୁସ୍ରାବ ପର୍ଯ୍ୟାୟ",
        follicular: "ଫଲିକୁଲାର ପର୍ଯ୍ୟାୟ",
        ovulation: "ଡିମ୍ବୋତ୍ସର୍ଗ ପର୍ଯ୍ୟାୟ",
        luteal: "ଲୁଟିଆଲ୍ ପର୍ଯ୍ୟାୟ"
      },
      status: {
        "Period": "ଋତୁସ୍ରାବ",
        "Fertile": "ଋତୁ ଅନୁକୂଳ ସମୟ",
        "Ovulation": "ଡିମ୍ବୋତ୍ସର୍ଗ ଦିବସ",
        "Normal": "ସାଧାରଣ ଦିବସ"
      },
      noRecords: "କୌଣସି ପୂର୍ବାନୁମାନ ମିଳିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ!",
      pageOf: "ପୃଷ୍ଠା {page} / {total}"
    },
    pa: {
      months: ["ਜਨਵਰੀ", "ਫਰਵਰੀ", "ਮਾਰਚ", "ਅਪ੍ਰੈਲ", "ਮਈ", "ਜੂਨ", "ਜੁਲਾਈ", "ਅਗਸਤ", "ਸਤੰਬਰ", "ਅਕਤੂਬਰ", "ਨਵੰਬਰ", "ਦਸੰਬਰ"],
      monthsShort: ["ਜਨ", "ਫਰ", "ਮਾਰਚ", "ਅਪ੍ਰੈ", "ਮਈ", "ਜੂਨ", "ਜੁਲ", "ਅਗ", "ਸਤੰ", "ਅਕਤੂ", "ਨਵ", "ਦਸ"],
      weekdays: ["ਐਤਵਾਰ", "ਸੋਮਵਾਰ", "ਮੰਗਲਵਾਰ", "ਬੁੱਧਵਾਰ", "ਵੀਰਵਾਰ", "ਸ਼ੁੱਕਰਵਾਰ", "ਸ਼ਨੀਵਾਰ"],
      weekdaysShort: ["ਐਤ", "ਸੋਮ", "ਮੰਗਲ", "ਬੁੱਧ", "ਵੀਰ", "ਸ਼ੁੱਕ", "ਸ਼ਨੀ"],
      calendarWeekdays: ["ਐਤ", "ਸੋਮ", "ਮੰਗਲ", "ਬੁੱਧ", "ਵੀਰ", "ਸ਼ੁੱਕ", "ਸ਼ਨੀ"],
      phases: {
        menstrual: "ਮਾਹਵਾਰੀ ਪੜਾਅ",
        follicular: "ਫੋਲੀਕੂਲਰ ਪੜਾਅ",
        ovulation: "ਅੰਡਕੋਸ਼ ਪੜਾਅ",
        luteal: "ਲੂਟਿਅਲ ਪੜਾਅ"
      },
      status: {
        "Period": "ਮਾਹਵਾਰੀ",
        "Fertile": "ਫਰਟਾਈਲ ਵਿੰਡੋ",
        "Ovulation": "ਅੰਡਕੋਸ਼ ਦਿਨ",
        "Normal": "ਆਮ ਦਿਨ"
      },
      noRecords: "ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ!",
      pageOf: "ਸਫ਼ਾ {page} / {total}"
    },
    sa: {
      months: ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
      monthsShort: ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
      weekdays: ["भानुवासरः", "सोमवासरः", "मङ्गलवासरः", "बुधवासरः", "गुरुवासरः", "शुक्रवासरः", "शनिवासरः"],
      weekdaysShort: ["रवि", "सोम", "मङ्गल", "बुध", "गुरु", "शुक्र", "शनि"],
      calendarWeekdays: ["रवि", "सोम", "मङ्गल", "बुध", "गुरु", "शुक्र", "शनि"],
      phases: {
        menstrual: "रजःस्रावकालः",
        follicular: "पुटकसंवर्धनकालः",
        ovulation: "डिम्बोत्सर्गकालः",
        luteal: "पीतपिण्डकालः"
      },
      status: {
        "Period": "मासिक धर्मः",
        "Fertile": "उर्वरता कालः",
        "Ovulation": "डिम्बोत्सर्ग दिवसः",
        "Normal": "सामान्य दिवसः"
      },
      noRecords: "किमपि विवरणं न प्राप्तम्। पुनः अन्वेषयतु!",
      pageOf: "पत्रम् {page} / {total}"
    },
    sat: {
      months: ["ਜਨਵਰੀ", "ਫਰਵਰੀ", "ਮਾਰਚ", "ਅਪ੍ਰੈਲ", "ਮਈ", "ਜੂਨ", "ਜੁਲਾਈ", "ਅਗਸਤ", "ਸਤੰਬਰ", "ਅਕਤੂਬਰ", "ਨਵੰਬਰ", "ਦਸੰਬਰ"],
      monthsShort: ["ਜਨ", "ਫਰ", "ਮਾਰਚ", "ਅਪ੍ਰੈ", "ਮਈ", "ਜੂਨ", "ਜੁਲ", "ਅਗ", "ਸਤੰ", "ਅਕਤੂ", "ਨਵ", "ਦਸ"],
      weekdays: ["ਸਿੰਗੇ ਮਾਹਾ", "ਓਤੇ ਮਾਹਾ", "ਬਾਲੇ ਮਾਹਾ", "ਸਾਗੁਨ ਮਾਹਾ", "ਸਾਰਦੀ ਮਾਹਾ", "ਜਾਰੂਮ ਮਾਹਾ", "ញੁਹੁਮ ਮਾਹਾ"],
      weekdaysShort: ["ਸਿੰਗੇ", "ਓਤੇ", "ਬਾਲੇ", "ਸਾਗੁਨ", "ਸਾਰਦੀ", "ਜਾਰੂਮ", "ញੁਹੁਮ"],
      calendarWeekdays: ["ਸਿੰਗੇ", "ਓਤੇ", "ਬਾਲੇ", "ਸਾਗੁਨ", "ਸਾਰਦੀ", "ਜਾਰੂਮ", "ញੁਹੁਮ"],
      phases: {
        menstrual: "ਮਾਹਵਾਰੀ ਪੜਾਅ",
        follicular: "ਫੋਲੀਕੂਲਰ ਪੜਾਅ",
        ovulation: "ਅੰਡਕੋਸ਼ ਪੜਾਅ",
        luteal: "ਲੂਟਿਅਲ ਪੜਾਅ"
      },
      status: {
        "Period": "ਮਾਹਵਾਰੀ",
        "Fertile": "ਫਰਟਾਈਲ ਵਿੰਡੋ",
        "Ovulation": "ਅੰਡਕੋਸ਼ ਦਿਨ",
        "Normal": "ਆਮ ਦਿਨ"
      },
      noRecords: "ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ!",
      pageOf: "ਸਫ਼ਾ {page} / {total}"
    },
    sd: {
      months: ["جنوري", "فروري", "مارچ", "اپريل", "مئي", "جون", "جولاءِ", "آگسٽ", "سيپٽمبر", "آڪٽوبر", "نومبر", "ڊسمبر"],
      monthsShort: ["جن", "فر", "مارچ", "اپر", "مئي", "جون", "جول", "آگ", "سيپ", "آڪٽ", "نوم", "ڊسم"],
      weekdays: ["آچر", "سومر", "اڱارو", "اربع", "خميس", "जुमओ", "ڇنڇر"],
      weekdaysShort: ["آچر", "سومر", "اڱارو", "اربع", "خميس", "جمعي", "ڇنڇر"],
      calendarWeekdays: ["آچر", "سومر", "اڱارو", "اربع", "خميس", "جمعي", "ڇنڇر"],
      phases: {
        menstrual: "ماهواري وارو مرحلو",
        follicular: "فوليڪيولر مرحلو",
        ovulation: "اووليوشن مرحلو",
        luteal: "لوٽيل مرحلو"
      },
      status: {
        "Period": "ماهواري",
        "Fertile": "فرٽائل ونڊو",
        "Ovulation": "اووليوشن ڏينهن",
        "Normal": "عام ڏينهن"
      },
      noRecords: "ڪو به رڪارڊ نه مليو. ٻيهر ڪوشش ڪريو!",
      pageOf: "صفحو {page} / {total}"
    },
    ta: {
      months: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
      monthsShort: ["ஜன", "பிப்", "மார்", "ஏப்", "மே", "ஜூன்", "ஜூலை", "ஆக", "செப்", "அக்", "நவ", "டிச"],
      weekdays: ["ஞாயிற்றுக்கிழமை", "திங்கட்கிழமை", "செவ்வாய்க்கிழமை", "புதன்கிழமை", "வியாழக்கிழமை", "வெள்ளிக்கிழமை", "சனிக்கிழமை"],
      weekdaysShort: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
      calendarWeekdays: ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"],
      phases: {
        menstrual: "மாதவிடாய் நிலை",
        follicular: "நுண்ணறை நிலை",
        ovulation: "கருமுட்டை வெளியீட்டு நிலை",
        luteal: "லூட்டியல் நிலை"
      },
      status: {
        "Period": "மாதவிடாய்",
        "Fertile": "கருவுறுதல் காலம்",
        "Ovulation": "கருமுட்டை நாள்",
        "Normal": "சாதாரண நாள்"
      },
      noRecords: "கணிப்பு எதுவும் கிடைக்கவில்லை. மீண்டும் தேடவும்!",
      pageOf: "பக்கம் {page} / {total}"
    },
    te: {
      months: ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబరు", "అక్టోబరు", "నవంబరు", "డిసెంబరు"],
      monthsShort: ["జన", "ఫిబ్ర", "మార్చి", "ఏప్రి", "మే", "జూన్", "జూలై", "ఆగ", "సెప్టె", "అక్టో", "నవం", "డిసెం"],
      weekdays: ["ఆదివారం", "సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"],
      weekdaysShort: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
      calendarWeekdays: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
      phases: {
        menstrual: "రుతుక్రమం దశ",
        follicular: "फॉलिक్యులర్ దశ",
        ovulation: "అండోత్పత్తి దశ",
        luteal: "లూటియల్ దశ"
      },
      status: {
        "Period": "రుతుస్రావం",
        "Fertile": "ఫలవంతమైన రోజులు",
        "Ovulation": "అండోత్పత్తి రోజు",
        "Normal": "సాధారణ రోజు"
      },
      noRecords: "ఎటువంటి అంచనాలు లభించలేదు. మళ్లీ ప్రయత్నించండి!",
      pageOf: "పేజీ {page} / {total}"
    },
    ur: {
      months: ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"],
      monthsShort: ["جن", "فر", "مارچ", "اپر", "مئی", "جون", "جول", "اگ", "ستم", "اکت", "نوم", "دسم"],
      weekdays: ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"],
      weekdaysShort: ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"],
      calendarWeekdays: ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"],
      phases: {
        menstrual: "ماہواری کا مرحلہ",
        follicular: "فولیکیولر مرحلہ",
        ovulation: "اوولیشن کا مرحلہ",
        luteal: "لوٹیل مرحلہ"
      },
      status: {
        "Period": "ماہواری",
        "Fertile": "فرٹائل ونڈو",
        "Ovulation": "اوولیشن کا دن",
        "Normal": "عام دن"
      },
      noRecords: "کوئی پیشن گوئی ریکارڈ نہیں ملا۔ دوبارہ کوشش کریں!",
      pageOf: "صفحہ {page} / {total}"
    }
  };

  const phaseTranslations = {
    en: {
      menstrual: {
        label: "Menstrual Phase",
        desc: "Your period has begun. Estrogen and progesterone are at baseline. Google-funded mcPHASES research shows Resting Heart Rate (RHR) and core body temperature drop to their lowest cycle levels during early menses. Rest when you can, and eat iron-rich foods."
      },
      follicular: {
        label: "Follicular Phase",
        desc: "Energy is rising. Estrogen rises to mature follicles in the ovaries. Google-funded mcPHASES research shows a steady increase in Heart Rate Variability (HRV) during this phase, indicating enhanced physical recovery and autonomic nervous system resilience."
      },
      ovulation: {
        label: "Ovulation Phase",
        desc: "An egg is being released. You are in your peak fertile window. LH surges to trigger release. Research highlights peak estrogen and metabolic fluctuations, with subtle variations in insulin sensitivity and glucose levels."
      },
      luteal: {
        label: "Luteal Phase",
        desc: "The body prepares for possible pregnancy. Progesterone rises, elevating Resting Heart Rate (RHR) by 2–4 bpm and core body temperature by 0.3°C–0.5°C under its thermogenic effects. You may notice PMS symptoms."
      }
    },
    hi: {
      menstrual: {
        label: "मासिक धर्म चरण",
        desc: "आपकी माहवारी शुरू हो गई है। एस्ट्रोजन और प्रोजेस्टेरोन बेसलाइन पर हैं। गूगल द्वारा वित्तपोषित mcPHASES अनुसंधान से पता चलता है कि मासिक धर्म की शुरुआत में रेस्टिंग हार्ट रेट (RHR) और शरीर का तापमान अपने सबसे निचले चक्र स्तर पर आ जाते हैं। जब हो सके आराम करें, और आयरन युक्त भोजन लें।"
      },
      follicular: {
        label: "फॉलिक्युलर चरण",
        desc: "ऊर्जा बढ़ रही है। अंडाशय में रोम परिपक्व होने के लिए एस्ट्रोजन बढ़ता है। गूगल द्वारा वित्तपोषित mcPHASES अनुसंधान इस चरण के दौरान हार्ट रेट वेरिएबिलिटी (HRV) में लगातार वृद्धि दर्शाता है, जो शारीरिक रिकवरी और स्वायत्त तंत्रिका तंत्र के लचीलेपन का संकेत देता है।"
      },
      ovulation: {
        label: "ओव्यूलेशन चरण",
        desc: "एक अंडा निकल रहा है। आप अपने चरम उर्वरता की स्थिति में हैं। अंडे की रिहाई को ट्रिगर करने के लिए एलएच (LH) बढ़ता है। अनुसंधान एस्ट्रोजन और चयापचय में उतार-चढ़ाव को रेखांकित करता है, जिसमें इंसुलिन संवेदनशीलता और ग्लूकोज के स्तर में सूक्ष्म बदलाव होते हैं।"
      },
      luteal: {
        label: "ल्यूटियल चरण",
        desc: "शरीर संभावित गर्भावस्था की तैयारी करता है। प्रोजेस्टेरोन बढ़ता है, जो अपने थर्मोजेनिक प्रभावों के तहत रेस्टिंग हार्ट रेट (RHR) को 2-4 बीपीएम और शरीर के मुख्य तापमान को 0.3 डिग्री सेल्सियस-0.5 डिग्री सेल्सियस बढ़ा देता है। आप पीएमएस (PMS) के लक्षण देख सकते हैं।"
      }
    },
    bn: {
      menstrual: {
        label: "ঋতুস্রাব পর্ব",
        desc: "আপনার মাসিক শুরু হয়েছে। ইস্ট্রোজেন এবং প্রোজেস্টেরন বেসলাইনে রয়েছে। গুগল-অর্থায়িত mcPHASES গবেষণা দেখায় যে ঋতুস্রাবের শুরুর দিকে রেস্টিং হার্ট রেট (RHR) এবং শরীরের মূল তাপমাত্রা চক্রের সর্বনিম্ন স্তরে নেমে যায়। যখনই সম্ভব বিশ্রাম নিন, এবং আয়রন সমৃদ্ধ খাবার খান।"
      },
      follicular: {
        label: "ফলিকুলার পর্ব",
        desc: "শক্তি বাড়ছে। ডিম্বাশয়ে ফলিকল পরিপক্ক করতে ইস্ট্রোজেন বৃদ্ধি পায়। গুগল-অর্থায়িত mcPHASES গবেষণা এই পর্বে হার্ট রেট ভ্যারিয়েবিলিটি (HRV)-র একটি অবিчисли বৃদ্ধি দেখায়, যা উন্নত শারীরিক পুনরুদ্ধার এবং স্বায়ত্তশাসিত স্নায়ুতন্ত্রের স্থিতিস্থাপকতা নির্দেশ করে।"
      },
      ovulation: {
        label: "ডিম্বস্ফোটন পর্ব",
        desc: "একটি ডিম্বাণু নির্গত হচ্ছে। আপনি আপনার সর্বোচ্চ উর্বর উন্ডোতে আছেন। ডিম্বাণু নিঃসরণ শুরু করতে LH হরমোন বৃদ্ধি পায়। গবেষণা ডিম্বস্ফোটনের সময় সর্বোচ্চ ইস্ট্রোজেন এবং বিপাকীয় ওঠানামা তুলে ধরে, সাথে ইনসুলিন সংवेदनशीलता এবং গ্লুকোজ স্তরের সূক্ষ্ম পরিবর্তনগুলিও।"
      },
      luteal: {
        label: "লুটিয়াল পর্ব",
        desc: "শরীর সম্ভাব্য গর্ভাবস্থার জন্য প্রস্তুত হয়। প্রোজেস্টেরন বৃদ্ধি পায়, যা এর থার্মোজেনিক প্রভাবের কারণে রেস্টিং হার্ট রেট (RHR) ২-৪ bpm এবং শরীরের মূল তাপমাত্রা ০.३°C-০.৫°C বৃদ্ধি করে। আপনি PMS লক্ষণগুলি লক্ষ্য করতে পারেন।"
      }
    }
  };

  // Populate other 20 languages in phaseTranslations dynamically on runtime if needed,
  // or statically backfill them here to maintain the clean baseline.
  // We will build a helper in script.js on start that maps phaseTranslations for other languages
  // to fall back to English if they are not in the dictionary, ensuring they never crash.
  // Let's add simple native-script labels and descriptions for all 22 languages here!
  // Assamese, Bodo, Dogri, Goan Konkani, Gujarati, Kannada, Kashmiri, Maithili, Malayalam,
  // Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, Urdu:
  
  const additionalPhaseLabels = {
    as: { menstrual: "ঋতুস্ৰাৱৰ পৰ্যায়", follicular: "ফলিকুলৰ পৰ্যায়", ovulation: "ডিম্বস্ফোটন পৰ্যায়", luteal: "লুটিয়াল পৰ্যায়" },
    brx: { menstrual: "मासिक धर्म बाहागो", follicular: "फॉलिक्युलर बाहागो", ovulation: "अण्डोत्सर्ग बाहागो", luteal: "ल्यूटियल बाहागो" },
    doi: { menstrual: "मासिक धर्म चरण", follicular: "फॉलिक्युलर चरण", ovulation: "डिंबोत्सर्जन चरण", luteal: "ल्यूटियल चरण" },
    gom: { menstrual: "मासिक पाळी काळ", follicular: "फॉलिक्युलर काळ", ovulation: "अण्डोत्सर्ग काळ", luteal: "ल्यूटियल काळ" },
    gu: { menstrual: "માસિક ધર્મ તબક્કો", follicular: "ફોલિક્યુલર તબક્કો", ovulation: "અંડોત્સર્ગ તબક્કો", luteal: "લ્યુટીયલ તબક્કો" },
    kn: { menstrual: "ಋತುಚಕ್ರದ ಹಂತ", follicular: "ಫೋಲಿಕ್ಯುಲರ್ ಹಂತ", ovulation: "ಅಂಡೋತ್ಪತ್ತಿ ಹಂತ", luteal: "ಲೂಟಿಯಲ್ ಹಂತ" },
    ks: { menstrual: "माहवारी चरण", follicular: "फॉलिक्युलर चरण", ovulation: "ओव्यूलेशन चरण", luteal: "ल्यूटियल चरण" },
    mai: { menstrual: "मासिक धर्म चरण", follicular: "फॉलिक्युलर चरण", ovulation: "अंडोत्सर्ग चरण", luteal: "ल्यूटियल चरण" },
    ml: { menstrual: "ആർത്തവ ഘട്ടം", follicular: "ഫോളിക്കുലാർ ഘട്ടം", ovulation: "അണ്ഡോത്സർഗ്ഗ ഘട്ടം", luteal: "ലൂട്ടിയൽ ഘട്ടം" },
    mni: { menstrual: "মেনস্ত্রুএল ফেস", follicular: "ফোলিকুলার ফেস", ovulation: "ওভুলেশন ফেস", luteal: "লুটিএল ফেস" },
    mr: { menstrual: "मासिक पाळीचा टप्पा", follicular: "फॉलिक्युलर टप्पा", ovulation: "ओव्हुलेशन टप्पा", luteal: "ल्युटियल टप्पा" },
    ne: { menstrual: "मासिक धर्म चरण", follicular: "फॉलिक्युलर चरण", ovulation: "अण्डोत्सर्ग चरण", luteal: "ल्यूटियल चरण" },
    or: { menstrual: "ଋତୁସ୍ରାବ ପର୍ଯ୍ୟାୟ", follicular: "ଫଲିକୁଲାର ପର୍ଯ୍ୟାୟ", ovulation: "ଡିମ୍ବୋତ୍ସର୍ଗ ପର୍ଯ୍ୟาୟ", luteal: "ଲୁଟିଆଲ୍ ପର୍ଯ୍ୟାୟ" },
    pa: { menstrual: "ਮਾਹਵਾਰੀ ਪੜਾਅ", follicular: "ਫੋਲੀਕੂਲਰ ਪੜਾਅ", ovulation: "ਅੰਡਕੋਸ਼ ਪੜਾਅ", luteal: "ਲੂਟਿਅਲ ਪੜਾਅ" },
    sa: { menstrual: "रजःस्रावकालः", follicular: "पुटकसंवर्धनकालः", ovulation: "डिम्बोत्सर्गकालः", luteal: "पीतपिण्डकालः" },
    sat: { menstrual: "ᱢᱟᱦᱟᱣᱟᱨᱤ ᱯᱟᱲᱟᱣ", follicular: "ᱯᱷᱚᱞᱤᱠᱩᱞᱟᱨ ᱯᱟᱲᱟᱣ", ovulation: "ᱟᱱᱰᱠᱚᱥ ᱯᱟᱲᱟᱣ", luteal: "ᱞᱩᱴᱤᱭᱟᱞ ᱯᱟᱲᱟᱣ" },
    sd: { menstrual: "ماهواري وارو مرحلو", follicular: "فوليڪيولر مرحلو", ovulation: "اووليوشن مرحلو", luteal: "لوٽيل مرحلو" },
    ta: { menstrual: "மாதவிடாய் நிலை", follicular: "நுண்ணறை நிலை", ovulation: "கருமுட்டை வெளியீட்டு நிலை", luteal: "லூட்டியல் நிலை" },
    te: { menstrual: "రుతుక్రమం దశ", follicular: "ఫాలిక్యులర్ దశ", ovulation: "అండోత్పత్తి దశ", luteal: "లూటియల్ దశ" },
    ur: { menstrual: "ماہواری کا مرحلہ", follicular: "فولیکیولر مرحلہ", ovulation: "اوولیشن کا مرحلہ", luteal: "لوٹیل مرحلہ" }
  };

  // Add the simple translation helpers dynamically
  Object.keys(additionalPhaseLabels).forEach(lang => {
    phaseTranslations[lang] = {};
    Object.keys(additionalPhaseLabels[lang]).forEach(phase => {
      if (phaseTranslations.en[phase]) {
        phaseTranslations[lang][phase] = {
          label: additionalPhaseLabels[lang][phase],
          desc: phaseTranslations.en[phase].desc // Fall back to scientific English details for exact insight
        };
      }
    });
  });


  let periodHistory = {};
  let currentViewDate = new Date();
  let selectedDateStr = "";

  // 10-Year Forecast Dashboard State Variables
  let forecastDataset = [];
  let selectedYear = Math.max(2026, Math.min(2036, new Date().getFullYear()));
  let currentPage = 1;
  const pageSize = 12;

  const init = () => {
    const form = document.getElementById('tracker-form');
    const resetBtn = document.getElementById('reset-tracker');

    loadFromStorage();
    setupSymptomLogger();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const lastPeriod = document.getElementById('last-period').value;
      const cycleLength = parseInt(document.getElementById('cycle-length').value, 10);
      const periodDuration = parseInt(document.getElementById('period-duration').value, 10) || 5;
      const age = parseInt(document.getElementById('user-age').value, 10) || null;
      const heightFt = parseInt(document.getElementById('user-height-ft').value, 10) || 0;
      const heightIn = parseInt(document.getElementById('user-height-in').value, 10) || 0;
      let height = null;
      if (heightFt > 0) {
        height = Math.round((heightFt * 30.48) + (heightIn * 2.54));
      }
      const weight = parseInt(document.getElementById('user-weight').value, 10) || null;
      
      calculateAndSave(lastPeriod, cycleLength, periodDuration, age, height, weight);
    });

    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('maa_tracker');
      localStorage.removeItem('maa_symptoms');
      localStorage.removeItem('maa_period_history');
      periodHistory = {};
      selectedDateStr = "";
      forecastDataset = [];
      document.getElementById('day-log-panel').style.display = 'none';
      document.getElementById('tracker-result').classList.add('hidden');
      
      const forecastCard = document.querySelector('.forecast-section');
      if (forecastCard) forecastCard.style.display = 'none';
      
      form.reset();

      document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
      renderCalendar();
    });

    // Calendar Navigation Event Listeners
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayMonthBtn = document.getElementById('today-month-btn');
    if (prevMonthBtn && nextMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        renderCalendar();
      });
      nextMonthBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        renderCalendar();
      });
    }
    if (todayMonthBtn) {
      todayMonthBtn.addEventListener('click', () => {
        currentViewDate = new Date();
        renderCalendar();
      });
    }

    // Day Logging Button Listeners
    document.querySelectorAll('.flow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.flow-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('.spot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.spot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Save and Clear Log Buttons
    const saveDayLogBtn = document.getElementById('save-day-log-btn');
    const clearDayLogBtn = document.getElementById('clear-day-log-btn');

    if (saveDayLogBtn) {
      saveDayLogBtn.addEventListener('click', () => {
        if (!selectedDateStr) return;
        const activeFlowBtn = document.querySelector('.flow-btn.active');
        const activeSpotBtn = document.querySelector('.spot-btn.active');

        const flow = activeFlowBtn ? activeFlowBtn.dataset.flow : 'none';
        const spotting = activeSpotBtn ? activeSpotBtn.dataset.spotting : 'none';

        if (flow === 'none' && spotting === 'none') {
          delete periodHistory[selectedDateStr];
        } else {
          periodHistory[selectedDateStr] = { flow, spotting };
        }

        localStorage.setItem('maa_period_history', JSON.stringify(periodHistory));
        renderCalendar();

        // Dynamically update calculations based on history
        recalculateAndRefresh();
      });
    }

    if (clearDayLogBtn) {
      clearDayLogBtn.addEventListener('click', () => {
        if (!selectedDateStr) return;
        delete periodHistory[selectedDateStr];
        localStorage.setItem('maa_period_history', JSON.stringify(periodHistory));

        document.querySelectorAll('.flow-btn').forEach(btn => {
          if (btn.dataset.flow === 'none') btn.classList.add('active');
          else btn.classList.remove('active');
        });
        document.querySelectorAll('.spot-btn').forEach(btn => {
          if (btn.dataset.spotting === 'none') btn.classList.add('active');
          else btn.classList.remove('active');
        });

        renderCalendar();

        // Dynamically update calculations based on history
        recalculateAndRefresh();
      });
    }

    // Export Data Button
    const exportBtn = document.getElementById('export-tracker');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportData();
      });
    }

    // Generate Doctor Report Button
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => {
        generateDoctorReport();
      });
    }

    // Import Data Buttons and File Uploader
    const importBtn = document.getElementById('import-tracker');
    const importFileInput = document.getElementById('import-file-input');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            
            if (typeof importedData !== 'object' || importedData === null) {
              throw new Error('Invalid JSON structure. Root must be an object.');
            }

            let valid = false;
            if (importedData.maa_tracker) {
              if (typeof importedData.maa_tracker !== 'object') throw new Error('maa_tracker must be an object');
              valid = true;
            }
            if (importedData.maa_period_history) {
              if (typeof importedData.maa_period_history !== 'object') throw new Error('maa_period_history must be an object');
              valid = true;
            }
            if (importedData.maa_symptoms) {
              if (typeof importedData.maa_symptoms !== 'object') throw new Error('maa_symptoms must be an object');
              valid = true;
            }
            if (importedData.maa_qa) {
              if (!Array.isArray(importedData.maa_qa)) throw new Error('maa_qa must be an array');
              valid = true;
            }
            if (importedData.maa_qa_submissions) {
              if (!Array.isArray(importedData.maa_qa_submissions)) throw new Error('maa_qa_submissions must be an array');
              valid = true;
            }

            if (!valid) {
              throw new Error('JSON is missing expected keys (e.g. maa_tracker, maa_period_history, etc.)');
            }

            // Safely merge imported tracking history and Q&As into localStorage
            if (importedData.maa_tracker) {
              localStorage.setItem('maa_tracker', JSON.stringify(importedData.maa_tracker));
            }
            if (importedData.maa_period_history) {
              const existingHistory = JSON.parse(localStorage.getItem('maa_period_history') || '{}');
              const mergedHistory = { ...existingHistory, ...importedData.maa_period_history };
              localStorage.setItem('maa_period_history', JSON.stringify(mergedHistory));
            }
            if (importedData.maa_symptoms) {
              const existingSymptoms = JSON.parse(localStorage.getItem('maa_symptoms') || '{}');
              const mergedSymptoms = { ...existingSymptoms, ...importedData.maa_symptoms };
              localStorage.setItem('maa_symptoms', JSON.stringify(mergedSymptoms));
            }
            if (importedData.maa_qa) {
              const existingQa = JSON.parse(localStorage.getItem('maa_qa') || '[]');
              const mergedQa = [...importedData.maa_qa, ...existingQa].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
              localStorage.setItem('maa_qa', JSON.stringify(mergedQa));
            }
            if (importedData.maa_qa_submissions) {
              const existingSubmissions = JSON.parse(localStorage.getItem('maa_qa_submissions') || '[]');
              const mergedSub = [...importedData.maa_qa_submissions, ...existingSubmissions].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
              localStorage.setItem('maa_qa_submissions', JSON.stringify(mergedSub));
            }

            // Load values to DOM inputs from storage, recalculate and redraw
            loadFromStorage();
            renderCalendar();
            renderForecastTable();

            // Re-render Q&A section dynamically if available
            if (typeof QAModule !== 'undefined' && QAModule.loadQuestions) {
              QAModule.loadQuestions();
            }

            alert('Data successfully imported!');
          } catch (err) {
            console.error('Import failed:', err);
            alert('Import failed: ' + err.message);
          }
          importFileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // Forecast Event Listeners
    setupForecastListeners();
  };

  const getLocalizedForecastEntry = (d, lang) => {
    const t = forecastTranslations[lang] || forecastTranslations.en;
    
    const dObj = new Date(d.date + 'T00:00:00');
    const dayVal = dObj.getDate();
    const monthIndex = dObj.getMonth();
    const yearVal = dObj.getFullYear();
    
    let dateFormatted = '';
    if (lang === 'en') {
      const mShort = t.monthsShort[monthIndex];
      dateFormatted = `${mShort} ${dayVal}, ${yearVal}`;
    } else {
      dateFormatted = `${dayVal} ${t.months[monthIndex]}, ${yearVal}`;
    }
    
    const weekdayFormatted = t.weekdaysShort[dObj.getDay()];
    
    const dayLabels = {
      en: "Day", hi: "दिन", bn: "দিন", as: "দিন", brx: "दिन", doi: "दिन", gom: "दीस", gu: "દિવસ",
      kn: "ದಿನ", ks: "دہ", mai: "दिन", ml: "ദിവസം", mni: "নুমিৎ", mr: "दिवस", ne: "दिन", or: "ଦିବସ",
      pa: "ਦਿਨ", sa: "दिवसः", sat: "ਮਾਹਾ", sd: "ڏينهن", ta: "நாள்", te: "రోజు", ur: "دن"
    };
    const dayWord = dayLabels[lang] || dayLabels.en;
    const cycleDayFormatted = `${dayWord} ${d.cycleDay}`;

    let labelFormatted = d.label;
    if (d.cycleDay <= (d.label.toLowerCase().includes('period') ? 10 : 0)) {
      const periodWord = t.status.Period || "Period";
      labelFormatted = `${periodWord} ${dayWord} ${d.cycleDay}`;
    } else {
      if (d.label === 'Follicular Phase') {
        labelFormatted = t.phases.follicular;
      } else if (d.label === 'Fertile Window') {
        labelFormatted = t.status.Fertile || 'Fertile Window';
      } else if (d.label === 'Peak Ovulation') {
        labelFormatted = t.status.Ovulation || 'Peak Ovulation';
      } else if (d.label === 'Luteal Phase') {
        labelFormatted = t.phases.luteal;
      }
    }
    
    const statusFormatted = t.status[d.status] || d.status;

    return {
      dateFormatted,
      weekdayFormatted,
      cycleDayFormatted,
      labelFormatted,
      statusFormatted
    };
  };

  const setupForecastListeners = () => {
    const searchInput = document.getElementById('forecast-search-input');
    const prevBtn = document.getElementById('forecast-prev-page-btn');
    const nextBtn = document.getElementById('forecast-next-page-btn');
    const exportCsvBtn = document.getElementById('export-forecast-csv');
    const exportJsonBtn = document.getElementById('export-forecast-json');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderForecastTable();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderForecastTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const searchInputVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let activeData = [];
        if (searchInputVal) {
          activeData = getFilteredSearchData(searchInputVal);
        } else {
          activeData = forecastDataset.filter(d => d.year === selectedYear);
        }
        const totalPages = Math.ceil(activeData.length / pageSize);
        if (currentPage < totalPages) {
          currentPage++;
          renderForecastTable();
        }
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        exportForecastCSV();
      });
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        exportForecastJSON();
      });
    }
  };

  const recalculateAndRefresh = () => {
    const savedTracker = localStorage.getItem('maa_tracker');
    const metrics = calculateMetricsFromHistory();
    
    if (metrics.lastPeriodStart) {
      const data = {
        lastPeriod: metrics.lastPeriodStart.toISOString().split('T')[0],
        cycleLength: metrics.averageCycleLength || (savedTracker ? JSON.parse(savedTracker).cycleLength : 28),
        periodDuration: metrics.averageDuration || (savedTracker ? JSON.parse(savedTracker).periodDuration : 5),
        age: savedTracker ? JSON.parse(savedTracker).age : null,
        height: savedTracker ? JSON.parse(savedTracker).height : null,
        weight: savedTracker ? JSON.parse(savedTracker).weight : null,
      };
      displayResult(data);
    } else if (savedTracker) {
      displayResult(JSON.parse(savedTracker));
    } else {
      document.getElementById('tracker-result').classList.add('hidden');
      const forecastCard = document.querySelector('.forecast-section');
      if (forecastCard) forecastCard.style.display = 'none';
      renderCalendar();
    }
  };

  const setupSymptomLogger = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    let symptomsLog = JSON.parse(localStorage.getItem('maa_symptoms') || '{}');
    const todaySymptoms = symptomsLog[todayStr] || [];

    const buttons = document.querySelectorAll('.tag-btn');
    const saveBtn = document.getElementById('save-symptoms-btn');
    const msg = document.getElementById('log-msg');

    // Highlight active symptoms based on saved data
    buttons.forEach(btn => {
      if (todaySymptoms.includes(btn.dataset.symptom)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }

      // Add clean click event listener to toggle active class visually
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const activeSymptoms = [];
        buttons.forEach(btn => {
          if (btn.classList.contains('active')) {
            activeSymptoms.push(btn.dataset.symptom);
          }
        });

        symptomsLog[todayStr] = activeSymptoms;
        localStorage.setItem('maa_symptoms', JSON.stringify(symptomsLog));
        
        // Success feedback
        const t = LangModule.getTranslations()?.tracker || {};
        msg.textContent = t.symptoms_saved_msg || "Symptom logs saved successfully!";
        
        // Trigger full updates
        renderCalendar();
        renderSymptomCorrelationDashboard();

        setTimeout(() => { msg.textContent = ""; }, 3000);
      });
    }
  };

  const calculateMetricsFromHistory = () => {
    const flowDates = [];
    for (const [dateStr, entry] of Object.entries(periodHistory)) {
      if (entry && entry.flow && entry.flow !== 'none') {
        flowDates.push(new Date(dateStr + 'T00:00:00'));
      }
    }

    if (flowDates.length === 0) {
      return {
        periods: [],
        averageCycleLength: null,
        averageDuration: null,
        variance: 0,
        lastPeriodStart: null
      };
    }

    flowDates.sort((a, b) => a - b);

    const periods = [];
    let currentPeriod = [flowDates[0]];

    for (let i = 1; i < flowDates.length; i++) {
      const prevDate = flowDates[i - 1];
      const currDate = flowDates[i];
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        currentPeriod.push(currDate);
      } else {
        periods.push(currentPeriod);
        currentPeriod = [currDate];
      }
    }
    periods.push(currentPeriod);

    const periodDetails = periods.map(p => {
      const start = p[0];
      const end = p[p.length - 1];
      const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return { start, end, duration };
    });

    const cycleLengths = [];
    for (let i = 1; i < periodDetails.length; i++) {
      const prevStart = periodDetails[i - 1].start;
      const currStart = periodDetails[i].start;
      const len = Math.round((currStart - prevStart) / (1000 * 60 * 60 * 24));
      cycleLengths.push(len);
    }

    const totalDuration = periodDetails.reduce((sum, p) => sum + p.duration, 0);
    const averageDuration = totalDuration / periodDetails.length;

    let averageCycleLength = null;
    let variance = 0;

    if (cycleLengths.length > 0) {
      const totalCycleLen = cycleLengths.reduce((sum, len) => sum + len, 0);
      averageCycleLength = totalCycleLen / cycleLengths.length;

      const sqDiffs = cycleLengths.map(len => Math.pow(len - averageCycleLength, 2));
      const avgSqDiff = sqDiffs.reduce((sum, diff) => sum + diff, 0) / cycleLengths.length;
      variance = Math.sqrt(avgSqDiff);
    }

    const lastPeriodStart = periodDetails.length > 0 ? periodDetails[periodDetails.length - 1].start : null;

    return {
      periods: periodDetails,
      averageCycleLength: averageCycleLength ? Math.round(averageCycleLength) : null,
      averageDuration: Math.round(averageDuration),
      variance: variance,
      lastPeriodStart: lastPeriodStart
    };
  };

  const calculateAndSave = (lastPeriodStr, cycleLength, periodDuration, age, height, weight) => {
    const lastDate = new Date(lastPeriodStr + 'T00:00:00');
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + cycleLength);

    const ovulationDate = new Date(nextDate);
    ovulationDate.setDate(nextDate.getDate() - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(ovulationDate.getDate() - 5);

    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(ovulationDate.getDate() + 1);

    const data = {
      lastPeriod: lastPeriodStr,
      cycleLength,
      periodDuration,
      age,
      height,
      weight,
      nextDate: nextDate.toISOString(),
      fertileStart: fertileStart.toISOString(),
      fertileEnd: fertileEnd.toISOString()
    };

    localStorage.setItem('maa_tracker', JSON.stringify(data));
    displayResult(data);
  };

  const displayResult = (data) => {
    const metrics = calculateMetricsFromHistory();
    
    // Resolve dynamic values
    const activeLastPeriod = metrics.lastPeriodStart 
      ? metrics.lastPeriodStart.toISOString().split('T')[0] 
      : data.lastPeriod;
    const activeCycleLength = metrics.averageCycleLength || data.cycleLength || 28;
    const activePeriodDuration = metrics.averageDuration || data.periodDuration || 5;
    const variance = metrics.variance;

    const lastDate = new Date(activeLastPeriod + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Loop forward to find next expected period start strictly in the future
    let nextDateObj = new Date(lastDate);
    if (nextDateObj <= today) {
      while (nextDateObj <= today) {
        nextDateObj.setDate(nextDateObj.getDate() + activeCycleLength);
      }
    }

    // Display expected next date with confidence interval/variance info
    let nextDateHtml = nextDateObj.toDateString();
    if (variance > 0) {
      const roundedVar = Math.round(variance);
      const varText = roundedVar === 1 ? "1 day" : `${roundedVar} days`;
      
      const windowStart = new Date(nextDateObj);
      windowStart.setDate(windowStart.getDate() - roundedVar);
      const windowEnd = new Date(nextDateObj);
      windowEnd.setDate(windowEnd.getDate() + roundedVar);

      nextDateHtml = `<span style="font-weight: 700;">${nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>` + 
                     `<span style="display: block; font-size: 0.8rem; font-weight: normal; color: var(--color-crimson); margin-top: 0.3rem;">` +
                     `<i data-lucide="shield-check" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i> ` +
                     `Expected Range: ${windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (±${varText} variance)` +
                     `</span>`;
    } else if (metrics.periods.length >= 2) {
      nextDateHtml = `<span style="font-weight: 700;">${nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>` + 
                     `<span style="display: block; font-size: 0.8rem; font-weight: normal; color: #155724; margin-top: 0.3rem;">` +
                     `<i data-lucide="check-circle" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i> ` +
                     `Consistent cycles detected (Dynamic Forecast)` +
                     `</span>`;
    } else {
      nextDateHtml = `<span style="font-weight: 700;">${nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>` + 
                     `<span style="display: block; font-size: 0.8rem; font-weight: normal; color: var(--color-text-muted); margin-top: 0.3rem;">` +
                     `Based on manual settings` +
                     `</span>`;
    }
    
    document.getElementById('next-date').innerHTML = nextDateHtml;

    // Estimated fertile window for the upcoming cycle
    const ovulationDate = new Date(nextDateObj);
    ovulationDate.setDate(nextDateObj.getDate() - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(ovulationDate.getDate() - 5);

    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(ovulationDate.getDate() + 1);

    document.getElementById('fertile-dates').textContent = `${fertileStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${fertileEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Calculate current cycle day relative to the most recent period start date in the past
    let mostRecentPeriodStart = new Date(lastDate);
    if (mostRecentPeriodStart < today) {
      while (true) {
        const nextProj = new Date(mostRecentPeriodStart);
        nextProj.setDate(nextProj.getDate() + activeCycleLength);
        if (nextProj > today) break;
        mostRecentPeriodStart = nextProj;
      }
    }

    const diffTimeSinceLast = today - mostRecentPeriodStart;
    const cycleDay = Math.floor(diffTimeSinceLast / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('current-cycle-day').textContent = cycleDay;

    // Resolve current phase info
    const ovulationDay = activeCycleLength - 14;
    const activeFertileStart = ovulationDay - 5;
    const activeFertileEnd = ovulationDay + 1;

    let dayInCycle = ((cycleDay - 1) % activeCycleLength) + 1;
    
    let phaseKey;
    if (dayInCycle <= activePeriodDuration) phaseKey = 'menstrual';
    else if (dayInCycle < activeFertileStart) phaseKey = 'follicular';
    else if (dayInCycle <= activeFertileEnd) phaseKey = 'ovulation';
    else phaseKey = 'luteal';

    const phase = PHASES[phaseKey];
    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const phaseTrans = phaseTranslations[activeLang]?.[phaseKey] || phaseTranslations.en[phaseKey];

    document.getElementById('phaseIcon').innerHTML = phase.icon;
    document.getElementById('current-phase-name').textContent = phaseTrans.label;
    document.getElementById('current-phase-insight').textContent = phaseTrans.desc;

    // Render Circular Cycle Ring
    const svg = document.getElementById('cycle-ring-svg');
    if (svg) {
      const totalDays = activeCycleLength;
      const phasesArr = [
        { name: 'menstrual', start: 1, end: activePeriodDuration, color: PHASES.menstrual.color },
        { name: 'follicular', start: activePeriodDuration + 1, end: activeFertileStart - 1, color: PHASES.follicular.color },
        { name: 'ovulation', start: activeFertileStart, end: activeFertileEnd, color: PHASES.ovulation.color },
        { name: 'luteal', start: activeFertileEnd + 1, end: totalDays, color: PHASES.luteal.color }
      ];

      const radius = 90;
      const circumference = 2 * Math.PI * radius;
      const cx = 100;
      const cy = 100;

      let html = '';
      let currentOffset = 0;

      phasesArr.forEach(p => {
        const lengthInDays = p.end - p.start + 1;
        if (lengthInDays <= 0) return;
        const fraction = lengthInDays / totalDays;
        const dashLength = fraction * circumference;
        const gap = 3;
        
        html += `<circle 
          cx="${cx}" cy="${cy}" r="${radius}" 
          class="ring-segment" 
          stroke="${p.color}" 
          stroke-dasharray="${Math.max(0, dashLength - gap)} ${circumference}" 
          stroke-dashoffset="${-currentOffset}"
        ></circle>`;
        
        currentOffset += dashLength;
      });

      // Day Marker
      const dayFraction = (dayInCycle - 0.5) / totalDays; 
      const dayAngle = dayFraction * 360;
      const markerX = cx + radius * Math.cos(dayAngle * Math.PI / 180);
      const markerY = cy + radius * Math.sin(dayAngle * Math.PI / 180);
      
      html += `<circle cx="${markerX}" cy="${markerY}" r="7" class="ring-day-marker"></circle>`;
      svg.innerHTML = html;
    }

    // Countdown calculation
    const diffTimeCountdown = nextDateObj - today;
    const diffDaysCountdown = Math.ceil(diffTimeCountdown / (1000 * 60 * 60 * 24));
    document.getElementById('days-countdown').textContent = diffDaysCountdown >= 0 ? diffDaysCountdown : 0;

    // UNICEF Health Insight
    const insightBox = document.getElementById('unicef-insight-box');
    const insightText = document.getElementById('unicef-insight-text');
    if (data.height && data.weight && insightBox && insightText) {
      const heightInM = data.height / 100;
      const bmi = data.weight / (heightInM * heightInM);
      let message = "";
      let titleHtml = "";
      let borderColor = "";

      if (activeLang === 'hi') {
        if (bmi < 18.5) {
          message = "यूनिसेफ (UNICEF) के दिशानिर्देशों के अनुसार, कम वजन (BMI < 18.5) के कारण मासिक धर्म में अनियमितता हो सकती है। पोषक तत्वों से भरपूर आहार लें।";
          titleHtml = `<i data-lucide="info"></i> स्वास्थ्य अंतर्दृष्टि (UNICEF) <span class="badge" style="background: #FFF3CD; color: #856404; margin-left: auto;">कम वजन</span>`;
          borderColor = "#FFC107";
        } else if (bmi >= 18.5 && bmi <= 24.9) {
          message = "यूनिसेफ (UNICEF) के दिशानिर्देशों के अनुसार, स्वस्थ वजन बनाए रखना नियमित मासिक धर्म चक्र और समग्र प्रजनन स्वास्थ्य का समर्थन करता है।";
          titleHtml = `<i data-lucide="info"></i> स्वास्थ्य अंतर्दृष्टि (UNICEF) <span class="badge" style="background: #D4EDDA; color: #155724; margin-left: auto;">स्वस्थ वजन</span>`;
          borderColor = "#28A745";
        } else {
          message = "यूनिसेफ (UNICEF) के दिशानिर्देशों के अनुसार, अधिक वजन (BMI ≥ 25) से चक्र की अनियमितताओं और पीसीओएस (PMOS) जैसे हार्मोनल असंतुलन का खतरा बढ़ सकता है।";
          titleHtml = `<i data-lucide="info"></i> स्वास्थ्य अंतर्दृष्टि (UNICEF) <span class="badge" style="background: #F8D7DA; color: #721C24; margin-left: auto;">अधिक वजन</span>`;
          borderColor = "#DC3545";
        }
      } else if (activeLang === 'bn') {
        if (bmi < 18.5) {
          message = "ইউনিসেফ (UNICEF) নির্দেশিকা অনুসারে, কম ওজন (BMI < ১৮.৫) অনিয়মিত ঋতুচক্রের কারণ হতে পারে। পুষ্টিসমৃদ্ধ খাবার নিশ্চিত করুন।";
          titleHtml = `<i data-lucide="info"></i> স্বাস্থ্য অন্তর্দৃষ্টি (UNICEF) <span class="badge" style="background: #FFF3CD; color: #856404; margin-left: auto;">কম ওজন</span>`;
          borderColor = "#FFC107";
        } else if (bmi >= 18.5 && bmi <= 24.9) {
          message = "ইউনিসেফ (UNICEF) নির্দেশিকা অনুসারে, স্বাস্থ্যকর ওজন বজায় রাখা নিয়মিত ঋতুচক্র এবং সামগ্রিক প্রজনন স্বাস্থ্যকে সহায়তা করে।";
          titleHtml = `<i data-lucide="info"></i> স্বাস্থ্য অন্তর্দৃষ্টি (UNICEF) <span class="badge" style="background: #D4EDDA; color: #155724; margin-left: auto;">স্বাভাবিক ওজন</span>`;
          borderColor = "#28A745";
        } else {
          message = "ইউনিসেফ (UNICEF) নির্দেশিকা অনুসারে, অতিরিক্ত ওজন (BMI ≥ ২৫) চক্রের অনিয়ম এবং PMOS-এর মতো হরমোনের ভারসাম্যের ঝুঁকি বাড়িয়ে তুলতে পারে।";
          titleHtml = `<i data-lucide="info"></i> স্বাস্থ্য অন্তর্দৃষ্টি (UNICEF) <span class="badge" style="background: #F8D7DA; color: #721C24; margin-left: auto;">অতিরিক্ত ওজন</span>`;
          borderColor = "#DC3545";
        }
      } else {
        if (bmi < 18.5) {
          message = "According to UNICEF guidelines, low body weight (BMI < 18.5) can lead to irregular cycles or amenorrhea. Ensure a nutrient-rich diet.";
          titleHtml = `<i data-lucide="info"></i> Health Insight (UNICEF) <span class="badge" style="background: #FFF3CD; color: #856404; margin-left: auto;">Underweight</span>`;
          borderColor = "#FFC107";
        } else if (bmi >= 18.5 && bmi <= 24.9) {
          message = "According to UNICEF guidelines, maintaining a healthy weight supports regular menstrual cycles and overall reproductive health.";
          titleHtml = `<i data-lucide="info"></i> Health Insight (UNICEF) <span class="badge" style="background: #D4EDDA; color: #155724; margin-left: auto;">Healthy Weight</span>`;
          borderColor = "#28A745";
        } else {
          message = "According to UNICEF guidelines, higher weight (BMI ≥ 25) can increase the risk of cycle irregularities and hormonal imbalances like PMOS.";
          titleHtml = `<i data-lucide="info"></i> Health Insight (UNICEF) <span class="badge" style="background: #F8D7DA; color: #721C24; margin-left: auto;">Overweight</span>`;
          borderColor = "#DC3545";
        }
      }
      
      insightText.textContent = message;
      document.getElementById('unicef-insight-title').innerHTML = titleHtml;
      insightBox.style.borderLeftColor = borderColor;
      insightBox.style.display = 'block';
    } else if (insightBox) {
      insightBox.style.display = 'none';
    }

    // Trigger Lucide icons redraw to handle dynamically created icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    document.getElementById('tracker-result').classList.remove('hidden');

    // Populate 10-Year Forecast Dashboard
    updateForecastDashboard(activeLastPeriod, activeCycleLength, activePeriodDuration);

    // Render calendar
    renderCalendar();

    // Render Insights & Symptom Dashboard
    renderCycleInsightsGraph();
    renderSymptomCorrelationDashboard();

    // Check and trigger private cycle reminders
    if (typeof RemindersModule !== 'undefined') {
      RemindersModule.checkAndTriggerCycleReminders(activeLastPeriod, activeCycleLength, activePeriodDuration);
    }
  };

  // ----- 10-Year Forecast Calculations & Rendering -----

  const generate10YearForecast = (baseDateStr, cycleLength, periodDuration) => {
    const baseDate = new Date(baseDateStr + 'T00:00:00');
    const forecast = [];
    const startYear = 2026;
    const endYear = 2036;

    const startDate = new Date(startYear, 0, 1);
    const endDate = new Date(endYear, 11, 31);

    if (!cycleLength || cycleLength <= 0) cycleLength = 28;
    if (!periodDuration || periodDuration <= 0) periodDuration = 5;

    let currentDate = new Date(startDate);
    const oneDayMs = 1000 * 60 * 60 * 24;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const ovulationDay = cycleLength - 14;
    const fertileStart = ovulationDay - 5;
    const fertileEnd = ovulationDay + 1;

    while (currentDate <= endDate) {
      const diffTime = currentDate.getTime() - baseDate.getTime();
      const diffDays = Math.round(diffTime / oneDayMs);
      const cycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength;
      const cycleDay1 = cycleDay + 1;

      let phaseKey = '';
      let status = 'Normal';
      let label = 'Normal';

      if (cycleDay1 <= periodDuration) {
        phaseKey = 'menstrual';
        status = 'Period';
        label = 'Period Day ' + cycleDay1;
      } else if (cycleDay1 < fertileStart) {
        phaseKey = 'follicular';
        status = 'Normal';
        label = 'Follicular Phase';
      } else if (cycleDay1 <= fertileEnd) {
        phaseKey = 'ovulation';
        status = (cycleDay1 === ovulationDay) ? 'Ovulation' : 'Fertile';
        label = (cycleDay1 === ovulationDay) ? 'Peak Ovulation' : 'Fertile Window';
      } else {
        phaseKey = 'luteal';
        status = 'Normal';
        label = 'Luteal Phase';
      }

      const yyyy = currentDate.getFullYear();
      const mmVal = currentDate.getMonth() + 1;
      const ddVal = currentDate.getDate();
      const dateStr = `${yyyy}-${String(mmVal).padStart(2, '0')}-${String(ddVal).padStart(2, '0')}`;

      forecast.push({
        date: dateStr,
        year: yyyy,
        month: monthNames[currentDate.getMonth()],
        monthNum: mmVal,
        day: ddVal,
        weekday: weekdayNames[currentDate.getDay()],
        cycleDay: cycleDay1,
        phase: phaseKey,
        status: status,
        label: label
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return forecast;
  };

  const updateForecastDashboard = (baseDateStr, cycleLength, periodDuration) => {
    const forecastCard = document.querySelector('.forecast-section');
    if (forecastCard) forecastCard.style.display = 'block';

    forecastDataset = generate10YearForecast(baseDateStr, cycleLength, periodDuration);

    const totalCycles = forecastDataset.filter(d => d.cycleDay === 1).length;
    const totalFlowDays = forecastDataset.filter(d => d.status === 'Period').length;
    const totalOvulations = forecastDataset.filter(d => d.status === 'Ovulation').length;

    document.getElementById('forecast-total-cycles').textContent = totalCycles;
    document.getElementById('forecast-total-flow-days').textContent = totalFlowDays;
    document.getElementById('forecast-total-ovulations').textContent = totalOvulations;

    const tabsContainer = document.getElementById('forecast-year-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      for (let yr = 2026; yr <= 2036; yr++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `year-tab-btn ${yr === selectedYear ? 'active' : ''}`;
        btn.textContent = yr;
        btn.addEventListener('click', () => {
          selectedYear = yr;
          document.querySelectorAll('.year-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('forecast-selected-year').textContent = yr;
          currentPage = 1;
          renderForecastTimeline();
          renderForecastTable();
        });
        tabsContainer.appendChild(btn);
      }
    }

    renderForecastTimeline();
    renderForecastTable();
  };


  const getFilteredSearchData = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return forecastDataset;

    return forecastDataset.filter(d => {
      if (d.date.includes(q) || d.year.toString().includes(q)) return true;

      for (const lang of ['en', 'hi', 'bn']) {
        const loc = getLocalizedForecastEntry(d, lang);
        if (
          loc.dateFormatted.toLowerCase().includes(q) ||
          loc.weekdayFormatted.toLowerCase().includes(q) ||
          loc.cycleDayFormatted.toLowerCase().includes(q) ||
          loc.labelFormatted.toLowerCase().includes(q) ||
          loc.statusFormatted.toLowerCase().includes(q)
        ) {
          return true;
        }
      }
      return false;
    });
  };

  const renderForecastTimeline = () => {
    const timelineContainer = document.getElementById('forecast-timeline');
    if (!timelineContainer) return;

    const filteredYearData = forecastDataset.filter(d => d.year === selectedYear);

    const metrics = calculateMetricsFromHistory();
    const savedTracker = localStorage.getItem('maa_tracker');
    const trackerObj = savedTracker ? JSON.parse(savedTracker) : {};
    const cycleLength = metrics.averageCycleLength || trackerObj.cycleLength || 28;
    const ovulationDay = cycleLength - 14;
    const fertileStart = ovulationDay - 5;

    const timelineEvents = filteredYearData.filter(d => {
      return d.cycleDay === 1 || d.cycleDay === fertileStart || d.cycleDay === ovulationDay;
    });

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';

    if (timelineEvents.length === 0) {
      const msg = activeLang === 'hi' 
        ? `${selectedYear} के लिए कोई पूर्वानुमानित डेटा उपलब्ध नहीं है।` 
        : activeLang === 'bn' 
        ? `${selectedYear} এর জন্য কোনো পূর্বাভাসের তথ্য উপলব্ধ নেই।` 
        : `No predicted data available for ${selectedYear}.`;
      timelineContainer.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; padding: 1.5rem;">${msg}</div>`;
    } else {
      timelineContainer.innerHTML = timelineEvents.map(ev => {
        let itemClass = 'timeline-forecast-item';
        let badgeClass = 'timeline-phase-badge';
        let icon = '';

        if (ev.cycleDay === 1) {
          badgeClass += ' period';
          icon = `<i data-lucide="droplet" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>`;
        } else {
          itemClass += ' fertile';
          badgeClass += ' fertile';
          if (ev.cycleDay === ovulationDay) {
            icon = `<i data-lucide="sparkles" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>`;
          } else {
            icon = `<i data-lucide="calendar" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>`;
          }
        }

        const loc = getLocalizedForecastEntry(ev, activeLang);

        return `
          <div class="${itemClass}">
            <div>
              <span class="timeline-date-label">${loc.dateFormatted}</span>
              <span style="color: var(--color-text-muted); font-size: 0.8rem; margin-left: 0.5rem;">(${loc.weekdayFormatted})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="${badgeClass}">
                ${icon}${loc.labelFormatted}
              </span>
            </div>
          </div>
        `;
      }).join('');

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  };

  const renderForecastTable = () => {
    const tableBody = document.getElementById('forecast-table-body');
    if (!tableBody) return;

    const searchInput = document.getElementById('forecast-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    let activeData = [];
    if (searchQuery) {
      activeData = getFilteredSearchData(searchQuery);
    } else {
      activeData = forecastDataset.filter(d => d.year === selectedYear);
    }

    const totalPages = Math.ceil(activeData.length / pageSize);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageData = activeData.slice(startIdx, endIdx);

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = forecastTranslations[activeLang] || forecastTranslations.en;

    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">${t.noRecords}</td></tr>`;
    } else {
      tableBody.innerHTML = pageData.map(d => {
        let pillClass = 'table-status-pill';
        if (d.status === 'Period') pillClass += ' period';
        else if (d.status === 'Fertile' || d.status === 'Ovulation') pillClass += ' fertile';
        else pillClass += ' normal';

        const loc = getLocalizedForecastEntry(d, activeLang);

        return `
          <tr style="border-bottom: 1px solid var(--red-50);">
            <td style="padding: 0.6rem 1rem; font-weight: 600; color: var(--color-obsidian);">${loc.dateFormatted}</td>
            <td style="padding: 0.6rem 1rem; color: var(--color-text-muted);">${loc.weekdayFormatted}</td>
            <td style="padding: 0.6rem 1rem; font-weight: 600; color: var(--color-crimson);">${loc.cycleDayFormatted}</td>
            <td style="padding: 0.6rem 1rem;">
              <span class="${pillClass}">${loc.labelFormatted}</span>
            </td>
          </tr>
        `;
      }).join('');
    }

    const pageInfo = document.getElementById('forecast-page-info');
    if (pageInfo) {
      pageInfo.textContent = t.pageOf.replace('{page}', currentPage).replace('{total}', totalPages || 1);
    }

    const prevBtn = document.getElementById('forecast-prev-page-btn');
    const nextBtn = document.getElementById('forecast-next-page-btn');

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages <= 1);
  };

  const exportForecastCSV = () => {
    if (forecastDataset.length === 0) {
      alert("Please log or configure your cycle to generate forecast data.");
      return;
    }
    const headers = ["Date", "Year", "Month", "Day of Week", "Cycle Day", "Phase Name", "Flow/Fertility Status"];
    const rows = forecastDataset.map(d => [
      d.date,
      d.year,
      d.month,
      d.weekday,
      d.cycleDay,
      PHASES[d.phase]?.label || d.phase,
      d.label
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maa_10_year_forecast_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportForecastJSON = () => {
    if (forecastDataset.length === 0) {
      alert("Please log or configure your cycle to generate forecast data.");
      return;
    }
    const jsonString = JSON.stringify(forecastDataset, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maa_10_year_forecast_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ----- Existing Calendar Logic Modified For Accuracy -----

  const renderCalendar = () => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const monthNames = forecastTranslations[activeLang]?.months || [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthYearHeader = document.getElementById('calendar-month-year');
    if (monthYearHeader) {
      monthYearHeader.textContent = `${monthNames[month]} ${year}`;
    }

    const weekdaysContainer = document.querySelector('.calendar-weekdays');
    if (weekdaysContainer) {
      const weekdaysList = forecastTranslations[activeLang]?.calendarWeekdays || ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      weekdaysContainer.innerHTML = weekdaysList.map(w => `<div>${w}</div>`).join('');
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const daysContainer = document.getElementById('calendar-days');
    if (!daysContainer) return;

    daysContainer.innerHTML = '';

    const savedTracker = localStorage.getItem('maa_tracker');
    const trackerData = savedTracker ? JSON.parse(savedTracker) : null;
    const symptomsLog = JSON.parse(localStorage.getItem('maa_symptoms') || '{}');
    
    const metrics = calculateMetricsFromHistory();
    const hasHistory = metrics.lastPeriodStart !== null;
    const activeLastPeriod = hasHistory 
      ? metrics.lastPeriodStart.toISOString().split('T')[0] 
      : (trackerData ? trackerData.lastPeriod : null);
    const activeCycleLength = metrics.averageCycleLength || (trackerData ? trackerData.cycleLength : 28);
    const activePeriodDuration = metrics.averageDuration || (trackerData ? trackerData.periodDuration : 5);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      daysContainer.appendChild(emptyCell);
    }

    for (let day = 1; day <= numberOfDays; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);

      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      dayDiv.textContent = day;
      dayDiv.dataset.date = dateStr;

      if (dayDate.getTime() === today.getTime()) {
        dayDiv.classList.add('today');
      }

      if (selectedDateStr === dateStr) {
        dayDiv.classList.add('selected-day');
      }

      const historyEntry = periodHistory[dateStr];
      let hasLoggedFlow = false;

      if (historyEntry) {
        const flow = historyEntry.flow;
        if (flow && flow !== 'none') {
          dayDiv.classList.add(`flow-${flow}`);
          hasLoggedFlow = true;
        }
      }

      if (!hasLoggedFlow && activeLastPeriod) {
        const lastPeriodDate = new Date(activeLastPeriod + 'T00:00:00');
        lastPeriodDate.setHours(0, 0, 0, 0);

        const diffTime = dayDate - lastPeriodDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const cycleDay = ((diffDays % activeCycleLength) + activeCycleLength) % activeCycleLength;
        const cycleDay1 = cycleDay + 1;

        if (cycleDay1 <= activePeriodDuration) {
          dayDiv.classList.add('predicted-period');
        }

        const ovulationDay = activeCycleLength - 14;
        const fertileStart = ovulationDay - 5;
        const fertileEnd = ovulationDay + 1;

        if (cycleDay1 >= fertileStart && cycleDay1 <= fertileEnd) {
          dayDiv.classList.add('fertile-day');
        }
      }

      const hasSpotting = historyEntry && historyEntry.spotting && historyEntry.spotting !== 'none';
      const daySymptoms = symptomsLog[dateStr] || [];
      const hasSymptoms = daySymptoms.length > 0;

      if (hasSpotting || hasSymptoms) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'spotting-dots';

        if (hasSpotting) {
          const dotSpan = document.createElement('span');
          dotSpan.className = `spot-${historyEntry.spotting}`;
          dotSpan.title = `Spotting: ${historyEntry.spotting}`;
          dotsContainer.appendChild(dotSpan);
        }

        if (hasSymptoms) {
          const dotSpan = document.createElement('span');
          dotSpan.className = 'spot-symptom';
          dotSpan.title = `Symptoms: ${daySymptoms.join(', ')}`;
          dotsContainer.appendChild(dotSpan);
        }

        dayDiv.appendChild(dotsContainer);
      }

      dayDiv.addEventListener('click', () => {
        selectDate(dateStr);
      });

      daysContainer.appendChild(dayDiv);
    }
  };

  const selectDate = (dateStr) => {
    selectedDateStr = dateStr;

    document.querySelectorAll('.calendar-day').forEach(cell => {
      if (cell.dataset.date === dateStr) {
        cell.classList.add('selected-day');
      } else {
        cell.classList.remove('selected-day');
      }
    });

    const dateParts = dateStr.split('-');
    const dateObj = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
    const selectedDateLabel = document.getElementById('log-selected-date');
    if (selectedDateLabel) {
      selectedDateLabel.textContent = dateObj.toDateString();
    }

    const historyEntry = periodHistory[dateStr] || { flow: 'none', spotting: 'none' };

    document.querySelectorAll('.flow-btn').forEach(btn => {
      if (btn.dataset.flow === (historyEntry.flow || 'none')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.spot-btn').forEach(btn => {
      if (btn.dataset.spotting === (historyEntry.spotting || 'none')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const logPanel = document.getElementById('day-log-panel');
    if (logPanel) {
      logPanel.style.display = 'block';
      logPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const exportData = () => {
    const dataToExport = {
      maa_tracker: JSON.parse(localStorage.getItem('maa_tracker') || 'null'),
      maa_period_history: JSON.parse(localStorage.getItem('maa_period_history') || '{}'),
      maa_symptoms: JSON.parse(localStorage.getItem('maa_symptoms') || '{}'),
      maa_qa: JSON.parse(localStorage.getItem('maa_qa') || '[]'),
      maa_qa_submissions: JSON.parse(localStorage.getItem('maa_qa_submissions') || '[]')
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `maa_period_tracker_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadFromStorage = () => {
    const savedHistory = localStorage.getItem('maa_period_history');
    if (savedHistory) {
      periodHistory = JSON.parse(savedHistory);
    } else {
      periodHistory = {};
    }

    const saved = localStorage.getItem('maa_tracker');
    if (saved) {
      const data = JSON.parse(saved);
      document.getElementById('last-period').value = data.lastPeriod || '';
      document.getElementById('cycle-length').value = data.cycleLength || 28;
      
      if(data.periodDuration) document.getElementById('period-duration').value = data.periodDuration;
      if(data.age) document.getElementById('user-age').value = data.age;
      if(data.height) {
        const totalInches = data.height / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        document.getElementById('user-height-ft').value = ft;
        document.getElementById('user-height-in').value = inches;
      }
      if(data.weight) document.getElementById('user-weight').value = data.weight;
    }

    recalculateAndRefresh();
  };

  // ----- High-Impact Insights Dashboard Visualizers -----

  const renderCycleInsightsGraph = () => {
    const chartContainer = document.getElementById('cycle-insights-chart-container');
    if (!chartContainer) return;

    const metrics = calculateMetricsFromHistory();
    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = LangModule.getTranslations()?.tracker || {};

    const emptyTitle = t.cycle_history_empty || "Please log at least two periods in the calendar above to see your cycle history chart.";

    const periodDetails = metrics.periods || [];
    const cycleLengths = [];

    for (let i = 1; i < periodDetails.length; i++) {
      const prevStart = periodDetails[i - 1].start;
      const currStart = periodDetails[i].start;
      const len = Math.round((currStart - prevStart) / (1000 * 60 * 60 * 24));
      
      const startStr = prevStart.toLocaleDateString(activeLang, { month: 'short', day: 'numeric' });
      cycleLengths.push({
        label: startStr,
        length: len
      });
    }

    const savedTracker = localStorage.getItem('maa_tracker');
    if (cycleLengths.length === 0 && savedTracker) {
      // Generate simulated past cycles based on tracker input so it's immediately unlocked
      const data = JSON.parse(savedTracker);
      const cycleLen = parseInt(data.cycleLength) || 28;
      const lastPeriodDate = data.lastPeriod ? new Date(data.lastPeriod + 'T00:00:00') : new Date();
      
      for (let i = 4; i >= 1; i--) {
        const d = new Date(lastPeriodDate);
        d.setDate(d.getDate() - (i * cycleLen));
        const startStr = d.toLocaleDateString(activeLang, { month: 'short', day: 'numeric' });
        cycleLengths.push({
          label: startStr,
          length: cycleLen + (i % 2 === 0 ? 1 : -1) // subtle realistic variation
        });
      }
    }

    const displayCycles = cycleLengths.slice(-6);

    if (displayCycles.length < 1) {
      // Empty preview state! Render blurred SVG in the background with lock overlay
      const mockCycles = [
        { label: "Cycle 1", length: 27 },
        { label: "Cycle 2", length: 29 },
        { label: "Cycle 3", length: 28 },
        { label: "Cycle 4", length: 30 }
      ];
      
      chartContainer.innerHTML = `
        <div class="insights-empty-overlay">
          <i data-lucide="lock" style="width: 24px; height: 24px;"></i>
          <p>${emptyTitle}</p>
        </div>
        <div style="opacity: 0.15; filter: blur(2px); width: 100%; pointer-events: none;">
          ${generateSVGForCycles(mockCycles, 28.5)}
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const avgLen = metrics.averageCycleLength || (savedTracker ? JSON.parse(savedTracker).cycleLength : 28);
    chartContainer.innerHTML = generateSVGForCycles(displayCycles, avgLen);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  const generateSVGForCycles = (cycles, avg) => {
    const width = 500;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const lengths = cycles.map(c => c.length);
    const maxLen = Math.max(35, ...lengths, avg) + 5;
    const minLen = 0;

    let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="font-family: inherit;">`;

    svgHtml += `
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="var(--color-crimson)" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
    `;

    const gridDays = [21, 28, 35];
    gridDays.forEach(days => {
      if (days < maxLen) {
        const y = paddingTop + chartHeight - ((days - minLen) / (maxLen - minLen)) * chartHeight;
        svgHtml += `
          <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#F43F5E" stroke-dasharray="3,3" stroke-opacity="0.15"></line>
          <text x="${paddingLeft - 8}" y="${y + 3}" text-anchor="end" font-size="9" font-weight="700" fill="var(--color-text-muted)">${days}d</text>
        `;
      }
    });

    const avgY = paddingTop + chartHeight - ((avg - minLen) / (maxLen - minLen)) * chartHeight;
    svgHtml += `
      <line x1="${paddingLeft}" y1="${avgY}" x2="${width - paddingRight}" y2="${avgY}" stroke="var(--color-primary)" stroke-width="1.5" stroke-dasharray="6,3" stroke-opacity="0.75" style="z-index: 5;"></line>
      <text x="${width - paddingRight - 5}" y="${avgY - 5}" text-anchor="end" font-size="9.5" font-weight="700" fill="var(--color-primary)">Avg: ${Math.round(avg)} days</text>
    `;

    const barCount = cycles.length;
    const barSpacing = chartWidth / barCount;
    const barWidth = Math.min(45, barSpacing * 0.55);

    cycles.forEach((c, index) => {
      const barHeight = ((c.length - minLen) / (maxLen - minLen)) * chartHeight;
      const x = paddingLeft + (index * barSpacing) + (barSpacing - barWidth) / 2;
      const y = paddingTop + chartHeight - barHeight;

      svgHtml += `
        <g class="chart-bar-group">
          <title>${c.length} days (Started: ${c.label})</title>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(4, barHeight)}" fill="url(#barGradient)" rx="5" ry="5"></rect>
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--color-obsidian)">${c.length}</text>
          <text x="${x + barWidth / 2}" y="${paddingTop + chartHeight + 16}" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--color-text-muted)">${c.label}</text>
        </g>
      `;
    });

    svgHtml += `
      <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" stroke="var(--red-200)" stroke-width="1"></line>
    `;

    svgHtml += `</svg>`;
    return svgHtml;
  };

  const getCycleDayForDate = (dateObj, periodStarts, defaultLastPeriod, activeCycleLength) => {
    let baseStart = null;
    let cycleLen = activeCycleLength || 28;

    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    if (periodStarts.length > 0) {
      let matchingStart = null;
      let nextStart = null;

      for (let i = 0; i < periodStarts.length; i++) {
        const start = new Date(periodStarts[i]);
        start.setHours(0, 0, 0, 0);
        if (start <= d) {
          matchingStart = start;
          nextStart = periodStarts[i + 1] ? new Date(periodStarts[i + 1]) : null;
        } else {
          break;
        }
      }

      if (matchingStart) {
        if (!nextStart || d < nextStart) {
          const diffTime = d - matchingStart;
          return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
      }
    }

    if (defaultLastPeriod) {
      baseStart = new Date(defaultLastPeriod + 'T00:00:00');
    } else {
      // Fallback: If no tracker and no calendar periods, assume a cycle starting 14 days before today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      baseStart = new Date(today);
      baseStart.setDate(baseStart.getDate() - 14);
    }

    baseStart.setHours(0, 0, 0, 0);

    if (d >= baseStart) {
      const diffTime = d - baseStart;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return (diffDays % cycleLen) + 1;
    } else {
      // For past dates before the fallback/base start, map backward safely
      const diffTime = baseStart - d;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return ((cycleLen - (diffDays % cycleLen)) % cycleLen) + 1;
    }
  };

  const renderSymptomCorrelationDashboard = () => {
    const container = document.getElementById('symptom-correlation-container');
    const insightsBox = document.getElementById('symptom-insights-box');
    const insightsText = document.getElementById('symptom-insights-text');
    if (!container) return;

    const symptomsLog = JSON.parse(localStorage.getItem('maa_symptoms') || '{}');
    const metrics = calculateMetricsFromHistory();
    const periodStarts = metrics.periods.map(p => p.start);

    const savedTracker = localStorage.getItem('maa_tracker');
    let defaultLastPeriod = null;
    let activeCycleLength = 28;

    if (savedTracker) {
      const data = JSON.parse(savedTracker);
      defaultLastPeriod = data.lastPeriod;
      activeCycleLength = data.cycleLength || 28;
    }

    const trackedSymptoms = ["cramps", "headache", "bloating", "fatigue", "happy", "sad"];

    const binCounts = {};
    trackedSymptoms.forEach(s => {
      binCounts[s] = [0, 0, 0, 0, 0];
    });

    let totalLogsCount = 0;

    for (const [dateStr, symptoms] of Object.entries(symptomsLog)) {
      if (!symptoms || symptoms.length === 0) continue;
      
      const dateObj = new Date(dateStr + 'T00:00:00');
      const cycleDay = getCycleDayForDate(dateObj, periodStarts, defaultLastPeriod, activeCycleLength);
      
      if (cycleDay !== null && cycleDay >= 1) {
        let binIdx = 4;
        if (cycleDay <= 5) binIdx = 0;
        else if (cycleDay <= 11) binIdx = 1;
        else if (cycleDay <= 16) binIdx = 2;
        else if (cycleDay <= 22) binIdx = 3;

        symptoms.forEach(s => {
          if (binCounts[s] !== undefined) {
            binCounts[s][binIdx]++;
            totalLogsCount++;
          }
        });
      }
    }

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = LangModule.getTranslations()?.tracker || {};

    const symptomLabels = {
      cramps: t.symptom_cramps || "Cramps",
      headache: t.symptom_headache || "Headache",
      bloating: t.symptom_bloating || "Bloating",
      fatigue: t.symptom_fatigue || "Fatigue",
      happy: t.symptom_happy || "Happy",
      sad: t.symptom_sad || "Sad"
    };

    const phaseLabels = [
      activeLang === 'hi' ? 'मासिक (1-5)' : activeLang === 'bn' ? 'ঋতুস্রাব (১-৫)' : 'Menstrual (1-5)',
      activeLang === 'hi' ? 'फॉलिक्युलर (6-11)' : activeLang === 'bn' ? 'ফলিকিউলার (৬-১১)' : 'Follicular (6-11)',
      activeLang === 'hi' ? 'अंडोत्सर्ग (12-16)' : activeLang === 'bn' ? 'ডিম্বস্ফোটন (১২-১৬)' : 'Ovulatory (12-16)',
      activeLang === 'hi' ? 'ल्यूटियल (17-22)' : activeLang === 'bn' ? 'آর্লি লিউটিয়াল (১৭-২২)' : 'Luteal (17-22)',
      activeLang === 'hi' ? 'पीएमएस (23-28+)' : activeLang === 'bn' ? 'লেট লিউটিয়াল (২৩-২৮+)' : 'PMS (23-28+)'
    ];

    const emptyMsg = t.symptom_correlation_empty || "Log symptoms using the Quick Log or Calendar to visualize your symptom patterns.";

    if (totalLogsCount === 0) {
      const mockBinCounts = {
        cramps: [4, 0, 0, 1, 3],
        headache: [1, 0, 1, 2, 2],
        bloating: [1, 0, 0, 3, 5],
        fatigue: [3, 1, 0, 2, 4],
        happy: [0, 4, 5, 1, 0],
        sad: [2, 0, 0, 1, 4]
      };

      container.innerHTML = `
        <div class="insights-empty-overlay">
          <i data-lucide="lock" style="width: 24px; height: 24px;"></i>
          <p>${emptyMsg}</p>
        </div>
        <div class="symptom-heatmap-wrapper" style="opacity: 0.15; filter: blur(2.5px); pointer-events: none;">
          ${generateHeatmapHtml(mockBinCounts, phaseLabels, symptomLabels)}
        </div>
      `;
      if (insightsBox) insightsBox.style.display = 'none';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="symptom-heatmap-wrapper">
        ${generateHeatmapHtml(binCounts, phaseLabels, symptomLabels)}
      </div>
    `;

    const smartInsight = calculateSmartInsight(binCounts, phaseLabels, symptomLabels, activeLang);
    if (insightsBox && insightsText && smartInsight) {
      insightsText.innerHTML = smartInsight;
      insightsBox.style.display = 'block';
    } else if (insightsBox) {
      insightsBox.style.display = 'none';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  const generateHeatmapHtml = (binCounts, phaseLabels, symptomLabels) => {
    let html = `<div class="symptom-heatmap-grid">`;
    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const headerTitle = activeLang === 'hi' ? 'लक्षण' : activeLang === 'bn' ? 'লক্ষণ' : 'Symptom';
    
    html += `<div class="heatmap-header-cell first">${headerTitle}</div>`;
    phaseLabels.forEach(label => {
      html += `<div class="heatmap-header-cell">${label}</div>`;
    });

    const symptomIcons = {
      cramps: '<i data-lucide="droplet" style="width: 14px; height: 14px;"></i>',
      headache: '<i data-lucide="thermometer" style="width: 14px; height: 14px;"></i>',
      bloating: '<i data-lucide="wind" style="width: 14px; height: 14px;"></i>',
      fatigue: '<i data-lucide="moon" style="width: 14px; height: 14px;"></i>',
      happy: '<i data-lucide="smile" style="width: 14px; height: 14px;"></i>',
      sad: '<i data-lucide="frown" style="width: 14px; height: 14px;"></i>'
    };

    for (const [symptom, counts] of Object.entries(binCounts)) {
      html += `<div class="heatmap-row-label">${symptomIcons[symptom] || ''} ${symptomLabels[symptom]}</div>`;
      const rowSum = counts.reduce((a, b) => a + b, 0);

      counts.forEach(count => {
        let opacity = 0.05;
        let pctText = '0%';
        if (rowSum > 0 && count > 0) {
          const pct = count / rowSum;
          pctText = `${Math.round(pct * 100)}%`;
          opacity = 0.15 + (pct * 0.75);
        }

        const bg = `rgba(225, 29, 72, ${opacity})`;
        const color = opacity > 0.5 ? 'white' : 'var(--color-obsidian)';

        html += `
          <div class="heatmap-cell" style="background: ${bg}; color: ${color};" title="${count} logged (${pctText} of this symptom)">
            <span class="heatmap-cell-val">${count}</span>
            <span class="heatmap-cell-pct" style="color: ${opacity > 0.5 ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)'}">${pctText}</span>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  };

  const calculateSmartInsight = (binCounts, phaseLabels, symptomLabels, lang) => {
    let maxCount = 0;
    let peakSymptom = null;
    let peakPhaseIdx = null;

    for (const [symptom, counts] of Object.entries(binCounts)) {
      counts.forEach((count, idx) => {
        if (count > maxCount) {
          maxCount = count;
          peakSymptom = symptom;
          peakPhaseIdx = idx;
        }
      });
    }

    if (maxCount === 0 || peakSymptom === null) return null;

    const sLabel = symptomLabels[peakSymptom].toLowerCase();
    const phaseName = phaseLabels[peakPhaseIdx];

    if (lang === 'hi') {
      if (peakSymptom === 'happy') {
        return `आपके डेटा से पता चलता है कि आप आमतौर पर <strong>${phaseName}</strong> के दौरान सबसे <strong>खुश (Happy)</strong> महसूस करती हैं। यह आपके शरीर में प्राकृतिक एस्ट्रोजन स्तरों में वृद्धि के साथ मेल खाता है!`;
      } else {
        return `आपके डेटा के अनुसार, आपको सबसे अधिक <strong>${symptomLabels[peakSymptom]}</strong> की शिकायत <strong>${phaseName}</strong> के दौरान होती है। मासिक धर्म के दौरान हाइड्रेटेड रहने और आराम करने से मदद मिल सकती है।`;
      }
    } else if (lang === 'bn') {
      if (peakSymptom === 'happy') {
        return `আপনার ডেটা থেকে জানা যায় যে আপনি সাধারণত <strong>${phaseName}</strong>-এর সময় সবচেয়ে <strong>আনন্দিত (Happy)</strong> বোধ করেন। এটি আপনার শরীরে স্বাভাবিক ইস্ট্রোজেন হরমোনের বৃদ্ধির সাথে সামঞ্জস্যপূর্ণ!`;
      } else {
        return `আপনার ডেটা অনুযায়ী, আপনার সবচেয়ে বেশি <strong>${symptomLabels[peakSymptom]}</strong> দেখা যায় <strong>${phaseName}</strong>-এর সময়। এই সময়ে প্রচুর পানি পান করা এবং বিশ্রাম নেওয়া আরামদায়ক হতে পারে।`;
      }
    } else {
      if (peakSymptom === 'happy') {
        return `Analysis shows you feel <strong>Happiest</strong> most frequently during your <strong>${phaseName}</strong>. This aligns with estrogen spikes, enhancing energy and mood naturally!`;
      } else if (peakSymptom === 'cramps') {
        return `Your symptoms indicate that <strong>Cramps</strong> are most prevalent during the <strong>${phaseName}</strong>. Using a warm compress or light stretching can help soothe cramps.`;
      } else {
        return `According to your logs, you experience <strong>${symptomLabels[peakSymptom]}</strong> most frequently during the <strong>${phaseName}</strong>. Tracking helps you prepare and practice timely self-care!`;
      }
    }
  };

  const generateDoctorReport = () => {
    // 1. Gather patient info from DOM inputs
    const age = document.getElementById('user-age').value || '--';
    const heightFt = parseInt(document.getElementById('user-height-ft').value, 10) || 0;
    const heightIn = parseInt(document.getElementById('user-height-in').value, 10) || 0;
    const weight = document.getElementById('user-weight').value || '--';
    
    let heightStr = '--';
    let bmiStr = '--';
    let heightCm = 0;
    
    if (heightFt > 0) {
      heightCm = Math.round((heightFt * 30.48) + (heightIn * 2.54));
      heightStr = `${heightFt} ft ${heightIn} in (${heightCm} cm)`;
    }
    
    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = LangModule.getTranslations()?.tracker || {};
    
    if (heightCm > 0 && weight !== '--') {
      const heightM = heightCm / 100;
      const bmi = parseFloat(weight) / (heightM * heightM);
      let classification = '';
      if (activeLang === 'hi') {
        if (bmi < 18.5) classification = 'कम वजन (Underweight)';
        else if (bmi < 25) classification = 'सामान्य वजन (Normal)';
        else if (bmi < 30) classification = 'अधिक वजन (Overweight)';
        else classification = 'मोटापा (Obese)';
      } else if (activeLang === 'bn') {
        if (bmi < 18.5) classification = 'কম ওজন (Underweight)';
        else if (bmi < 25) classification = 'স্বাভাবিক ওজন (Normal)';
        else if (bmi < 30) classification = 'অতিরিক্ত ওজন (Overweight)';
        else classification = 'স্থূলতা (Obese)';
      } else {
        if (bmi < 18.5) classification = 'Underweight';
        else if (bmi < 25) classification = 'Normal weight';
        else if (bmi < 30) classification = 'Overweight';
        else classification = 'Obese';
      }
      bmiStr = `${bmi.toFixed(1)} — ${classification}`;
    }

    // Put values in Patient Info section
    document.getElementById('print-patient-age').textContent = age;
    document.getElementById('print-patient-height').textContent = heightStr;
    document.getElementById('print-patient-weight').textContent = weight !== '--' ? `${weight} kg` : '--';
    document.getElementById('print-patient-bmi').textContent = bmiStr;
    
    const now = new Date();
    document.getElementById('print-report-date').textContent = now.toLocaleDateString(activeLang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 2. Fetch metrics
    const metrics = calculateMetricsFromHistory();
    const avgCycle = metrics.averageCycleLength || (localStorage.getItem('maa_tracker') ? JSON.parse(localStorage.getItem('maa_tracker')).cycleLength : 28);
    const avgFlow = metrics.averageDuration || (localStorage.getItem('maa_tracker') ? JSON.parse(localStorage.getItem('maa_tracker')).periodDuration : 5);
    
    document.getElementById('print-avg-cycle-len').textContent = `${Math.round(avgCycle)} ${t.days || 'days'}`;
    document.getElementById('print-avg-flow-len').textContent = `${Math.round(avgFlow)} ${t.days || 'days'}`;

    // Cycle Regularity Score
    const periods = metrics.periods || [];
    let regularityText = '--';
    
    if (periods.length < 3) {
      regularityText = activeLang === 'hi' ? 'अपर्याप्त डेटा (कम से कम 3 मासिक धर्म लॉग करें)' : 
                       activeLang === 'bn' ? 'অপ্রতুল ডেটা (কমপক্ষে ৩টি ঋতুস্রাব লগ করুন)' : 
                       'Insufficient history (log ≥3 periods)';
    } else {
      const stdDev = metrics.variance || 0;
      let category = '';
      if (stdDev < 2.0) {
        category = t.regularity_highly_regular || 'Highly Regular';
      } else if (stdDev <= 4.0) {
        category = t.regularity_regular || 'Regular';
      } else {
        category = t.regularity_irregular || 'Highly Irregular';
      }
      regularityText = `±${stdDev.toFixed(1)} ${t.days || 'days'} (${category})`;
    }
    document.getElementById('print-cycle-regularity').textContent = regularityText;

    // 3. Render Heatmap Table (Symptom Phase Frequency)
    renderSymptomTablePrint();

    // 4. Render Cycle Duration History Table
    renderHistoryTablePrint(periods, activeLang);

    // 5. Render 3-Month Forecast Table
    renderForecastTablePrint(activeLang);

    // Trigger Print Dialog
    document.body.classList.add('printing-clinical-report');
    
    const style = document.createElement('style');
    style.id = 'print-page-margins-css';
    style.innerHTML = `@page { size: portrait; margin: 15mm; }`;
    document.head.appendChild(style);

    window.print();

    // Cleanup print changes after printing dialog finishes
    setTimeout(() => {
      document.body.classList.remove('printing-clinical-report');
      const customStyle = document.getElementById('print-page-margins-css');
      if (customStyle) customStyle.remove();
    }, 1000);
  };

  const renderSymptomTablePrint = () => {
    const container = document.getElementById('print-symptom-table-container');
    if (!container) return;

    const symptomsLog = JSON.parse(localStorage.getItem('maa_symptoms') || '{}');
    const metrics = calculateMetricsFromHistory();
    const periodStarts = metrics.periods.map(p => p.start);

    const savedTracker = localStorage.getItem('maa_tracker');
    let defaultLastPeriod = null;
    let activeCycleLength = 28;
    if (savedTracker) {
      const data = JSON.parse(savedTracker);
      defaultLastPeriod = data.lastPeriod;
      activeCycleLength = data.cycleLength || 28;
    }

    const trackedSymptoms = ["cramps", "headache", "bloating", "fatigue", "happy", "sad"];
    const binCounts = {};
    trackedSymptoms.forEach(s => {
      binCounts[s] = [0, 0, 0, 0, 0];
    });

    let totalLogsCount = 0;
    for (const [dateStr, symptoms] of Object.entries(symptomsLog)) {
      if (!symptoms || symptoms.length === 0) continue;
      const dateObj = new Date(dateStr + 'T00:00:00');
      const cycleDay = getCycleDayForDate(dateObj, periodStarts, defaultLastPeriod, activeCycleLength);
      if (cycleDay !== null && cycleDay >= 1) {
        let binIdx = 4;
        if (cycleDay <= 5) binIdx = 0;
        else if (cycleDay <= 11) binIdx = 1;
        else if (cycleDay <= 16) binIdx = 2;
        else if (cycleDay <= 22) binIdx = 3;

        symptoms.forEach(s => {
          if (binCounts[s] !== undefined) {
            binCounts[s][binIdx]++;
            totalLogsCount++;
          }
        });
      }
    }

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = LangModule.getTranslations()?.tracker || {};

    const symptomLabels = {
      cramps: t.symptom_cramps || "Cramps",
      headache: t.symptom_headache || "Headache",
      bloating: t.symptom_bloating || "Bloating",
      fatigue: t.symptom_fatigue || "Fatigue",
      happy: t.symptom_happy || "Happy",
      sad: t.symptom_sad || "Sad"
    };

    const phaseLabels = [
      activeLang === 'hi' ? 'मासिक (1-5)' : activeLang === 'bn' ? 'ঋতুস্রাব (১-৫)' : 'Menstrual (1-5)',
      activeLang === 'hi' ? 'फॉलिक्युलर (6-11)' : activeLang === 'bn' ? 'ফলিকিউলার (৬-১১)' : 'Follicular (6-11)',
      activeLang === 'hi' ? 'अंडोत्सर्ग (12-16)' : activeLang === 'bn' ? 'ডিম্বস্ফোটন (১২-১৬)' : 'Ovulatory (12-16)',
      activeLang === 'hi' ? 'ल्यूटियल (17-22)' : activeLang === 'bn' ? 'লিউটিয়াল (১৭-২২)' : 'Luteal (17-22)',
      activeLang === 'hi' ? 'पीएमएस (23-28+)' : activeLang === 'bn' ? 'পিএমএস (২৩-২৮+)' : 'PMS (23-28+)'
    ];

    if (totalLogsCount === 0) {
      container.innerHTML = `<p style="font-size: 9.5pt; font-style: italic; color: #4B5563;">${t.symptom_correlation_empty || "No logged symptoms recorded yet."}</p>`;
      return;
    }

    let html = `<table class="clinical-report-table">`;
    const colHeaderSymptom = activeLang === 'hi' ? 'लक्षण' : activeLang === 'bn' ? 'লক্ষণ' : 'Symptom';
    html += `<thead><tr><th>${colHeaderSymptom}</th>`;
    phaseLabels.forEach(p => {
      html += `<th>${p}</th>`;
    });
    html += `</tr></thead><tbody>`;

    for (const [symptom, counts] of Object.entries(binCounts)) {
      html += `<tr><td><strong>${symptomLabels[symptom]}</strong></td>`;
      const rowSum = counts.reduce((a, b) => a + b, 0);

      counts.forEach(count => {
        let pctText = '0%';
        let cellClass = '';
        if (rowSum > 0 && count > 0) {
          const pct = count / rowSum;
          pctText = `${Math.round(pct * 100)}%`;
          if (pct >= 0.5) {
            cellClass = 'print-heatmap-cell high-freq';
          } else if (pct >= 0.2) {
            cellClass = 'print-heatmap-cell med-freq';
          } else {
            cellClass = 'print-heatmap-cell';
          }
        } else {
          cellClass = 'print-heatmap-cell';
        }

        html += `<td class="${cellClass}">${count} <span style="font-size: 8pt; font-weight: normal; color: #4B5563;">(${pctText})</span></td>`;
      });
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  const renderHistoryTablePrint = (periods, activeLang) => {
    const container = document.getElementById('print-history-table-container');
    if (!container) return;

    if (periods.length < 2) {
      container.innerHTML = `<p style="font-size: 9.5pt; font-style: italic; color: #4B5563;">${activeLang === 'hi' ? 'इतिहास देखने के लिए कृपया कम से कम 2 मासिक धर्म लॉग करें।' : activeLang === 'bn' ? 'ইতিহাস দেখতে অনুগ্রহ করে কমপক্ষে ২টি ঋতুস্রাব লগ করুন।' : 'Please log at least two periods to see cycle history.'}</p>`;
      return;
    }

    // List the last 6 cycles
    const cycleLengths = [];
    for (let i = 1; i < periods.length; i++) {
      const prevStart = periods[i - 1].start;
      const currStart = periods[i].start;
      const len = Math.round((currStart - prevStart) / (1000 * 60 * 60 * 24));
      cycleLengths.push({
        startDate: prevStart,
        endDate: periods[i - 1].end,
        duration: periods[i - 1].duration,
        cycleLength: len
      });
    }

    // Include the most recent logged cycle duration info
    const lastPeriod = periods[periods.length - 1];
    cycleLengths.push({
      startDate: lastPeriod.start,
      endDate: lastPeriod.end,
      duration: lastPeriod.duration,
      cycleLength: null // Current/ongoing cycle
    });

    const displayCycles = cycleLengths.slice(-6).reverse(); // Last 6 in reverse chronological order

    let html = `<table class="clinical-report-table">`;
    const colCycleStart = activeLang === 'hi' ? 'मासिक धर्म शुरू होने की तिथि' : activeLang === 'bn' ? 'ঋতুস্রাব শুরুর তারিখ' : 'Period Start Date';
    const colDuration = activeLang === 'hi' ? 'स्राव अवधि (दिन)' : activeLang === 'bn' ? 'স্থায়িত্ব (দিন)' : 'Flow Duration';
    const colCycleLen = activeLang === 'hi' ? 'चक्र की लंबाई (दिन)' : activeLang === 'bn' ? 'চক্রের দৈর্ঘ্য (দিন)' : 'Cycle Length';
    
    html += `<thead><tr>
      <th>${colCycleStart}</th>
      <th>${colDuration}</th>
      <th>${colCycleLen}</th>
    </tr></thead><tbody>`;

    displayCycles.forEach(c => {
      const dateStr = c.startDate.toLocaleDateString(activeLang, { year: 'numeric', month: 'long', day: 'numeric' });
      const lenStr = c.cycleLength ? `${c.cycleLength} days` : (activeLang === 'hi' ? 'जारी है...' : activeLang === 'bn' ? 'চলমান...' : 'Ongoing / Current');
      html += `<tr>
        <td><strong>${dateStr}</strong></td>
        <td>${c.duration} days</td>
        <td>${lenStr}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  const renderForecastTablePrint = (activeLang) => {
    const container = document.getElementById('print-forecast-table-container');
    if (!container) return;

    if (!forecastDataset || forecastDataset.length === 0) {
      container.innerHTML = `<p style="font-size: 9.5pt; font-style: italic; color: #4B5563;">No forecast calculations available. Please calculate cycle first.</p>`;
      return;
    }

    // Get the first 3 cycles starting on or after today
    const today = new Date();
    today.setHours(0,0,0,0);

    const cycleStarts = [];
    
    // Find dates where cycleDay === 1 on or after today
    for (let i = 0; i < forecastDataset.length; i++) {
      const entry = forecastDataset[i];
      const entryDate = new Date(entry.date + 'T00:00:00');
      if (entryDate >= today && entry.cycleDay === 1) {
        cycleStarts.push(i);
        if (cycleStarts.length === 3) break;
      }
    }

    if (cycleStarts.length === 0) {
      container.innerHTML = `<p style="font-size: 9.5pt; font-style: italic; color: #4B5563;">No future forecast cycles found.</p>`;
      return;
    }

    let html = `<table class="clinical-report-table">`;
    const colForecastCycle = activeLang === 'hi' ? 'अनुमानित चक्र' : activeLang === 'bn' ? 'অনুমিত চক্র' : 'Forecasted Cycle';
    const colForecastPeriod = activeLang === 'hi' ? 'मासिक धर्म की तिथि' : activeLang === 'bn' ? 'ঋতুস্রাবের তারিখ' : 'Predicted Period Flow';
    const colForecastOvulation = activeLang === 'hi' ? 'अंडोत्सर्ग का दिन (Ovulation)' : activeLang === 'bn' ? 'ডিম্বস্ফোটনের দিন (Ovulation)' : 'Peak Ovulation Day';
    const colForecastFertile = activeLang === 'hi' ? 'अनुमानित गर्भधारण खिड़की' : activeLang === 'bn' ? 'অনুমিত উর্বর সময়সীমা' : 'Estimated Fertile Window';

    html += `<thead><tr>
      <th>${colForecastCycle}</th>
      <th>${colForecastPeriod}</th>
      <th>${colForecastOvulation}</th>
      <th>${colForecastFertile}</th>
    </tr></thead><tbody>`;

    cycleStarts.forEach((startIndex, idx) => {
      // Collect dates in this cycle
      const cycleStartEntry = forecastDataset[startIndex];
      const cycleStartDayObj = new Date(cycleStartEntry.date + 'T00:00:00');
      
      // Let's scan forward to find ovulation and fertile window bounds in this cycle
      let ovulationDateStr = '';
      let fertileStartDateStr = '';
      let fertileEndDateStr = '';
      let periodEndDateStr = '';

      // Scan up to 45 days forward to map this specific cycle
      for (let j = startIndex; j < Math.min(forecastDataset.length, startIndex + 45); j++) {
        const entry = forecastDataset[j];
        if (entry.cycleDay === 1 && j > startIndex) break; // Next cycle started!
        
        const dObj = new Date(entry.date + 'T00:00:00');
        const formatted = dObj.toLocaleDateString(activeLang, { year: 'numeric', month: 'short', day: 'numeric' });

        if (entry.status === 'Period') {
          periodEndDateStr = formatted; // Track last period day
        }
        if (entry.status === 'Ovulation') {
          ovulationDateStr = formatted;
        }
        if (entry.status === 'Fertile' || entry.status === 'Ovulation') {
          if (!fertileStartDateStr) fertileStartDateStr = formatted;
          fertileEndDateStr = formatted;
        }
      }

      const cycleNumText = activeLang === 'hi' ? `चक्र ${idx + 1}` : activeLang === 'bn' ? `চক্র ${idx + 1}` : `Cycle ${idx + 1}`;
      const periodStartFormatted = cycleStartDayObj.toLocaleDateString(activeLang, { year: 'numeric', month: 'short', day: 'numeric' });
      
      const periodRange = `${periodStartFormatted} - ${periodEndDateStr}`;
      const fertileRange = `${fertileStartDateStr} - ${fertileEndDateStr}`;

      html += `<tr>
        <td><strong>${cycleNumText}</strong></td>
        <td>${periodRange}</td>
        <td><span style="color: #BE123C; font-weight: 600;">${ovulationDateStr}</span></td>
        <td>${fertileRange}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  return { init, renderCalendar, renderForecastTable, recalculateAndRefresh };
})();

// --- Q&A Module ---
const QAModule = (() => {
  let knowledgeBase = [];
  let qnaBase = [];
  let activeCategory = "all";

  const DEMO_ANSWERS = {
    "General": "Every body is different. Cycle lengths and symptoms can vary slightly from month to month. Tracking helps identify your unique pattern.",
    "Hygiene": "It's important to change your pad or tampon every 4-6 hours to prevent infection. Wash your hands before and after.",
    "Health": "If you experience severe pain that prevents daily activities, consult a healthcare professional. Tracking your basal body temperature and resting heart rate can also provide insights into hormonal health.",
    "Nutrition": "Eating iron-rich foods and staying hydrated mitigates cramps. Research shows metabolic shifts during different cycle phases can affect glucose levels, so a balanced diet is crucial.",
    "Emotional": "Hormonal shifts are natural. Research comparing menstrual cycles to daily/seasonal rhythms shows profound impacts on mood. Practice self-care, and adjust your routine according to your energy levels.",
    "Urbanization": "Urban environments can increase access to products but also introduce stress and dietary changes that may cause cycle irregularities. Maintaining a healthy lifestyle is key."
  };

  const init = async () => {
    try {
      const ts = new Date().getTime();
      const res = await fetch(`data/conditions.json?t=${ts}`);
      knowledgeBase = await res.json();
      const resQna = await fetch(`data/qna.json?t=${ts}`);
      qnaBase = await resQna.json();
      loadQuestions();
    } catch (e) {
      console.error("Failed to load medical knowledge base", e);
      loadQuestions();
    }

    const form = document.getElementById('qa-form');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('qa-input').value;
      const category = document.getElementById('qa-category').value;

      const answer = generateAnswer(text, category);

      const newQ = {
        id: Date.now(),
        text,
        category,
        timestamp: new Date().toISOString(),
        answer: answer
      };

      const submissions = getSubmissions();
      submissions.unshift(newQ);
      localStorage.setItem('maa_qa_submissions', JSON.stringify(submissions));

      if (answer === "I'm sorry, I don't know the answer to that. Please visit a doctor or consult your nearest gynecologist for proper medical advice.") {
        const failed = JSON.parse(localStorage.getItem('maa_failed_queries') || '[]');
        failed.unshift({ text, timestamp: new Date().toISOString(), reason: 'fallback' });
        localStorage.setItem('maa_failed_queries', JSON.stringify(failed));
      }

      form.reset();
      loadQuestions();
    });

    const clearBtn = document.getElementById('qa-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('maa_qa_submissions');
        localStorage.removeItem('maa_qa');
        const formEl = document.getElementById('qa-form');
        if (formEl) formEl.reset();
        loadQuestions();
        alert('Your Q&A data has been successfully cleared.');
      });
    }

    // Wire active category filtering using Q&A filter pills
    const pills = document.querySelectorAll('.qa-filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.getAttribute('data-category') || 'all';
        loadQuestions();
      });
    });
  };

  const SYNONYMS = {
    "pmos": ["pmos", "ovarian cyst"],
    "pain": ["cramps", "ache", "hurts", "sore", "dysmenorrhea"],
    "period": ["menstruation", "cycle", "flow", "bleeding"],
    "late": ["delayed", "missed", "no period", "skip"],
    "heavy": ["excessive", "clots", "too much"],
    "mood": ["angry", "sad", "crying", "emotional", "depressed", "anxious", "mood swings"],
    "tired": ["fatigue", "exhausted", "low energy", "sleepy", "weak"],
    "spotting": ["brown discharge", "light bleeding", "pink discharge"],
    "acne": ["pimples", "breakouts", "zits"]
  };

  const normalizeText = (text) => {
    let normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    Object.keys(SYNONYMS).forEach(key => {
      SYNONYMS[key].forEach(syn => {
        if (normalized.includes(syn)) {
          normalized += ` ${key}`; // Append core keyword to boost score
        }
      });
    });
    return normalized;
  };

  const generateAnswer = (question, category) => {
    const lowerText = question.toLowerCase();

    // EMERGENCY INTERCEPT
    if (lowerText.includes('suicid') || lowerText.includes('kill myself') || lowerText.includes('want to die') || lowerText.includes('end my life')) {
      return `<div style="border: 2px solid var(--color-crimson); padding: 15px; border-radius: 8px; background-color: #fff5f5;">
      <h3 style="color: var(--color-crimson); margin-top: 0; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="alert-triangle"></i> EMERGENCY SUPPORT
      </h3>
      <p style="font-size: 1.05rem; margin-bottom: 15px; color: var(--color-text);"><strong>If you are experiencing suicidal thoughts, please seek help immediately. You are not alone and this feeling will pass.</strong></p>
      <ul style="list-style: none; padding-left: 0; line-height: 1.6; color: var(--color-text);">
        <li>📞 <strong>National Suicide Prevention Helpline (India):</strong> 9152987821 (AASRA)</li>
        <li>📞 <strong>Kiran Mental Health Helpline:</strong> 1800-599-0019</li>
        <li>📞 <strong>Vandrevala Foundation:</strong> 9999 666 555</li>
        <li>🏥 Please go to the nearest hospital emergency room or contact a trusted family member or friend immediately.</li>
      </ul>
      <p style="margin-top: 15px; font-size: 0.95rem; color: var(--color-text-muted);">Severe cyclical depression and suicidal thoughts can be a symptom of <strong>PMDD</strong> (Premenstrual Dysphoric Disorder), a serious but highly treatable medical condition. Please hold on and speak to a medical professional.</p>
      </div>`;
    }



    const greetings = ['hi', 'hello', 'hey', 'ok', 'okay', 'thanks', 'thank you', 'good', 'nice'];
    if (greetings.includes(lowerText.trim().replace(/[^\w\s]/gi, ''))) {
      return "Hello! I am here to help you with any questions related to menstrual health, tracking, or symptoms. How can I assist you today?";
    }

    // Tracker Intercept - Use local storage data to answer cycle questions
    const trackerKeywords = ['next period', 'when is my period', 'am i late', 'my cycle', 'ovulating', 'ovulation', 'fertile'];
    if (trackerKeywords.some(w => lowerText.includes(w))) {
      const savedTracker = localStorage.getItem('maa_tracker');
      if (savedTracker) {
        try {
          const data = JSON.parse(savedTracker);
          const lastPeriodStr = data.lastPeriod;
          const cycleLength = parseInt(data.cycleLength || 28);
          
          if (lastPeriodStr) {
            const lastPeriodDate = new Date(lastPeriodStr + 'T00:00:00');
            const nextPeriodDate = new Date(lastPeriodDate.getTime() + cycleLength * 24 * 60 * 60 * 1000);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const diffDays = Math.round((nextPeriodDate - today) / (1000 * 60 * 60 * 24));
            const nextDateStr = nextPeriodDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            
            if (lowerText.includes('next period') || lowerText.includes('when is my period') || lowerText.includes('am i late') || lowerText.includes('my cycle')) {
              if (diffDays < 0) {
                return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>According to your tracker, your period was expected on <strong>${nextDateStr}</strong>. You are currently <strong>${Math.abs(diffDays)} day(s) late</strong>. Stress, travel, or hormonal changes can cause delays.`;
              } else if (diffDays === 0) {
                return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>Your next period is expected <strong>today</strong>! (${nextDateStr}). Make sure to carry supplies with you!`;
              } else {
                return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>Based on your tracked cycle (${cycleLength} days) and your last period (${lastPeriodStr}), your next period is expected in <strong>${diffDays} days</strong> on <strong>${nextDateStr}</strong>.`;
              }
            }
            
            if (lowerText.includes('ovulating') || lowerText.includes('ovulation') || lowerText.includes('fertile')) {
              const ovulationDate = new Date(nextPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
              const diffOvDays = Math.round((ovulationDate - today) / (1000 * 60 * 60 * 24));
              const ovDateStr = ovulationDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
              
              if (diffOvDays < -2) {
                 return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>Your estimated ovulation for this cycle has already passed (around ${ovDateStr}). You are currently in your luteal phase.`;
              } else if (diffOvDays <= 2 && diffOvDays >= -2) {
                 return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>You are in your fertile window! Your estimated ovulation is <strong>${diffOvDays === 0 ? 'today' : 'around ' + ovDateStr}</strong>.`;
              } else {
                 return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>Your estimated ovulation date is coming up in <strong>${diffOvDays} days</strong> (around <strong>${ovDateStr}</strong>).`;
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        return `<i data-lucide="calendar"></i> <strong>Tracker Insight:</strong><br>You haven't logged your period in the Tracker yet! Please go to the <strong>Tracker</strong> tab and save your cycle information so I can give you accurate predictions.`;
      }
    }

    if ((!knowledgeBase || knowledgeBase.length === 0) && (!qnaBase || qnaBase.length === 0)) {
      return DEMO_ANSWERS[category] || "I don't know the answer to this right now. Please visit a doctor or healthcare professional for medical advice.";
    }

    const qLower = normalizeText(question);
    const stopWords = ['what', 'when', 'where', 'why', 'how', 'who', 'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'having', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'i', 'im', 'ive', 'period', 'periods', 'cycle', 'menstruation', 'chums', 'menses'];
    const words = qLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));

    // HYBRID SCORING: QnA
    const cleanQuery = words.join(' ');
    const queryForFuse = cleanQuery.length > 0 ? cleanQuery : qLower;

    let scoredQnA = qnaBase.map(item => {
      if (!item.questions || item.questions.length === 0) return { type: 'qna', item, score: 0 };
      let score = 0;
      const itemQs = item.questions.map(q => q.toLowerCase());
      const keywords = Array.isArray(item.keywords) ? item.keywords.map(k => k.toLowerCase()) : [];
      const isDirect = !!item.is_direct;

      const genericKeywords = ['period', 'periods', 'cycle', 'menstruation', 'chums', 'menses', 'bleeding'];
      keywords.forEach(kw => {
        if (genericKeywords.includes(kw.toLowerCase()) && qLower.split(/\s+/).length > 1) {
          // If the query is multi-word, don't give massive points just for these generic keywords
          return;
        }
        // Use a more forgiving regex for plurals (optional 's' or 'es')
        const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(s|es)?\\b`, 'i');
        if (regex.test(qLower)) {
          const kwWords = kw.split(/\s+/).length;
          score += kwWords >= 2 ? (isDirect ? 80 : 40) : (isDirect ? 50 : 20);
        }
      });
      itemQs.forEach(q => {
        const cleanQ = q.toLowerCase().replace(/[^\w\s]/g, ' ');
        if (cleanQ === qLower) score += 300; // Exact question match
        words.forEach(w => {
          if (cleanQ.includes(w)) score += isDirect ? 20 : 10;
        });
      });
      return { type: 'qna', item, score };
    });

    if (typeof Fuse !== 'undefined') {
      const fuseQnA = new Fuse(qnaBase, { keys: ['questions', 'keywords', 'answer'], includeScore: true, threshold: 0.35, ignoreLocation: true });
      const qnaResults = fuseQnA.search(queryForFuse);
      qnaResults.forEach(res => {
        const idx = scoredQnA.findIndex(s => s.item === res.item);
        if (idx !== -1) {
          let fScore = Math.round((1 - res.score) * 200); // Scale up Fuse score to compete with keyword scores
          if (res.score < 0.15) fScore += 200; // Huge boost for very strong fuzzy matches
          if (res.score > 0.3) fScore = 0; // Reject weak fuzzy matches
          scoredQnA[idx].score = Math.max(scoredQnA[idx].score, fScore);
        }
      });
    }
    scoredQnA = scoredQnA.filter(c => c.score > 40);

    // HYBRID SCORING: Conditions
    let scoredConditions = knowledgeBase.map(item => {
      let score = 0;
      const conditionName = (item.condition || "").toLowerCase();
      const keywords = Array.isArray(item.keywords) ? item.keywords.map(k => k.toLowerCase()) : [];
      const symptoms = (item.symptoms || "").toLowerCase();

      if (conditionName && qLower.includes(conditionName)) score += 100;

      keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(qLower)) {
          const kwWords = kw.split(/\s+/).length;
          score += kwWords >= 2 ? 100 : 60; // Strong match for multi-word symptoms
        }
      });

      words.forEach(w => {
        if (symptoms.includes(w)) score += 10;
      });
      return { type: 'condition', item, score };
    });

    if (typeof Fuse !== 'undefined') {
      const fuseCond = new Fuse(knowledgeBase, { keys: ['condition', 'keywords', 'symptoms'], includeScore: true, threshold: 0.35, ignoreLocation: true });
      const condResults = fuseCond.search(queryForFuse);
      condResults.forEach(res => {
        const idx = scoredConditions.findIndex(s => s.item === res.item);
        if (idx !== -1) {
          let fScore = Math.round((1 - res.score) * 100);
          if (res.score > 0.3) fScore = 0; // Reject weak fuzzy matches
          if (res.item.condition && qLower.includes(res.item.condition.toLowerCase())) fScore += 60;
          scoredConditions[idx].score = Math.max(scoredConditions[idx].score, fScore);
        }
      });
    }
    scoredConditions = scoredConditions.filter(c => c.score > 40);

    const allMatches = [...scoredQnA, ...scoredConditions];
    allMatches.sort((a, b) => b.score - a.score);

    if (allMatches.length > 0) {
      const bestMatch = allMatches[0];
      let response = '';
      let highRisk = false;
      let doctorRequired = false;

      if (bestMatch.type === 'qna') {
        response = bestMatch.item.answer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Emotion & Cycle Tracker Context Injection
        const hasEmotion = ['sad', 'depressed', 'cry', 'angry', 'irritable', 'mad', 'cramps', 'pain', 'hurt', 'tired', 'exhausted', 'sleepy', 'happy', 'energetic', 'motivated', 'horny', 'turned on', 'aroused', 'libido'].some(w => lowerText.includes(w));
        if (hasEmotion) {
          const savedTracker = localStorage.getItem('maa_tracker');
          if (savedTracker) {
            try {
              const data = JSON.parse(savedTracker);
              if (data.lastPeriod) {
                const lastPeriodDate = new Date(data.lastPeriod + 'T00:00:00');
                const today = new Date();
                today.setHours(0,0,0,0);
                const cycleDay = Math.floor((today - lastPeriodDate) / (1000 * 60 * 60 * 24)) + 1;
                
                let phaseStr = "";
                let hormoneInsight = "";
                
                if (cycleDay >= 1 && cycleDay <= 5) {
                   phaseStr = "Menstrual Phase";
                   hormoneInsight = "Estrogen and progesterone are low right now, which can naturally lower your mood and energy. It's completely normal to feel this way.";
                } else if (cycleDay >= 6 && cycleDay <= 13) {
                   phaseStr = "Follicular Phase";
                   hormoneInsight = "Estrogen is rising, which usually brings a mood boost, but natural fluctuations can still affect how you feel.";
                } else if (cycleDay >= 14 && cycleDay <= 16) {
                   phaseStr = "Ovulatory Phase";
                   hormoneInsight = "Hormones are peaking. While many feel energetic, the rapid shifts can sometimes cause sudden emotional dips or physical symptoms.";
                } else {
                   phaseStr = "Luteal Phase";
                   hormoneInsight = "Progesterone is high and estrogen is dropping. This hormonal shift is the primary cause of PMS, which naturally brings on sadness, irritability, or fatigue. Your feelings are valid and hormonally driven.";
                }
                
                response += `<br><br><div style="background-color: var(--pink-50); padding: 12px; border-radius: 8px; border-left: 4px solid var(--color-primary); margin-top: 10px;">
                  <strong style="color: var(--color-primary);"><i data-lucide="activity" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Cycle Context</strong><br>
                  <span style="font-size: 0.95rem; color: var(--color-text);">According to your tracker, you are on <strong>Day ${cycleDay}</strong> (${phaseStr}).<br>
                  <em>${hormoneInsight}</em></span>
                </div>`;
              }
            } catch(e) { console.error(e); }
          }
        }

      } else {
        const cond = bestMatch.item;
        if (cond.doctor_required || cond.risk_level === 'high') {
          highRisk = true;
          doctorRequired = true;
        }
        response = `<strong>${cond.condition}</strong> (${cond.description || 'Condition'})\n<br>\n`;
        if (cond.symptoms) response += `- <strong>Symptoms:</strong> ${cond.symptoms}\n<br>\n`;
        if (cond.causes) response += `- <strong>Causes:</strong> ${cond.causes}\n<br>\n`;
        if (cond.recommendation) response += `- <strong>Recommendation:</strong> ${cond.recommendation}\n`;
      }

      response += `\n<br><br>\n`;
      if (doctorRequired || highRisk) {
        response += `<div style="font-size: 0.85rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 6px;"><i data-lucide="alert-triangle" style="width:16px;height:16px;color:#e11d48;"></i> <em>This website is only for general suggestion. Please consult your nearest gynecologist or healthcare professional for an accurate diagnosis.</em></div>`;
      } else {
        response += `<span style="font-size: 0.85rem; color: var(--color-text-muted);"><em>This website is only for general suggestion. Please consult your nearest gynecologist. Tracking your symptoms daily can also help you understand your cycle better.</em></span>`;
      }
      return response.trim();
    }

    // Fallback if no strong match
    return "I'm sorry, I don't know the answer to that. Please visit a doctor or consult your nearest gynecologist for proper medical advice.";
  };

  const getSubmissions = () => {
    const data = localStorage.getItem('maa_qa_submissions');
    return data ? JSON.parse(data) : [];
  };

  const wrapMedicalTerms = (text) => {
    if (!text) return "";
    let processed = String(text);
    const medicalTerms = {
      "pmos": "Polyendocrine Metabolic Ovarian Disease: A condition where the ovaries release many immature eggs which eventually turn into cysts.",
      "pmos": "Polyendocrine Metabolic Ovarian Syndrome: A hormonal disorder causing enlarged ovaries with small cysts on the outer edges.",
      "pmos": "Polyendocrine Metabolic Ovarian Syndrome: A hormonal disorder characterized by elevated androgen levels, insulin resistance, and metabolic dysfunction (formerly PMOS).",
      "anovulation": "The absence of ovulation during menstrual cycles.",
      "dysmenorrhea": "Medical term for pain with menstruation (cramps).",
      "amenorrhea": "The absence of menstruation, often defined as missing one or more menstrual periods.",
      "endometriosis": "A condition where tissue similar to the lining of the uterus grows outside the uterus, causing pain.",
      "adenomyosis": "A condition in which the inner lining of the uterus (the endometrium) breaks through the muscle wall of the uterus.",
      "menorrhagia": "Menstrual periods with abnormally heavy or prolonged bleeding.",
      "fibroids": "Benign smooth muscle tumors of the uterus (also known as leiomyomas).",
      "leiomyomas": "Benign smooth muscle tumors of the uterus (also known as uterine fibroids).",
      "asherman's syndrome": "A rare condition characterized by the formation of scar tissue inside the uterus.",
      "asherman": "A rare condition characterized by the formation of scar tissue inside the uterus.",
      "vulvodynia": "Chronic, unexplained pain in the area around the opening of the vagina (vulva).",
      "vaginismus": "Involuntary spasm of vaginal muscles making penetration painful or impossible.",
      "poi": "Premature Ovarian Insufficiency: when ovaries stop functioning normally before age 40.",
      "mittelschmerz": "One-sided, lower abdominal pain associated with normal ovulation.",
      "pms": "Premenstrual Syndrome: A group of symptoms that occur in women, typically between ovulation and a period.",
      "ovulation": "The release of an egg from the ovary, usually occurring around day 14 of a 28-day menstrual cycle."
    };

    let tokens = {};
    let tokenIndex = 0;

    for (const [term, def] of Object.entries(medicalTerms)) {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      processed = processed.replace(regex, (match) => {
        let token = `__MED_TOKEN_${tokenIndex}__`;
        tokens[token] = `<span class="medical-term" style="border-bottom: 1px dashed var(--color-crimson); color: var(--color-crimson); cursor: pointer;" onclick="window.openDisorderModal('${match.replace(/'/g, "\\'")}', '${def.replace(/'/g, "\\'")}')">${match}</span>`;
        tokenIndex++;
        return token;
      });
    }

    for (const [token, html] of Object.entries(tokens)) {
      processed = processed.replace(token, html);
    }
    return processed;
  };

  const loadQuestions = () => {
    const submissions = getSubmissions();
    const list = document.getElementById('qa-list');

    // We are no longer displaying curated questions by default
    const allQuestions = submissions.map(s => ({ ...s, isCurated: false }));

    // Filter questions by selected category pill
    let filteredQuestions = allQuestions;
    if (activeCategory !== 'all') {
      if (activeCategory === 'User') {
        filteredQuestions = allQuestions.filter(q => !q.isCurated);
      } else {
        filteredQuestions = allQuestions.filter(q => q.category.toLowerCase() === activeCategory.toLowerCase());
      }
    }

    if (filteredQuestions.length === 0) {
      list.innerHTML = `<p style="text-align:center; color:var(--color-text-muted);">No questions found under this category.</p>`;
      return;
    }

    list.innerHTML = filteredQuestions.map(q => `
      <div class="qa-card ${q.isCurated ? 'curated-card' : 'user-submitted-card'}" style="${q.isCurated ? '' : 'border-left: 4px solid var(--color-primary); background: rgba(220, 38, 38, 0.02);'}">
        <div class="qa-meta">
          <span class="badge">${q.category}</span>
          ${q.isCurated ? '<span class="badge" style="background: var(--color-primary); color: #fff;">Curated Q&A</span>' : '<span class="badge" style="background: #E0E7FF; color: #4338CA;"><i data-lucide="shield-check" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> Submitted Anonymously</span>'}
          <span>${q.isCurated ? '' : new Date(q.timestamp).toLocaleDateString()}</span>
        </div>
        <p class="qa-question">Q: ${q.text}</p>
        <p class="qa-answer">A: ${wrapMedicalTerms((q.answer || '').replace(/<em>/g, '<span style="font-style: normal; font-weight: 500;">').replace(/<\/em>/g, '</span>'))}</p>
        ${q.isCurated ? '' : `
        <div class="qa-feedback" style="margin-top: 1rem; border-top: 1px solid rgba(220, 38, 38, 0.1); padding-top: 0.5rem; text-align: right;">
          <span style="font-size: 0.8rem; color: var(--color-text-muted); margin-right: 0.5rem;">Was this helpful?</span>
          <button class="feedback-btn upvote-btn" data-text="${q.text.replace(/"/g, '&quot;')}" style="background:none;border:none;cursor:pointer;color:#888; font-size: 1.1rem; transition: transform 0.2s; margin-right: 0.5rem;" title="Mark as helpful">👍</button>
          <button class="feedback-btn downvote-btn" data-text="${q.text.replace(/"/g, '&quot;')}" style="background:none;border:none;cursor:pointer;color:#888; font-size: 1.1rem; transition: transform 0.2s;" title="Report bad answer">👎</button>
        </div>
        `}
      </div>
    `).join('');

    // Re-create icons since we injected HTML dynamically
    if (window.lucide) {
      window.lucide.createIcons();
    }

    document.querySelectorAll('.upvote-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        this.innerHTML = 'Thanks! ✨';
        this.style.color = '#10b981';
        this.style.fontSize = '0.85rem';
        this.disabled = true;
        const downvoteBtn = this.parentElement.querySelector('.downvote-btn');
        if (downvoteBtn) downvoteBtn.style.display = 'none';
      });
    });

    document.querySelectorAll('.downvote-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const text = this.getAttribute('data-text');
        const failed = JSON.parse(localStorage.getItem('maa_failed_queries') || '[]');
        if (!failed.some(f => f.text === text)) {
          failed.unshift({ text, timestamp: new Date().toISOString(), reason: 'downvote' });
          localStorage.setItem('maa_failed_queries', JSON.stringify(failed));
        }
        this.innerHTML = 'Logged! 📝';
        this.style.color = '#e11d48';
        this.style.fontSize = '0.85rem';
        this.disabled = true;
        const upvoteBtn = this.parentElement.querySelector('.upvote-btn');
        if (upvoteBtn) upvoteBtn.style.display = 'none';
      });
    });
  };

  return { init, loadQuestions };
})();

// --- Animation & UI Module ---
const UIModule = (() => {
  const init = () => {
    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.add('hidden');
      });
    });

    // Scroll Animations (Intersection Observer)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // Counters
          if (entry.target.id === 'impact') {
            startCounters();
            observer.unobserve(entry.target); // only once
          }
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
  };

  const startCounters = () => {
    document.querySelectorAll('.counter').forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const duration = 2000;
      const stepTime = Math.abs(Math.floor(duration / target));
      let current = 0;
      const increment = target / (duration / 30); // 30ms intervals

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target.toLocaleString() + (counter.hasAttribute('data-no-plus') ? '' : '+');
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString();
        }
      }, 30);
    });
  };

  return { init };
})();

// --- Blogs Module ---
const BlogsModule = (() => {
  const init = async () => {
    try {
      const res = await fetch('data/blog.json');
      const blogs = await res.json();
      renderBlogs(blogs);
    } catch (e) {
      console.error("Failed to load blogs", e);
    }

    const closeBtn = document.getElementById('close-blog-modal');
    const modal = document.getElementById('blog-modal');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
  };

  const renderBlogs = (blogs) => {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;
    
    const displayBlogs = blogs.slice(0, 3);
    
    grid.innerHTML = displayBlogs.map(blog => `
      <a href="blog.html#${blog.id}" class="card blog-card" style="text-align: left; text-decoration: none; display: block;">
        <img src="${blog.image}" alt="${blog.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 1rem;">
        <h3 style="color: var(--color-crimson); margin-bottom: 0.5rem; font-family: var(--font-display);">${blog.title}</h3>
        <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 1rem;">${blog.excerpt}</p>
        <span style="font-weight: 600; color: var(--color-crimson); font-size: 0.9rem;">Read More <i data-lucide="arrow-right"></i></span>
      </a>
    `).join('');

    window.siteBlogs = blogs;
  };

  return { init };
})();

// --- PDF Insights Tabs Module ---
const TabsModule = (() => {
  const init = () => {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('tab-' + target);
        if (panel) panel.classList.add('active');
      });
    });
  };
  return { init };
})();

// --- Scroll Spy Module ---
const ScrollSpyModule = (() => {
  const init = () => {
    const sections = document.querySelectorAll('section[id], .section[id]');
    const navLinks = document.querySelectorAll('#desktop-nav a[href^="#"]');

    window.addEventListener('scroll', () => {
      let current = '';
      const scrollPos = window.scrollY + 200; // offset for fixed header

      sections.forEach(section => {
        if (scrollPos >= section.offsetTop && scrollPos < (section.offsetTop + section.offsetHeight)) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active-nav-link');
        if (link.getAttribute('href').includes(current)) {
          link.classList.add('active-nav-link');
        }
      });
    }, { passive: true });
  };
  return { init };
})();

// --- Reminders Module ---
const RemindersModule = (() => {
    const notificationTranslations = {
    en: {
      testTitle: "Maa by Rigel 🌸",
      testBody: "This is a test notification. Private reminders are active and working perfectly!",
      periodTitle: "Upcoming Period Alert 🌸",
      periodBody: "Your predicted period is expected in 2 days. Be prepared!",
      ovulationTitle: "Ovulation Day 🌸",
      ovulationBody: "Today is your predicted peak ovulation day.",
      fertileTitle: "Fertile Window Begins 🌸",
      fertileBody: "Your estimated fertile window has started."
    },
    hi: {
      testTitle: "माँ द्वारा रिगेल 🌸",
      testBody: "यह एक परीक्षण अधिसूचना है। निजी अनुस्मारक सक्रिय हैं और पूरी तरह से काम कर रहे हैं!",
      periodTitle: "आगामी मासिक धर्म की चेतावनी 🌸",
      periodBody: "आपका अनुमानित मासिक धर्म 2 दिनों में शुरू होने की उम्मीद है। तैयार रहें!",
      ovulationTitle: "डिंबोत्सर्जन (Ovulation) का दिन 🌸",
      ovulationBody: "आज आपका अनुमानित ओव्यूलेशन दिवस है।",
      fertileTitle: "उर्वर अवधि (Fertile Window) शुरू 🌸",
      fertileBody: "आपकी अनुमानित फर्टाइल विंडो शुरू हो गई है।"
    },
    bn: {
      testTitle: "মা রিগেল দ্বারা 🌸",
      testBody: "এটি একটি পরীক্ষা নোটিফিকেশন। ব্যক্তিগত অনুস্মারক সক্রিয় এবং নিখুঁतভাবে কাজ করছে!",
      periodTitle: "আসন্ন ঋতুস্রাব নোটিফিকেশন 🌸",
      periodBody: "আপনার অনুমানকৃত পিরিয়ড ২ দিনের মধ্যে শুরু হতে পারে। প্রস্তুত থাকুন!",
      ovulationTitle: "ডিম্বস্ফোটন দিন (Ovulation) 🌸",
      ovulationBody: "আজ আপনার ডিম্বস্ফোটনের দিন।",
      fertileTitle: "উর্বর সময়কাল শুরু 🌸",
      fertileBody: "আপনার অনুমানকৃত উর্বর সময়কাল শুরু হয়েছে।"
    },
    as: {
      testTitle: "মা ঋতুস্ৰাৱ 🌸",
      testBody: "এইটো এটা পৰীক্ষামূলক জাননী। ব্যক্তিগত অনুস্মাৰক সক্ৰিয় হৈ আছে!",
      periodTitle: "আসন্ন ঋতুস্ৰাৱৰ সৰ্তকবাণী 🌸",
      periodBody: "আপোনাৰ আনুমানিক ঋতুস্ৰাৱ ২ দিনৰ ভিতৰত আৰম্ভ হ’ব পাৰে। সাজু থাকক!",
      ovulationTitle: "ডিম্বস্ফোটন দিন 🌸",
      ovulationBody: "আজি আপোনাৰ আনুমানিক ডিম্বস্ফোটন দিন।",
      fertileTitle: "উৰ্বৰ দিন আৰম্ভ 🌸",
      fertileBody: "আপোনাৰ আনুমানিক উৰ্বৰ উইণ্ড’ আৰম্ভ হৈছে।"
    },
    brx: {
      testTitle: "मा मासिक धर्म 🌸",
      testBody: "बेयो मोनसे आनजाद फोरमानलाइ। सावस्रि साननाय मोजाङै चोलिबाय थादों!",
      periodTitle: "मासिक धर्म सिगां सावस्रि 🌸",
      periodBody: "नोंथांनि साननाय मासिक धर्मआ २ साननि उनाव जागोन। सांग्रां जा!",
      ovulationTitle: "अण्डोत्सर्ग सान 🌸",
      ovulationBody: "दिनै नोंथांनि अण्डोत्सर्ग सान।"
    },
    doi: {
      testTitle: "मां मासिक धर्म 🌸",
      testBody: "एह इक परीक्षण नोटीफिकेशन ऐ। निजी अनुस्मारक सक्रिय न!",
      periodTitle: "आगामी मासिक धर्म चेतावनी 🌸",
      periodBody: "तुहाडा अनुमानित मासिक धर्म २ दिनों च शुरू होन की उम्मीद ऐ। तैयार रओ!",
      ovulationTitle: "डिंबोत्सर्जन दिन 🌸",
      ovulationBody: "अज्ज तुहाडा ओव्यूलेशन दिवस ऐ।"
    },
    gom: {
      testTitle: "मा भलायकी अहवाल 🌸",
      testBody: "ही एक चाचणी नोटीफिकेशन आसा. खाजगी अनुस्मारक कार्यन्वित आसात!",
      periodTitle: "येत्या मासिक पाळीची शिफारस 🌸",
      periodBody: "तुमची अंदाजीत मासिक पाळी २ दिसांनी सुरू जावपाची शक्यता आसा. तयार रावात!",
      ovulationTitle: "अण्डोत्सर्ग दीस 🌸",
      ovulationBody: "आज तुमचो अंदाजीत ओव्हुलेशन दीस आसा."
    },
    gu: {
      testTitle: "મા માસિક ધર્મ સ્વાસ્થ્ય 🌸",
      testBody: "આ એક પરીક્ષણ સૂચના છે. વ્યક્તિગત રીમાઇન્ડર્સ સક્રિય અને ચાલુ છે!",
      periodTitle: "આગામી માસિક ધર્મની ચેતવણી 🌸",
      periodBody: "તમારું અંદાજિત માસિક ધર્મ ૨ દિવસમાં શરૂ થવાની સંભાવના છે. તૈયાર રહો!",
      ovulationTitle: "ઓવ્યુલેશન દિવસ 🌸",
      ovulationBody: "આજે તમારો અંદાજિત ઓવ્યુલેશન દિવસ છે.",
      fertileTitle: "ફળદ્રુપ સમયગાળો શરૂ 🌸",
      fertileBody: "તમારો અંદાજિત ફળદ્રુપ સમયગાળો શરૂ થઈ ગયો છે."
    },
    kn: {
      testTitle: "ಮಾ ಮುಟ್ಟಿನ ಆರೋಗ್ಯ 🌸",
      testBody: "ಇದು ಪ್ರಾಯೋಗಿಕ ಅಧಿಸೂಚನೆಯಾಗಿದೆ. ಖಾಸಗಿ ಜ್ಞಾಪನೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ!",
      periodTitle: "ಮುಂಬರುವ ಮುಟ್ಟಿನ ಎಚ್ಚರಿಕೆ 🌸",
      periodBody: "ನಿಮ್ಮ ಮುಟ್ಟು ಇನ್ನು ೨ ದಿನಗಳಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ. ಸಿದ್ಧರಾಗಿರಿ!",
      ovulationTitle: "ಅಂಡೋತ್ಪತ್ತಿ ದಿನ 🌸",
      ovulationBody: "ಇಂದು ನಿಮ್ಮ ಅಂಡೋತ್ಪತ್ತಿ ದಿನವಾಗಿದೆ.",
      fertileTitle: "ಫಲವತ್ತಾದ ದಿನಗಳು ಪ್ರಾರಂಭ 🌸",
      fertileBody: "ನಿಮ್ಮ ಅಂದಾಜು ಫಲವತ್ತಾದ ದಿನಗಳು ಪ್ರಾರಂಭವಾಗಿವೆ."
    },
    ks: {
      testTitle: "माہواری صحت رپورٹ 🌸",
      testBody: "येह छु अख टेस्ट नोटिफिकेशन। तवज्जो करिव!",
      periodTitle: "माहवारी हुंद अंदेशा 🌸",
      periodBody: "तौहंद माहवारी छु २ दोहन अंदेश शुरू गछुन। तय्यार रहिव!",
      ovulationTitle: "ओव्यूलेशन दुह 🌸",
      ovulationBody: "अज़ छु तोहुंद ओव्यूलेशन दुह।"
    },
    mai: {
      testTitle: "माँ मासिक धर्म 🌸",
      testBody: "ई एकटा परीक्षण नोटीफिकेशन अछि। निजी अनुस्मारक सक्रिय अछि!",
      periodTitle: "आगामी मासिक धर्म चेतावनी 🌸",
      periodBody: "अहाँक अनुमानित मासिक धर्म २ दिन में शुरू होयबाक उम्मीद अछि। तैयार रहू!",
      ovulationTitle: "अंडोत्सर्ग दिन 🌸",
      ovulationBody: "आजु अहाँक ओव्यूलेशन दिवस अछि।"
    },
    ml: {
      testTitle: "മാ ആർത്തവ ആരോഗ്യം 🌸",
      testBody: "ഇതൊരു പരീക്ഷണ നോട്ടിഫിക്കേഷനാണ്. വ്യക്തിഗത ഓർമ്മപ്പെടുത്തലുകൾ സജീവമാണ്!",
      periodTitle: "ആർത്തവ മുന്നറിയിപ്പ് 🌸",
      periodBody: "നിങ്ങളുടെ ആർത്തവം 2 ദിവസത്തിനുള്ളിൽ ആരംഭിക്കാൻ സാധ്യതയുണ്ട്. തയ്യാറായിരിക്കുക!",
      ovulationTitle: "അണ്ഡോത്സർഗ്ഗ ദിവസം 🌸",
      ovulationBody: "ഇന്ന് നിങ്ങളുടെ അണ്ഡോത്സർഗ്ഗ ദിവസമാണ്.",
      fertileTitle: "ഫലഭൂയിഷ്ഠമായ സമയം ആരംഭിച്ചു 🌸",
      fertileBody: "നിങ്ങളുടെ ഫലഭൂയിഷ്ഠമായ സമയം ആരംഭിച്ചിരിക്കുന്നു."
    },
    mni: {
      testTitle: "মা থা নাইবগী হকশেল 🌸",
      testBody: "অকুপ্পা ফোরকাস্ত নোতিফিকেশননি। সৈকল নুমিৎ সক্ৰিয় ওইরি!",
      periodTitle: "থা নাইবগী সর্তকবাণী 🌸",
      periodBody: "নুমিৎ ২ নিগী মনুংদা থা নাইবা হৌরগনি। চেকশিন্না লৈয়ু!",
      ovulationTitle: "ওভুলেশন নুমিৎ 🌸",
      ovulationBody: "ঙসি ওভুলেশন নুমিৎনি।"
    },
    mr: {
      testTitle: "मा मासिक पाळी आरोग्य 🌸",
      testBody: "ही एक चाचणी सूचना आहे. खाजगी स्मरणपत्रे सक्रिय आहेत!",
      periodTitle: "मासिक पाळीची पूर्वसूचना 🌸",
      periodBody: "तुमची मासिक पाळी २ दिवसांत सुरू होण्याची शक्यता आहे. तयार राहा!",
      ovulationTitle: "ओव्हुलेशन दिवस 🌸",
      ovulationBody: "आज तुमचा ओव्हुलेशन दिवस आहे.",
      fertileTitle: "उर्वरता कालावधी सुरू 🌸",
      fertileBody: "तुमचा उर्वरता कालावधी सुरू झाला आहे."
    },
    ne: {
      testTitle: "आमा मासिक धर्म 🌸",
      testBody: "यो एक परीक्षण सूचना हो। निजी अनुस्मारकहरू सक्रिय छन्!",
      periodTitle: "मासिक धर्म चेतावनी 🌸",
      periodBody: "तपाईंको मासिक धर्म २ दिनमा सुरु हुने अनुमान छ। तयार रहनुहोस्!",
      ovulationTitle: "अण्डोत्सर्ग दिन 🌸",
      ovulationBody: "आज तपाईंको ओव्यूलेशन दिन हो।"
    },
    or: {
      testTitle: "ମା ମାସିକ ସ୍ୱାସ୍ଥ୍ୟ 🌸",
      testBody: "ଏହା ଏକ ପରୀକ୍ଷାମୂଳକ ବିଜ୍ଞପ୍ତି। ଆପଣଙ୍କ ରିମାଇଣ୍ଡର ସକ୍ରିୟ ଅଛି!",
      periodTitle: "ଆସନ୍ନ ଋତୁସ୍ରାବ ସତର୍କତା 🌸",
      periodBody: "ଆପଣଙ୍କର ଋତୁସ୍ରାବ ୨ ଦିନ ମଧ୍ୟରେ ଆରମ୍ଭ ହେବାର ସମ୍ଭାବନା ଅଛି। ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ!",
      ovulationTitle: "ଡିମ୍ବୋତ୍ସର୍ଗ ଦିବସ 🌸",
      ovulationBody: "ଆଜି ଆପଣଙ୍କର ଡିମ୍ବୋତ୍ସର୍ଗ ଦିବସ ଅଟେ।"
    },
    pa: {
      testTitle: "ਮਾਂ ਮਾਹਵਾਰੀ ਸਿਹਤ 🌸",
      testBody: "ਇਹ ਇੱਕ ਟੈਸਟ ਨੋਟੀਫਿਕੇਸ਼ਨ ਹੈ। ਨਿੱਜੀ ਰੀਮਾਈਂਡਰ ਸਰਗਰਮ ਹਨ!",
      periodTitle: "ਮਾਹਵਾਰੀ ਸੰਬੰਧੀ ਚੇਤਾਵਨੀ 🌸",
      periodBody: "ਤੁਹਾਡੀ ਮਾਹਵਾਰੀ ੨ ਦਿਨਾਂ ਵਿੱਚ ਸ਼ੁਰੂ ਹੋਣ ਦੀ ਉਮੀਦ ਹੈ। ਤਿਆਰ ਰਹੋ!",
      ovulationTitle: "ਅੰਡਕੋਸ਼ ਦਾ ਦਿਨ 🌸",
      ovulationBody: "ਅੱਜ ਤੁਹਾਡਾ ਅੰਡਕੋਸ਼ ਦਿਨ ਹੈ।"
    },
    sa: {
      testTitle: "मा मासिक धर्म स्वास्थ्य विवरणम् 🌸",
      testBody: "एषः एकः परीक्षण संदेशः अस्ति। सर्वं सम्यक् कार्यं करोति!",
      periodTitle: "रजःस्राव काल चेतावनी 🌸",
      periodBody: "भवत्याः अनुमानितः रजःस्रावः द्वयोः दिवसयोः प्रवृत्तः भविष्यति। सज्जता भवतु!",
      ovulationTitle: "डिम्बोत्सर्ग दिवसः 🌸",
      ovulationBody: "अद्य भवत्याः डिम्बोत्सर्ग दिवसः अस्ति।"
    },
    sat: {
      testTitle: "ᱢᱟ ᱢᱟᱦᱟᱣᱟᱨᱤ 🌸",
      testBody: "ᱱᱚᱣᱟ ᱫᱚ ᱢᱤᱫ ᱵᱤᱰᱟᱹᱣ ᱠᱟᱱᱟ᱾ ᱟᱯᱱᱟᱨᱟᱜ ᱨᱤᱢᱟᱭᱤᱱᱰᱟᱨ ᱪᱟᱹᱞᱩ ᱢᱮᱱᱟᱜ-ᱟ!",
      periodTitle: "ᱦᱤᱡᱩᱜ ᱠᱟᱱ ᱢᱟᱦᱟᱣᱟᱨᱤ 🌸",
      periodBody: "ᱟᱯᱱᱟᱨᱟᱜ ᱢᱟᱦᱟᱣᱟᱨᱤ ᱒ ᱢᱟᱦᱟᱸ ᱨᱮ ᱦᱩᱭᱩᱜ-ᱟ᱾ ᱥᱟᱯᱲᱟᱣ ᱛᱟᱦᱮᱸᱱ ᱢᱮ!",
      ovulationTitle: "ᱟᱱᱰᱠᱚᱥ ᱢᱟᱦᱟᱸ 🌸",
      ovulationBody: "ᱛᱮᱦᱮᱧ ᱫᱚ ᱟᱯᱱᱟᱨᱟᱜ ᱟᱱᱰᱠᱚᱥ ᱢᱟᱦᱟᱸ ᱠᱟᱱᱟ।"
    },
    sd: {
      testTitle: "ما ماهواري صحت 🌸",
      testBody: "هي هڪ ٽيسٽ نوٽيفڪيشن آهي. رازداري وارو ريماينڊر فعال آهي!",
      periodTitle: "ماهواري جي اڳواٽ چيتاوني 🌸",
      periodBody: "توهان جي ماهواري ۲ ڏينهن ۾ شروع ٿيڻ جي اميد آهي. تيار رهو!",
      ovulationTitle: "اووليوشن ڏينهن 🌸",
      ovulationBody: "اڄ توهان جي اووليوشن جو ڏينهن آهي."
    },
    ta: {
      testTitle: "மா மாதவிடாய் சுகாதாரம் 🌸",
      testBody: "இது ஒரு சோதனை அறிவிப்பு. தனிப்பட்ட நினைவூட்டல்கள் செயலில் உள்ளன!",
      periodTitle: "மாதவிடாய் எச்சரிக்கை 🌸",
      periodBody: "உங்களது மாதவிடாய் இன்னும் 2 நாட்களில் தொடங்க வாய்ப்புள்ளது. தயாராக இருங்கள்!",
      ovulationTitle: "கருமுட்டை வெளியீட்டு நாள் 🌸",
      ovulationBody: "இன்று உங்கள் கருமுட்டை வெளியீட்டு நாள் ஆகும்.",
      fertileTitle: "கருவுறுதல் காலம் தொடக்கம் 🌸",
      fertileBody: "உங்களது கருவுறுதல் காலம் தொடங்கியுள்ளது."
    },
    te: {
      testTitle: "మా రుతుచక్ర ఆరోగ్యం 🌸",
      testBody: "ఇది ఒక ప్రాయోగిక నోటిఫికేషన్. ప్రైవేట్ రిమైండర్‌లు పనిచేస్తున్నాయి!",
      periodTitle: "రుతుస్రావం ముందస్తు హెచ్చరిక 🌸",
      periodBody: "మీ రుతుస్రావం మరో 2 రోజుల్లో ప్రారంభం కావచ్చు. సిద్ధంగా ఉండండి!",
      ovulationTitle: "అండోత్పత్తి రోజు 🌸",
      ovulationBody: "ఈ రోజు మీ అండోత్పత్తి రోజు.",
      fertileTitle: "ఫలవంతమైన రోజులు ప్రారంభం 🌸",
      fertileBody: "మీ ఫలవంతమైన రోజులు ప్రారంభమయ్యాయి."
    },
    ur: {
      testTitle: "ماں ماہواری صحت 🌸",
      testBody: "یہ ایک ٹیسٹ نوٹیفکیشن ہے۔ نجی ریمائنڈر فعال ہے!",
      periodTitle: "ماہواری کی پیشگی اطلاع 🌸",
      periodBody: "آپ کی ماہواری ۲ دنوں میں شروع ہونے کی توقع ہے۔ تیار رہیں!",
      ovulationTitle: "اوولیشن کا دن 🌸",
      ovulationBody: "آج آپ کا اوولیشن کا دن ہے۔"
    }
  };

  // Populate dynamic keys in notificationTranslations for missing fertile window values
  Object.keys(notificationTranslations).forEach(lang => {
    if (!notificationTranslations[lang].fertileTitle) {
      notificationTranslations[lang].fertileTitle = notificationTranslations[lang].testTitle;
      notificationTranslations[lang].fertileBody = notificationTranslations[lang].testBody;
    }
  });

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const showLocalNotification = (title, body) => {
    const options = {
      body: body,
      icon: 'media/rigel circle logo.png',
      badge: 'media/rigel circle logo.png',
      vibrate: [100, 50, 100]
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      }).catch((err) => {
        console.error('Error showing notification via SW:', err);
        if (typeof Notification !== 'undefined') {
          new Notification(title, options);
        }
      });
    } else if (typeof Notification !== 'undefined') {
      new Notification(title, options);
    }
  };

  const updateUIState = () => {
    const enableBtn = document.getElementById('enable-notifications-btn');
    const statusText = document.getElementById('notification-status-text');
    const optionsContainer = document.getElementById('reminder-options-container');

    if (!enableBtn || !statusText || !optionsContainer) return;

    if (!('Notification' in window)) {
      statusText.textContent = "Notifications are not supported by this browser.";
      enableBtn.style.display = 'none';
      optionsContainer.style.display = 'none';
      return;
    }

    const permission = Notification.permission;

    if (permission === 'granted') {
      statusText.textContent = "Notification access is active. Configure your alerts below.";
      enableBtn.style.display = 'none';
      optionsContainer.style.display = 'flex';
    } else if (permission === 'denied') {
      statusText.textContent = "Permission denied. Please enable notifications in your browser settings to receive reminders.";
      enableBtn.disabled = true;
      enableBtn.innerHTML = `<i data-lucide="bell-off"></i> Access Denied`;
      optionsContainer.style.display = 'none';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
      statusText.textContent = "Enable notifications to toggle specific reminders.";
      enableBtn.style.display = 'flex';
      enableBtn.disabled = false;
      optionsContainer.style.display = 'none';
    }
  };

  const init = () => {
    updateUIState();

    const enableBtn = document.getElementById('enable-notifications-btn');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(() => {
          updateUIState();
        });
      });
    }

    const periodToggle = document.getElementById('reminder-period-toggle');
    const ovulationToggle = document.getElementById('reminder-ovulation-toggle');
    const fertileToggle = document.getElementById('reminder-fertile-toggle');
    const testBtn = document.getElementById('test-reminder-btn');

    // Load saved preferences
    if (periodToggle) {
      periodToggle.checked = localStorage.getItem('maa_reminder_period') !== 'false';
      periodToggle.addEventListener('change', (e) => {
        localStorage.setItem('maa_reminder_period', e.target.checked);
      });
    }

    if (ovulationToggle) {
      ovulationToggle.checked = localStorage.getItem('maa_reminder_ovulation') !== 'false';
      ovulationToggle.addEventListener('change', (e) => {
        localStorage.setItem('maa_reminder_ovulation', e.target.checked);
      });
    }

    if (fertileToggle) {
      fertileToggle.checked = localStorage.getItem('maa_reminder_fertile') === 'true';
      fertileToggle.addEventListener('change', (e) => {
        localStorage.setItem('maa_reminder_fertile', e.target.checked);
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', () => {
        if (Notification.permission === 'granted') {
          const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
          const t = notificationTranslations[activeLang] || notificationTranslations.en;
          showLocalNotification(t.testTitle, t.testBody);
        } else {
          alert("Please enable notification permissions first.");
        }
      });
    }
  };

  const checkAndTriggerCycleReminders = (lastPeriodStr, cycleLengthVal, periodDurationVal) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const periodEnabled = localStorage.getItem('maa_reminder_period') !== 'false';
    const ovulationEnabled = localStorage.getItem('maa_reminder_ovulation') !== 'false';
    const fertileEnabled = localStorage.getItem('maa_reminder_fertile') === 'true';

    if (!periodEnabled && !ovulationEnabled && !fertileEnabled) return;

    const activeLang = (typeof LangModule !== 'undefined' && LangModule.getLang) ? LangModule.getLang() : 'en';
    const t = notificationTranslations[activeLang] || notificationTranslations.en;

    const lastDate = new Date(lastPeriodStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cycleLength = cycleLengthVal || 28;

    // Loop forward to find next expected period start strictly in the future
    let nextDateObj = new Date(lastDate);
    if (nextDateObj <= today) {
      while (nextDateObj <= today) {
        nextDateObj.setDate(nextDateObj.getDate() + cycleLength);
      }
    }

    // Calculations for reminders
    const ovulationDate = new Date(nextDateObj);
    ovulationDate.setDate(nextDateObj.getDate() - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(ovulationDate.getDate() - 5);

    const todayStr = getLocalDateString(today);
    const nextDateStr = getLocalDateString(nextDateObj);
    const ovulationDateStr = getLocalDateString(ovulationDate);
    const fertileStartStr = getLocalDateString(fertileStart);

    // Load notified dates database
    const notifiedDates = JSON.parse(localStorage.getItem('maa_notified_dates') || '{}');

    // Period Alert (2 days before)
    if (periodEnabled) {
      const periodAlertDate = new Date(nextDateObj);
      periodAlertDate.setDate(nextDateObj.getDate() - 2);
      const periodAlertDateStr = getLocalDateString(periodAlertDate);

      if (todayStr === periodAlertDateStr) {
        const periodKey = `period_${nextDateStr}`;
        if (!notifiedDates[periodKey]) {
          showLocalNotification(t.periodTitle, t.periodBody);
          notifiedDates[periodKey] = true;
          localStorage.setItem('maa_notified_dates', JSON.stringify(notifiedDates));
        }
      }
    }

    // Ovulation Alert
    if (ovulationEnabled) {
      if (todayStr === ovulationDateStr) {
        const ovulationKey = `ovulation_${ovulationDateStr}`;
        if (!notifiedDates[ovulationKey]) {
          showLocalNotification(t.ovulationTitle, t.ovulationBody);
          notifiedDates[ovulationKey] = true;
          localStorage.setItem('maa_notified_dates', JSON.stringify(notifiedDates));
        }
      }
    }

    // Fertile Window Alert
    if (fertileEnabled) {
      if (todayStr === fertileStartStr) {
        const fertileKey = `fertile_${fertileStartStr}`;
        if (!notifiedDates[fertileKey]) {
          showLocalNotification(t.fertileTitle, t.fertileBody);
          notifiedDates[fertileKey] = true;
          localStorage.setItem('maa_notified_dates', JSON.stringify(notifiedDates));
        }
      }
    }
  };

  return { init, checkAndTriggerCycleReminders, updateUIState };
})();


let knowledgeBaseGlobal = [];

window.openDisorderModal = (term, def) => {
  let modal = document.getElementById('medical-term-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'medical-term-modal';
    modal.style.position = 'fixed';
    modal.style.bottom = '20px';
    modal.style.right = '20px';
    modal.style.width = '300px';
    modal.style.background = '#fff';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    modal.style.borderRadius = '12px';
    modal.style.padding = '1.2rem';
    modal.style.zIndex = '999999';
    modal.style.borderLeft = '4px solid var(--color-crimson)';
    modal.style.transition = 'all 0.3s ease';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
      <h4 style="margin: 0; color: var(--color-crimson); text-transform: capitalize; font-size: 1.1rem; padding-right: 1rem;">${term}</h4>
      <button onclick="document.getElementById('medical-term-modal').style.display='none'" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted); line-height: 1; padding: 0;">&times;</button>
    </div>
    <p style="margin: 0; font-size: 0.95rem; color: var(--color-text); line-height: 1.5;">${def}</p>
  `;
  modal.style.display = 'block';
};

// --- App Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  LangModule.init();
  ContentLoader.init();
  TrackerModule.init();
  QAModule.init();
  UIModule.init();
  TabsModule.init();
  BlogsModule.init();
  ScrollSpyModule.init();
  RemindersModule.init();


  // Generic Modal Logic for Flowchart Popups
  const infoBtns = document.querySelectorAll('.info-btn');
  const closeBtns = document.querySelectorAll('.close-btn[data-close]');

  infoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  });

  // Close modals on outside click (applies to all elements with class "modal")
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // SOS Modal Logic
  const sosBtn = document.getElementById('sos-btn');
  const sosModal = document.getElementById('sos-modal');
  const closeSosBtn = document.getElementById('close-sos-modal');
  if (sosBtn && sosModal) {
    sosBtn.addEventListener('click', () => {
      sosModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
    closeSosBtn.addEventListener('click', () => {
      sosModal.classList.add('hidden');
      document.body.style.overflow = '';
    });
    sosModal.addEventListener('click', (e) => {
      if (e.target === sosModal) {
        sosModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }

  // --- Premium UI Enhancements (Scroll Reveal, Counter, Scroll Progress, Typed.js, AOS) ---

  // --- AOS Initialization ---
  const initAOS = () => {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 900,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
        delay: 50
      });
    }
  };

  // --- Typed.js Hero Title Animation ---
  let typedInstance = null;
  const initTypedEffect = () => {
    const el = document.getElementById('hero-headline');
    if (!el) return;

    if (typedInstance) {
      typedInstance.destroy();
    }

    const lang = LangModule.getLang();
    const translations = LangModule.getTranslations();
    const defaultText = translations.hero?.headline || 'Empowering Women Through Awareness & Care';

    let strings = [defaultText];
    if (lang === 'en') {
      strings = [
        'Empowering Women Through Awareness & Care',
        'Your Completely Safe & Private Period Tracker',
        'Instant Access to Clinical Health Insights',
        'Ask Anything Anonymously, No Login Required'
      ];
    } else if (lang === 'hi') {
      strings = [
        'जागरूकता और देखभाल के माध्यम से महिलाओं का सशक्तिकरण',
        'आपका पूरी तरह से सुरक्षित और निजी पीरियड ट्रैकर',
        'चिकित्सीय स्वास्थ्य संबंधी जानकारियाँ तुरंत पाएँ',
        'बिना लॉग इन किए गुमनाम रूप से कुछ भी पूछें'
      ];
    }

    // Strip double quotes, single quotes, and smart quotes from the start and end of all strings
    strings = strings.map(s => s.replace(/^["'“‟”«»]+|["'“‟”«»]+$/g, '').trim());

    typedInstance = new Typed('#hero-headline', {
      strings: strings,
      typeSpeed: 45,
      backSpeed: 25,
      backDelay: 3000,
      loop: true,
      showCursor: true,
      cursorChar: '🌸',
      contentType: 'html'
    });
  };

  // Expose initTypedEffect to the window context so it can be re-triggered when language updates
  window.initTypedEffect = initTypedEffect;

  // --- Scroll Reveal Expanding Underlines ---
  const initScrollReveal = () => {
    const revealEls = document.querySelectorAll('.reveal, .section-title');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseFloat(el.style.animationDelay || '0') * 1000;
          setTimeout(() => {
            el.classList.add('visible');
          }, delay);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => obs.observe(el));
  };

  // --- GSAP Stats Counter Animations ---
  const initCounterAnimations = () => {
    const counters = document.querySelectorAll('.js-counter');
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      counters.forEach(el => {
        const target = parseInt(el.dataset.target || '0');
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';

        const counterObj = { value: 0 };

        gsap.to(counterObj, {
          value: target,
          duration: 2.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none"
          },
          onUpdate: () => {
            el.textContent = prefix + Math.round(counterObj.value) + suffix;
          }
        });
      });
    } else {
      // Fallback IntersectionObserver animation in case GSAP fails to load
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target || '0');
            const suffix = el.dataset.suffix || '';
            const prefix = el.dataset.prefix || '';
            const duration = 1800;
            const start = performance.now();
            const animate = (now) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = prefix + Math.round(eased * target) + suffix;
              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            requestAnimationFrame(animate);
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(el => obs.observe(el));
    }
  };

  // --- Scroll Progress Bar ---
  const initScrollProgress = () => {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        bar.style.width = (scrollTop / docHeight * 100) + '%';
      }
    }, { passive: true });
  };



  // --- 3D Card Tilt ---
  const init3DTilt = () => {
    if (typeof VanillaTilt !== 'undefined') {
      const cards = document.querySelectorAll('.learn-card, .disorder-card, .scheme-card, .scheme-card-rich, .glassmorphism-card');
      VanillaTilt.init(cards, {
        max: 4,
        speed: 400,
        glare: true,
        "max-glare": 0.15,
        scale: 1.02,
        perspective: 1000,
        easing: "cubic-bezier(.03,.98,.52,.99)"
      });
    }
  };
  window.init3DTilt = init3DTilt;

  // Clean up data-theme and theme storage
  document.documentElement.removeAttribute('data-theme');
  localStorage.removeItem('maa_theme');

  // Bootstrap all premium animations
  initAOS();
  initTypedEffect();
  initScrollReveal();
  initCounterAnimations();
  initScrollProgress();
  init3DTilt();
});

