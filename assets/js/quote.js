/**
 * GreenFox Energy - Solar Quote Funnel
 * Handles the multi-step quiz flow with conditional logic
 * Integrates with HubSpot Forms API
 */

// ============================================
// HUBSPOT CONFIGURATION
// Replace these with your actual HubSpot IDs
// ============================================
const HUBSPOT_CONFIG = {
  portalId: '143575537',
  formGuid: '81021992-c352-46a7-83c9-7729dda910da'
};

// ============================================
// MAPBOX CONFIGURATION
// Create a free account at mapbox.com and paste your public token below.
// Tokens are safe for client-side use when restricted by domain.
// ============================================
const MAPBOX_CONFIG = {
  accessToken: 'YOUR_MAPBOX_TOKEN',  // e.g., 'pk.eyJ1Ijoi...'
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  defaultZoom: 17,
  defaultCenter: [-3.19, 55.95],     // Scotland fallback (Edinburgh)
};

/* STRIPE CONFIGURATION — disabled, kept for future payment flow
const STRIPE_CONFIG = {
  publishableKey: '',
  successUrl: window.location.origin + '/quote.html?payment=success',
  cancelUrl:  window.location.origin + '/quote.html?payment=cancelled',
};
*/

// ============================================
// PACKAGE PRICING — fetched from /api/pricing, fallback below
// ============================================
const PRICING_FALLBACK = {
  panelUnitPrice: 400,
  panelMin: 4,
  panelMax: 14,
  panelWattage: 455,
  batteries: {
    none:      { label: 'No battery',        price: 0    },
    duracell:  { label: 'Duracell 5 kWh',    price: 2500 },
    sigenergy: { label: 'Sigenergy 10 kWh',  price: 3500 },
    tesla:     { label: 'Tesla Powerwall 3',  price: 4500 },
  },
  addons: {
    'ev-charger':      { label: 'EV Charger',      price: 999 },
    'backup-gateway':  { label: 'Backup Gateway',   price: 950 },
    'solo-diverter':   { label: 'Solar Diverter',  price: 650 },
  },
  included: {
    'bird-protection': { label: 'Bird Protection',  price: 0 },
  },
};

/** Active pricing: either from API or fallback. Normalised to PRICING shape for UI. */
let PRICING = JSON.parse(JSON.stringify(PRICING_FALLBACK));
let DYNAMIC_PRICING = null; // Full API response when available

/** Map home_size to tier: small→lower, medium→mid, large→upper, unsure→mid */
function getTierFromHomeSize(homeSize) {
  const map = { small: 'lower', medium: 'mid', large: 'upper', unsure: 'mid' };
  return map[homeSize] || 'mid';
}

/** Fetch pricing from /api/pricing and store in DYNAMIC_PRICING + PRICING */
async function fetchPricing() {
  try {
    const base = window.location.origin;
    const res = await fetch(`${base}/api/pricing`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    DYNAMIC_PRICING = data;
    // Merge into PRICING for UI compatibility (batteries, addons labels/prices)
    PRICING.panelMin = data.panelMin ?? PRICING_FALLBACK.panelMin;
    PRICING.panelMax = data.panelMax ?? PRICING_FALLBACK.panelMax;
    PRICING.panelWattage = data.panelWattage ?? PRICING_FALLBACK.panelWattage;
    for (const [key, b] of Object.entries(data.batteries || {})) {
      PRICING.batteries[key] = PRICING.batteries[key] || {};
      PRICING.batteries[key].label = b.name;
      PRICING.batteries[key].price = b.base_price;
    }
    for (const [key, a] of Object.entries(data.addons || {})) {
      PRICING.addons[key] = PRICING.addons[key] || {};
      PRICING.addons[key].label = a.name;
      PRICING.addons[key].price = a.price;
    }
    return true;
  } catch (err) {
    console.warn('Pricing API unavailable, using fallback:', err.message);
    DYNAMIC_PRICING = null;
    PRICING = JSON.parse(JSON.stringify(PRICING_FALLBACK));
    return false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchPricing();

  const form = document.getElementById('solarQuiz');
  const progressFill = document.getElementById('progressFill');
  const backBtn = document.getElementById('backBtn');
  const quoteSummary = document.getElementById('quoteSummary');

  const allSteps = Array.from(form.querySelectorAll('.quiz-step'));
  
  let currentStepIndex = 0;
  let stepHistory = [0];
  let formData = { solarStatus: 'not-yet' };
  let isSubmitting = false;
  
  const stepFlow = {
    default:  [2, 3, 4, 5, 6, 8, 9, 'calculating', 'package', 'order-summary'],
    business: [2, '3b', 4, 5, 6, 8, 9, 'calculating', 'package', 'order-summary']
  };
  
  /**
   * Get the appropriate step flow based on user selections
   */
  function getStepFlow() {
    const location = formData.location;
    const systemSize = formData.systemSize;
    
    let flow;
    if (location === 'business') {
      flow = [...stepFlow.business];
    } else {
      flow = [...stepFlow.default];
    }
    
    if (systemSize === 'unsure') {
      const step4Index = flow.indexOf(4);
      if (step4Index !== -1 && flow.indexOf('4b') === -1) {
        flow.splice(step4Index + 1, 0, '4b');
      }
    }
    
    return flow;
  }
  
  function getStepElement(stepId) {
    return form.querySelector(`.quiz-step[data-step="${stepId}"]`);
  }
  
  function updateProgress() {
    const flow = getStepFlow();
    const currentFlowIndex = flow.indexOf(getCurrentStepId());
    const progress = Math.min(100, Math.max(0, ((currentFlowIndex + 1) / flow.length) * 100));
    progressFill.style.width = `${progress}%`;
    updateProgressLabels(currentFlowIndex, flow);
  }

  function updateProgressLabels(idx, flow) {
    const labels = document.querySelectorAll('#progressLabels span');
    if (!labels.length) return;

    const stepId = flow[idx];
    const labelMap = {
      home:    [1, 2, 3, '3b'],
      system:  [4, '4b', 5, 6],
      details: [8, 9],
      quote:   ['calculating', 'package', 'order-summary'],
    };

    labels.forEach(label => {
      const key = label.dataset.label;
      const steps = labelMap[key] || [];
      const stepsInFlow = steps.filter(s => flow.includes(s));
      const firstIdx = stepsInFlow.length ? flow.indexOf(stepsInFlow[0]) : 999;
      const lastIdx  = stepsInFlow.length ? flow.indexOf(stepsInFlow[stepsInFlow.length - 1]) : -1;

      label.classList.remove('is-active', 'is-done');
      if (idx >= firstIdx && idx <= lastIdx) {
        label.classList.add('is-active');
      } else if (idx > lastIdx && lastIdx >= 0) {
        label.classList.add('is-done');
      }
    });
  }
  
  function getCurrentStepId() {
    const flow = getStepFlow();
    return flow[currentStepIndex] || flow[0];
  }
  
  const funnelStepsWithTrustpilot = [2, 3, 4, 5, 6, 8, 9, '3b', '4b'];

  function showStep(stepId) {
    allSteps.forEach(step => step.classList.remove('is-active'));
    
    const targetStep = getStepElement(stepId);
    if (targetStep) {
      targetStep.classList.add('is-active');
    }

    const trustpilotCard = document.getElementById('quizTrustpilotCard');
    const trustpilotPlaceholder = document.getElementById('quizTrustpilotPlaceholder');
    if (trustpilotCard && trustpilotPlaceholder) {
      const showTrustpilot = funnelStepsWithTrustpilot.includes(stepId);
      if (showTrustpilot && targetStep) {
        targetStep.appendChild(trustpilotCard);
        trustpilotCard.setAttribute('aria-hidden', 'false');
      } else {
        trustpilotPlaceholder.appendChild(trustpilotCard);
        trustpilotCard.setAttribute('aria-hidden', 'true');
      }
    }
    
    if (stepHistory.length > 1) {
      backBtn.classList.add('is-visible');
    } else {
      backBtn.classList.remove('is-visible');
    }

    if (stepId === 'calculating') {
      backBtn.classList.remove('is-visible');
      setTimeout(() => { goToNextStep(); }, 2200);
    }
    if (stepId === 'package') {
      initPackageFromQuiz();
      initInstallMap();
    }
    if (stepId === 'order-summary') {
      populateOrderSummary();
    }
    
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const firstInput = targetStep?.querySelector('input:not([type="radio"]):not([type="checkbox"]), textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
  
  // BUG A FIX: push the NEW index so back navigation works correctly
  function goToNextStep() {
    const flow = getStepFlow();
    const nextIndex = currentStepIndex + 1;
    
    if (nextIndex < flow.length) {
      currentStepIndex = nextIndex;
      stepHistory.push(currentStepIndex);
      showStep(flow[nextIndex]);
    }
  }
  
  function goToPrevStep() {
    if (stepHistory.length > 1) {
      stepHistory.pop();
      currentStepIndex = stepHistory[stepHistory.length - 1];
      const flow = getStepFlow();
      showStep(flow[currentStepIndex]);
    }
  }
  
  // BUG F FIX: show visual error states on invalid inputs
  function showInputError(input, message) {
    input.classList.add('quiz-input--error');
    let errorEl = input.parentElement.querySelector('.quiz-input-error');
    if (!errorEl && message) {
      errorEl = document.createElement('span');
      errorEl.className = 'quiz-input-error';
      errorEl.textContent = message;
      input.parentElement.appendChild(errorEl);
    }
    setTimeout(() => {
      input.classList.remove('quiz-input--error');
      if (errorEl) errorEl.remove();
    }, 3000);
  }

  function clearInputErrors(step) {
    step.querySelectorAll('.quiz-input--error').forEach(el => el.classList.remove('quiz-input--error'));
    step.querySelectorAll('.quiz-input-error').forEach(el => el.remove());
  }
  
  function validateCurrentStep() {
    const flow = getStepFlow();
    const currentStepId = flow[currentStepIndex];
    const currentStep = getStepElement(currentStepId);
    
    if (!currentStep) return true;
    clearInputErrors(currentStep);
    
    if (currentStepId === '4b') {
      return calculatedSystemSize !== null;
    }
    
    const radioGroups = currentStep.querySelectorAll('input[type="radio"][required]');
    if (radioGroups.length > 0) {
      const groupName = radioGroups[0].name;
      const checked = currentStep.querySelector(`input[name="${groupName}"]:checked`);
      if (!checked) {
        return false;
      }
    }
    
    const textInputs = currentStep.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]');
    for (const input of textInputs) {
      if (!input.value.trim()) {
        input.focus();
        showInputError(input, 'This field is required');
        return false;
      }
      if (input.pattern && !new RegExp(input.pattern).test(input.value.trim())) {
        input.focus();
        showInputError(input, input.dataset.errorMsg || 'Please check this field');
        return false;
      }
    }
    
    const requiredCheckbox = currentStep.querySelector('input[type="checkbox"][required]');
    if (requiredCheckbox && !requiredCheckbox.checked) {
      return false;
    }
    
    return true;
  }
  
  function collectStepData() {
    const flow = getStepFlow();
    const currentStepId = flow[currentStepIndex];
    const currentStep = getStepElement(currentStepId);
    
    if (!currentStep) return;
    
    const radios = currentStep.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(radio => {
      formData[radio.name] = radio.value;
    });
    
    const inputs = currentStep.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea');
    inputs.forEach(input => {
      if (input.name && input.value.trim()) {
        formData[input.name] = input.value.trim();
      }
    });
    
    const checkboxes = currentStep.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      formData[checkbox.name] = checkbox.checked;
    });
  }
  
  function showSuccess() {
    allSteps.forEach(step => step.classList.remove('is-active'));
    
    const successStep = getStepElement('success');
    if (successStep) {
      successStep.classList.add('is-active');
    }
    
    backBtn.classList.remove('is-visible');
    buildSummary();
    progressFill.style.width = '100%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* showPaymentSuccess() — disabled, kept for future payment flow
  function showPaymentSuccess() {
    allSteps.forEach(step => step.classList.remove('is-active'));
    const payStep = getStepElement('payment-success');
    if (payStep) payStep.classList.add('is-active');
    backBtn.classList.remove('is-visible');
    populatePaymentSuccess();
    progressFill.style.width = '100%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  */

  // BUG H FIX: show error screen when submission fails
  function showSubmitError(err) {
    allSteps.forEach(step => step.classList.remove('is-active'));
    const errorStep = getStepElement('submit-error');
    if (errorStep) {
      errorStep.classList.add('is-active');
      const errEl = errorStep.querySelector('.submit-error__details');
      if (errEl) {
        errEl.textContent = err ? (typeof err === 'string' ? err : JSON.stringify(err, null, 2)) : '';
        errEl.style.display = err ? 'block' : 'none';
      }
    }
    backBtn.classList.remove('is-visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // BUG D FIX: escape all user-provided values before rendering in summary
  function buildSummary() {
    if (!quoteSummary) return;
    
    const labels = {
      solarStatus: 'Solar status',
      location: 'Property location',
      propertyType: 'Property type',
      systemSize: 'System size',
      monthlyBill: 'Monthly electricity bill',
      battery: 'Battery storage',
      timeline: 'Timeline',
      supportType: 'Support needed',
      postcode: 'Postcode',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone'
    };
    
    const displayValues = {
      'not-yet': 'New to solar',
      'yes-working': 'Has solar - working',
      'yes-unsure': 'Has solar - needs check',
      'home': 'Home',
      'business': 'Business',
      'detached': 'Detached house',
      'semi-detached': 'Semi-detached',
      'terraced': 'Terraced house',
      'bungalow': 'Bungalow',
      'flat': 'Flat',
      'office': 'Office',
      'warehouse': 'Warehouse',
      'retail': 'Retail',
      'farm': 'Farm / Agricultural',
      'small': '2 Bedroom House',
      'medium': '3-4 Bedroom House',
      'large': '5+ Bedroom House',
      'unsure': 'Not sure yet',
      'yes': 'Yes, interested',
      'maybe': 'Maybe',
      'no': 'Not right now',
      'asap': 'As soon as possible',
      '1-3-months': 'Within 1-3 months',
      '3-6-months': '3-6 months',
      'just-exploring': 'Just exploring',
      'health-check': 'System health check',
      'add-battery': 'Add battery storage',
      'expand-system': 'Expand system',
      'maintenance': 'Maintenance plan'
    };
    
    let html = '<h3>Your quote request</h3><dl>';
    
    for (const [key, label] of Object.entries(labels)) {
      if (formData[key] && key !== 'consent' && key !== 'notes') {
        let value = displayValues[formData[key]] || escapeHtml(String(formData[key]));
        if (key === 'monthlyBill') {
          value = `&pound;${escapeHtml(String(formData[key]))}/month`;
        }
        html += `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`;
      }
    }
    
    html += '</dl>';
    quoteSummary.innerHTML = html;
  }
  
  function mapToHubSpotFields(data) {
    const fieldMapping = {
      firstName: 'firstname',
      lastName: 'lastname',
      email: 'email',
      phone: 'phone',
      postcode: 'post_code',
      location: 'commercial',
      propertyType: 'property_type',
      systemSize: 'home_size',
      battery: 'battery_interested',
      timeline: 'purchase_timeline',
      monthlyBill: 'monthly_electric_bill',
      notes: 'message',
      installLat:      'install_latitude',
      installLng:      'install_longitude',
      _packagePanels:  'quoted_panel_count',
      _packageBattery: 'quoted_battery',
      _packageAddons:  'quoted_addons',
      _packageTotal:   'quoted_total',
      _paymentStatus:  'enquiry_type',
      _callbackTime:   'preferred_callback_time',
    };

    const valueMapping = {
      'home': 'No',
      'business': 'Yes',
      'detached': 'Detached',
      'semi-detached': 'Semi-detached',
      'terraced': 'Terraced',
      'bungalow': 'Bungalow',
      'flat': 'Flat',
      'office': 'Office',
      'warehouse': 'Warehouse',
      'retail': 'Retail',
      'farm': 'Farm/Agricultural',
      'other': 'Other',
      'small': '2 Bedroom House',
      'medium': '3-4 Bedroom House',
      'large': '5+ Bedroom House',
      'unsure': 'Not sure',
      'yes': 'Yes',
      'maybe': 'Maybe',
      'no': 'No',
      'asap': 'ASAP',
      '1-3-months': '1-3 months',
      '3-6-months': '3-6 months',
      'just-exploring': 'Just exploring',
    };

    const fields = [];

    for (const [formKey, hubspotKey] of Object.entries(fieldMapping)) {
      if (data[formKey] !== undefined && data[formKey] !== '' && formKey !== 'consent') {
        let value = data[formKey];
        if (valueMapping[value]) {
          value = valueMapping[value];
        }
        fields.push({
          objectTypeId: '0-1',
          name: hubspotKey,
          value: String(value)
        });
      }
    }

    fields.push({
      objectTypeId: '0-1',
      name: 'lead_source_page',
      value: formData._funnelSource || 'Solar Quote Funnel'
    });

    return fields;
  }

  async function submitToHubSpot(data) {
    const { portalId, formGuid } = HUBSPOT_CONFIG;
    
    if (portalId === 'YOUR_PORTAL_ID' || formGuid === 'YOUR_FORM_GUID') {
      console.warn('HubSpot not configured. Form data:', data);
      return { success: true, message: 'HubSpot not configured - data logged to console' };
    }

    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`;

    const payload = {
      fields: mapToHubSpotFields(data),
      context: {
        pageUri: window.location.href,
        pageName: document.title,
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: "I agree to allow GreenFox Energy to store and process my personal data."
        }
      }
    };

    const hutk = document.cookie.match(/hubspotutk=([^;]*)/);
    if (hutk) {
      payload.context.hutk = hutk[1];
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Successfully submitted to HubSpot');
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error('HubSpot submission error:', errorData);
        return { success: false, error: errorData };
      }
    } catch (error) {
      console.error('Failed to submit to HubSpot:', error);
      return { success: false, error: error.message };
    }
  }

  // BUG B FIX: disable button and show spinner during submission
  // BUG H FIX: show error screen on failure instead of silent success
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    if (!validateCurrentStep()) return;
    
    collectStepData();
    console.log('Form submitted:', formData);
    
    const flow = getStepFlow();
    if (flow.includes('order-summary')) {
      populateOrderSummary();
      goToNextStep();
      return;
    }
    
    await doHubSpotSubmit();
  }

  async function doHubSpotSubmit(paymentStatus) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('btn--loading');
      submitBtn.textContent = 'Submitting...';
    }
    isSubmitting = true;
    
    if (paymentStatus) formData._paymentStatus = paymentStatus;
    
    try {
      const hubspotResult = await submitToHubSpot(formData);
      
      const isExistingOwner = formData.solarStatus === 'yes-working' || formData.solarStatus === 'yes-unsure';

      if (hubspotResult.success) {
        if (isExistingOwner) {
          window.location.href = 'vixen-care-plan.html';
          return;
        } else {
          showSuccess();
        }
      } else if (HUBSPOT_CONFIG.portalId === 'YOUR_PORTAL_ID') {
        if (isExistingOwner) {
          window.location.href = 'vixen-care-plan.html';
          return;
        } else {
          showSuccess();
        }
      } else {
        showSubmitError(hubspotResult.error);
      }
    } catch (err) {
      console.error('Submission error:', err);
      showSubmitError(err.message || String(err));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn--loading');
        submitBtn.textContent = originalText;
      }
      isSubmitting = false;
    }
  }
  
  // ============================================
  // ENERGY BILL CALCULATOR
  // ============================================
  const CALC_CONFIG = {
    ratePerKwh: 0.28,
    panelOutputPerYear: 350,
    panelWattage: 455,
    selfConsumptionRate: 0.50,
    exportRate: 0.15,
  };

  const calculateBtn = document.getElementById('calculatePanelsBtn');
  const monthlyBillInput = document.getElementById('monthlyBill');
  const calculatorResult = document.getElementById('calculatorResult');
  const useRecommendationBtn = document.getElementById('useRecommendationBtn');

  let calculatedSystemSize = null;

  function calculatePanels(monthlyBill) {
    const monthlyKwh = monthlyBill / CALC_CONFIG.ratePerKwh;
    const annualKwh = monthlyKwh * 12;
    const panelsNeeded = Math.ceil(annualKwh / CALC_CONFIG.panelOutputPerYear);
    const panels = Math.max(4, Math.min(panelsNeeded, 24));
    const annualGeneration = panels * CALC_CONFIG.panelOutputPerYear;
    const selfConsumed = annualGeneration * CALC_CONFIG.selfConsumptionRate;
    const exported = annualGeneration - selfConsumed;
    const savingsFromSelfUse = selfConsumed * CALC_CONFIG.ratePerKwh;
    const savingsFromExport = exported * CALC_CONFIG.exportRate;
    const totalSavings = savingsFromSelfUse + savingsFromExport;

    let sizeCategory;
    if (panels <= 8) sizeCategory = 'small';
    else if (panels <= 12) sizeCategory = 'medium';
    else sizeCategory = 'large';

    return {
      panels,
      annualKwh: Math.round(annualKwh),
      annualGeneration: Math.round(annualGeneration),
      totalSavings: Math.round(totalSavings),
      sizeCategory,
      systemKw: ((panels * CALC_CONFIG.panelWattage) / 1000).toFixed(1)
    };
  }

  function showCalculatorResult(result) {
    document.getElementById('resultPanels').textContent =
      `${result.systemKw} kW system`;
    document.getElementById('resultUsage').textContent =
      `${result.annualKwh.toLocaleString()} kWh`;
    document.getElementById('resultGeneration').textContent =
      `${result.annualGeneration.toLocaleString()} kWh`;
    document.getElementById('resultSavings').textContent =
      `\u00A3${result.totalSavings.toLocaleString()}/year`;

    calculatorResult.style.display = 'block';
    calculatorResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    calculatedSystemSize = result.sizeCategory;
  }

  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      const bill = parseFloat(monthlyBillInput.value);
      if (!bill || bill < 10) {
        monthlyBillInput.focus();
        monthlyBillInput.classList.add('quiz-input--error');
        setTimeout(() => monthlyBillInput.classList.remove('quiz-input--error'), 1500);
        return;
      }
      const result = calculatePanels(bill);
      showCalculatorResult(result);
    });
  }

  if (monthlyBillInput) {
    monthlyBillInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateBtn.click();
      }
    });
    monthlyBillInput.addEventListener('input', () => {
      calculatorResult.style.display = 'none';
      calculatedSystemSize = null;
    });
  }

  if (useRecommendationBtn) {
    useRecommendationBtn.addEventListener('click', () => {
      if (calculatedSystemSize) {
        formData.monthlyBill = monthlyBillInput.value;
        goToNextStep();
      }
    });
  }

  // ============================================
  // SATELLITE MAP — Step 8b
  // ============================================
  let installMap = null;
  let installMarker = null;

  async function geocodePostcode(postcode) {
    const token = MAPBOX_CONFIG.accessToken;
    if (!token || token === 'YOUR_MAPBOX_TOKEN') {
      console.warn('Mapbox not configured — using default coordinates');
      return MAPBOX_CONFIG.defaultCenter;
    }
    const query = encodeURIComponent(postcode + ', United Kingdom');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=GB&types=postcode,locality&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].center; // [lng, lat]
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
    return MAPBOX_CONFIG.defaultCenter;
  }

  async function initInstallMap() {
    const container = document.getElementById('install-map');
    if (!container) return;

    const postcode = formData.postcode || '';
    const coords = await geocodePostcode(postcode);

    if (typeof mapboxgl === 'undefined') {
      console.error('Mapbox GL JS not loaded');
      container.innerHTML = '<p style="padding:2rem;text-align:center;color:#666;">Map could not be loaded. You can continue without it.</p>';
      return;
    }

    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

    if (installMap) {
      installMap.remove();
      installMap = null;
    }

    installMap = new mapboxgl.Map({
      container: 'install-map',
      style: MAPBOX_CONFIG.style,
      center: coords,
      zoom: MAPBOX_CONFIG.defaultZoom,
    });

    installMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    installMarker = new mapboxgl.Marker({ color: '#2E8B57', draggable: true })
      .setLngLat(coords)
      .addTo(installMap);

    const coordsDisplay = document.getElementById('mapCoords');
    function updateCoordsDisplay(lngLat) {
      if (coordsDisplay) {
        coordsDisplay.textContent = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      }
    }
    updateCoordsDisplay({ lat: coords[1], lng: coords[0] });

    installMarker.on('dragend', () => {
      const lngLat = installMarker.getLngLat();
      updateCoordsDisplay(lngLat);
    });

    installMap.on('load', () => {
      installMap.resize();
    });
  }

  function captureMapCoords() {
    if (installMarker) {
      const lngLat = installMarker.getLngLat();
      formData.installLat = lngLat.lat.toFixed(6);
      formData.installLng = lngLat.lng.toFixed(6);
    }
  }

  // ============================================
  // PACKAGE CONFIGURATOR
  // ============================================
  const packageState = {
    panels: 8,
    batteries: { duracell: 0, sigenergy: 0, tesla: 0 },
    addons: [],
  };
  const BATTERY_MAX_QTY = 4;

  const pkgPanelCount   = document.getElementById('panelCount');
  const pkgPanelKw      = document.getElementById('panelKw');
  const pkgPanelPrice   = document.getElementById('pkgPanelPrice');
  const pkgTotal        = document.getElementById('pkgTotal');
  const pkgSavings      = document.getElementById('pkgSavings');
  const pkgSavingsAmt   = document.getElementById('pkgSavingsAmount');
  const panelMinusBtn   = document.getElementById('panelMinus');
  const panelPlusBtn    = document.getElementById('panelPlus');

  function fmtGBP(v) {
    return '\u00A3' + v.toLocaleString('en-GB', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  function calcPackageTotal() {
    const tier = getTierFromHomeSize(formData.systemSize || (calculatedSystemSize || 'medium'));

    if (DYNAMIC_PRICING) {
      const { solar_materials, batteries, installation, overheads, addons } = DYNAMIC_PRICING;
      const panelCount = packageState.panels;

      // 1. Solar materials: (panel × count) + inverter + mounting_kit + tails_glands + ct + comms
      let solarTotal = 0;
      const solar = solar_materials?.[tier];
      if (solar) {
        for (const [costKey, item] of Object.entries(solar)) {
          if (typeof item === 'object' && item !== null && 'price' in item) {
            solarTotal += item.is_per_panel ? item.price * panelCount : item.price;
          }
        }
      }

      // 2. Battery: base + (base × 0.8 × (qty-1)) for extras + mounting_kit × qty
      let batteryTotal = 0;
      for (const [key, qty] of Object.entries(packageState.batteries)) {
        if (qty > 0 && batteries?.[key]) {
          const b = batteries[key];
          const base = b.base_price;
          const mount = b.mounting_kit_price || 100;
          const discount = b.extra_unit_discount ?? 0.2;
          batteryTotal += base + (base * (1 - discount) * (qty - 1)) + (mount * qty);
        }
      }

      // 3. Scaffolding + Labour
      let installTotal = 0;
      const inst = installation?.[tier];
      if (inst) {
        const scaff = inst.scaffolding_standard || 0;
        const roof = inst.labour_roofing || 0;
        const elec = inst.labour_electrical || 0;
        const disc = inst.labour_discount || 0;
        installTotal = scaff + roof + elec - disc;
      }

      // 4. Overheads
      const overheadTotal = overheads?.[tier] || 0;

      // 5. Add-ons
      let addonTotal = 0;
      packageState.addons.forEach(a => {
        addonTotal += addons?.[a]?.price || 0;
      });

      return Math.round(solarTotal + batteryTotal + installTotal + overheadTotal + addonTotal);
    }

    // Fallback: simple formula
    let total = packageState.panels * (PRICING.panelUnitPrice || PRICING_FALLBACK.panelUnitPrice);
    for (const [key, qty] of Object.entries(packageState.batteries)) {
      total += (PRICING.batteries[key]?.price || 0) * qty;
    }
    packageState.addons.forEach(a => { total += PRICING.addons[a]?.price || 0; });
    return total;
  }

  function getSolarMaterialsSubtotal() {
    const tier = getTierFromHomeSize(formData.systemSize || (calculatedSystemSize || 'medium'));
    if (DYNAMIC_PRICING?.solar_materials?.[tier]) {
      const solar = DYNAMIC_PRICING.solar_materials[tier];
      let sum = 0;
      for (const [costKey, item] of Object.entries(solar)) {
        if (typeof item === 'object' && item !== null && 'price' in item) {
          sum += item.is_per_panel ? item.price * packageState.panels : item.price;
        }
      }
      return sum;
    }
    return packageState.panels * (PRICING.panelUnitPrice || PRICING_FALLBACK.panelUnitPrice);
  }

  function getBatterySubtotal(key, qty) {
    if (qty <= 0) return 0;
    if (DYNAMIC_PRICING?.batteries?.[key]) {
      const b = DYNAMIC_PRICING.batteries[key];
      const base = b.base_price;
      const mount = b.mounting_kit_price || 100;
      const discount = b.extra_unit_discount ?? 0.2;
      return base + (base * (1 - discount) * (qty - 1)) + (mount * qty);
    }
    return (PRICING.batteries[key]?.price || 0) * qty;
  }

  function updatePackageUI() {
    const total   = calcPackageTotal();
    const kw      = ((packageState.panels * PRICING.panelWattage) / 1000).toFixed(1);
    const solarSubtotal = getSolarMaterialsSubtotal();

    if (pkgPanelCount)  pkgPanelCount.textContent = packageState.panels;
    if (pkgPanelKw)     pkgPanelKw.textContent = kw + ' kW system';
    if (pkgPanelPrice)  pkgPanelPrice.textContent = fmtGBP(solarSubtotal);
    if (pkgTotal)       pkgTotal.textContent = fmtGBP(total);

    if (panelMinusBtn) panelMinusBtn.disabled = packageState.panels <= PRICING.panelMin;
    if (panelPlusBtn)  panelPlusBtn.disabled  = packageState.panels >= PRICING.panelMax;

    for (const [key, qty] of Object.entries(packageState.batteries)) {
      const countEl = document.querySelector(`[data-battery-count="${key}"]`);
      const priceEl = document.querySelector(`[data-battery-price="${key}"]`);
      const card    = document.querySelector(`.pkg-battery-card[data-battery="${key}"]`);
      const minusBtn = document.querySelector(`[data-battery-action="minus"][data-battery-key="${key}"]`);
      if (countEl) countEl.textContent = qty;
      if (priceEl) {
        const subtotal = getBatterySubtotal(key, qty);
        const unitPrice = PRICING.batteries[key]?.price || 0;
        priceEl.textContent = qty > 0
          ? fmtGBP(subtotal)
          : fmtGBP(unitPrice) + ' each';
      }
      if (card) card.classList.toggle('is-active', qty > 0);
      if (minusBtn) minusBtn.disabled = qty <= 0;
    }

    if (pkgSavings && formData.monthlyBill) {
      const annualGen = packageState.panels * CALC_CONFIG.panelOutputPerYear;
      const selfConsumed = annualGen * CALC_CONFIG.selfConsumptionRate;
      const exported = annualGen - selfConsumed;
      const savings = (selfConsumed * CALC_CONFIG.ratePerKwh) + (exported * CALC_CONFIG.exportRate);
      pkgSavings.style.display = 'flex';
      if (pkgSavingsAmt) pkgSavingsAmt.textContent = fmtGBP(Math.round(savings)) + '/year';
    }
  }

  function initPackageFromQuiz() {
    let size = formData.systemSize;
    if (size === 'unsure') size = calculatedSystemSize;
    size = size || calculatedSystemSize;
    if (size === 'small')       packageState.panels = 6;
    else if (size === 'medium') packageState.panels = 10;
    else if (size === 'large')  packageState.panels = 14;
    else                        packageState.panels = 8;

    const batteryInterest = formData.battery;
    packageState.batteries = { duracell: 0, sigenergy: 0, tesla: 0 };
    if (batteryInterest === 'yes' || batteryInterest === 'maybe') {
      packageState.batteries.duracell = 1;
    }
    packageState.addons = [];
    form.querySelectorAll('.pkg-addon input[type="checkbox"]').forEach(cb => { cb.checked = false; });

    updatePackageUI();
  }

  if (panelMinusBtn) {
    panelMinusBtn.addEventListener('click', () => {
      if (packageState.panels > PRICING.panelMin) { packageState.panels--; updatePackageUI(); }
    });
  }
  if (panelPlusBtn) {
    panelPlusBtn.addEventListener('click', () => {
      if (packageState.panels < PRICING.panelMax) { packageState.panels++; updatePackageUI(); }
    });
  }

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-battery-action]');
    if (btn) {
      const key = btn.dataset.batteryKey;
      const action = btn.dataset.batteryAction;
      if (action === 'plus' && packageState.batteries[key] < BATTERY_MAX_QTY) {
        packageState.batteries[key]++;
        updatePackageUI();
      } else if (action === 'minus' && packageState.batteries[key] > 0) {
        packageState.batteries[key]--;
        updatePackageUI();
      }
    }
  });

  form.addEventListener('change', (e) => {
    if (e.target.closest && e.target.closest('.pkg-addon')) {
      packageState.addons = Array.from(form.querySelectorAll('.pkg-addon input:checked')).map(cb => cb.value);
      updatePackageUI();
    }
  });

  // ============================================
  // ORDER SUMMARY BUILDER
  // ============================================
  function populateOrderSummary() {
    const orderLines   = document.getElementById('orderLines');
    const orderTotal   = document.getElementById('orderTotal');
    const orderContact = document.getElementById('orderContact');

    if (!orderLines) return;

    const total = calcPackageTotal();
    const kw    = ((packageState.panels * PRICING.panelWattage) / 1000).toFixed(1);
    const solarSubtotal = getSolarMaterialsSubtotal();

    let linesHtml = '';
    linesHtml += `<div class="order-summary__line"><span>Solar System (${kw} kW)</span><span>${fmtGBP(solarSubtotal)}</span></div>`;

    for (const [key, qty] of Object.entries(packageState.batteries)) {
      if (qty > 0) {
        const b = PRICING.batteries[key];
        const label = qty > 1 ? `${qty} &times; ${b?.label || key}` : (b?.label || key);
        linesHtml += `<div class="order-summary__line"><span>${label}</span><span>${fmtGBP(getBatterySubtotal(key, qty))}</span></div>`;
      }
    }

    packageState.addons.forEach(a => {
      const ad = PRICING.addons[a];
      if (ad) linesHtml += `<div class="order-summary__line"><span>${ad.label}</span><span>${fmtGBP(ad.price)}</span></div>`;
    });

    for (const [key, item] of Object.entries(PRICING.included || {})) {
      linesHtml += `<div class="order-summary__line"><span>${item.label}</span><span style="color:var(--color-green);font-weight:600;">Included</span></div>`;
    }

    orderLines.innerHTML = linesHtml;
    if (orderTotal) orderTotal.textContent = fmtGBP(total);

    if (orderContact) {
      orderContact.innerHTML = `
        <strong>Your details</strong>
        <span>${escapeHtml(formData.firstName || '')} ${escapeHtml(formData.lastName || '')}</span>
        <span>${escapeHtml(formData.email || '')}</span>
        <span>${escapeHtml(formData.phone || '')}</span>
        <span>${escapeHtml(formData.postcode || '').toUpperCase()}</span>
      `;
    }

    const savingsAnchor = document.getElementById('orderSavingsAnchor');
    const savingsText   = document.getElementById('orderSavingsText');
    if (savingsAnchor && formData.monthlyBill) {
      const annualGen = packageState.panels * CALC_CONFIG.panelOutputPerYear;
      const selfConsumed = annualGen * CALC_CONFIG.selfConsumptionRate;
      const exported = annualGen - selfConsumed;
      const annualSavings = (selfConsumed * CALC_CONFIG.ratePerKwh) + (exported * CALC_CONFIG.exportRate);

      if (savingsText) savingsText.textContent = `Your system saves ~${fmtGBP(Math.round(annualSavings))}/year`;
      savingsAnchor.style.display = 'flex';
    }
  }

  /* populatePaymentSuccess() — disabled, kept for future payment flow
  function populatePaymentSuccess() {
    const paymentSummary = document.getElementById('paymentSummary');
    if (!paymentSummary) return;
    const total   = calcPackageTotal();
    const deposit = total * PRICING.depositRate;
    const kw      = ((packageState.panels * PRICING.panelWattage) / 1000).toFixed(1);
    const ref     = 'GF-' + Date.now().toString(36).toUpperCase();
    let html = '<h3>Order confirmation</h3><dl>';
    html += `<dt>Reference</dt><dd>${ref}</dd>`;
    html += `<dt>System</dt><dd>${kw} kW solar system</dd>`;
    for (const [key, qty] of Object.entries(packageState.batteries)) {
      if (qty > 0) {
        const label = qty > 1 ? `${qty} &times; ${PRICING.batteries[key].label}` : PRICING.batteries[key].label;
        html += `<dt>Battery</dt><dd>${label}</dd>`;
      }
    }
    packageState.addons.forEach(a => {
      const ad = PRICING.addons[a];
      if (ad) html += `<dt>Add-on</dt><dd>${ad.label}</dd>`;
    });
    html += `<dt>Package total</dt><dd>${fmtGBP(total)}</dd>`;
    html += `<dt>Deposit paid</dt><dd>${fmtGBP(deposit)}</dd>`;
    html += '</dl>';
    paymentSummary.innerHTML = html;
  }
  */

  /* STRIPE CHECKOUT — disabled, kept for future payment flow
  function saveStateToSession() {
    try {
      sessionStorage.setItem('gf_packageState', JSON.stringify(packageState));
      sessionStorage.setItem('gf_formData', JSON.stringify(formData));
    } catch (e) {}
  }
  function restoreStateFromSession() {
    try {
      const pkg = sessionStorage.getItem('gf_packageState');
      const fd  = sessionStorage.getItem('gf_formData');
      if (pkg) Object.assign(packageState, JSON.parse(pkg));
      if (fd)  Object.assign(formData, JSON.parse(fd));
      sessionStorage.removeItem('gf_packageState');
      sessionStorage.removeItem('gf_formData');
      return !!pkg;
    } catch (e) { return false; }
  }
  async function redirectToStripe() {
    if (!STRIPE_CONFIG.publishableKey) {
      console.warn('Stripe not configured');
      return false;
    }
    saveStateToSession();
    try {
      if (typeof Stripe === 'undefined') return false;
      const stripe = Stripe(STRIPE_CONFIG.publishableKey);
      const { error } = await stripe.redirectToCheckout({
        lineItems: [], mode: 'payment',
        successUrl: STRIPE_CONFIG.successUrl,
        cancelUrl:  STRIPE_CONFIG.cancelUrl,
      });
      if (error) return false;
      return true;
    } catch (err) { return false; }
  }
  */

  // ============================================
  // EVENT LISTENERS
  // ============================================
  
  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio') {
      collectStepData();
      setTimeout(() => { goToNextStep(); }, 300);
    }
  });
  
  form.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="next"]')) {
      if (validateCurrentStep()) {
        collectStepData();
        captureMapCoords();
        goToNextStep();
      }
    }
    if (e.target.matches('[data-action="retry"]')) {
      const flow = getStepFlow();
      const step9Index = flow.indexOf(9);
      if (step9Index !== -1) {
        currentStepIndex = step9Index;
        stepHistory.push(currentStepIndex);
        showStep(9);
      }
    }
  });
  
  form.addEventListener('submit', handleSubmit);
  backBtn.addEventListener('click', goToPrevStep);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stepHistory.length > 1) {
      goToPrevStep();
    }
  });
  
  // ============================================
  // ORDER SUMMARY ACTIONS
  // ============================================
  function collectPackageData() {
    formData._packagePanels  = packageState.panels;
    formData._packageBattery = Object.entries(packageState.batteries).filter(([,q]) => q > 0).map(([k,q]) => `${q}x ${PRICING.batteries[k].label}`).join(', ') || 'None';
    formData._packageAddons  = packageState.addons.join(', ');
    formData._packageTotal   = calcPackageTotal();
    formData._depositAmount  = 0;
  }

  function collectContactData() {
    const contactStep = getStepElement(9);
    if (!contactStep) return;
    const inputs = contactStep.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea');
    inputs.forEach(input => {
      if (input.name && input.value && input.value.trim()) {
        formData[input.name] = input.value.trim();
      }
    });
  }

  const getQuoteBtn = document.getElementById('getQuoteBtn');
  if (getQuoteBtn) {
    getQuoteBtn.addEventListener('click', async () => {
      if (isSubmitting) return;
      getQuoteBtn.disabled = true;
      getQuoteBtn.classList.add('btn--loading');
      isSubmitting = true;

      collectContactData();
      collectPackageData();
      await doHubSpotSubmit('quote_requested');

      getQuoteBtn.disabled = false;
      getQuoteBtn.classList.remove('btn--loading');
      isSubmitting = false;
    });
  }

  const callbackBtn = document.getElementById('callbackBtn');
  const callbackTimePicker = document.getElementById('callbackTimePicker');
  const confirmCallbackBtn = document.getElementById('confirmCallbackBtn');

  if (callbackBtn && callbackTimePicker) {
    callbackBtn.addEventListener('click', () => {
      callbackTimePicker.style.display = callbackTimePicker.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (confirmCallbackBtn) {
    confirmCallbackBtn.addEventListener('click', async () => {
      if (isSubmitting) return;
      confirmCallbackBtn.disabled = true;
      confirmCallbackBtn.classList.add('btn--loading');
      isSubmitting = true;

      collectContactData();
      collectPackageData();
      const timeSelect = document.getElementById('callbackTime');
      formData._callbackTime = timeSelect ? timeSelect.value : 'anytime';
      await doHubSpotSubmit('callback_requested');

      confirmCallbackBtn.disabled = false;
      confirmCallbackBtn.classList.remove('btn--loading');
      isSubmitting = false;
    });
  }

  // ============================================
  // HEALTHCHECK TAGGING: auto-route from ?type=healthcheck
  // ============================================
  const urlParams = new URLSearchParams(window.location.search);
  const funnelType = urlParams.get('type');
  if (funnelType === 'healthcheck') {
    formData._funnelSource = 'Solar Health-Check Funnel';
  }

  /* Payment redirect check — disabled, kept for future payment flow
  const paymentParam = urlParams.get('payment');
  if (paymentParam === 'success') {
    restoreStateFromSession();
    showPaymentSuccess();
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    return;
  }
  */

  const consentCheckbox = form.querySelector('input[name="consent"]');
  const submitButton = form.querySelector('button[type="submit"]');
  if (consentCheckbox && submitButton) {
    submitButton.disabled = true;
    consentCheckbox.addEventListener('change', () => {
      submitButton.disabled = !consentCheckbox.checked;
    });
  }

  // Initialize
  showStep(2);
  updateProgress();
});
