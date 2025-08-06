// API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// DOM elements
const templateCards = document.querySelectorAll('.template-card');
const recipientsInput = document.getElementById('recipients');
const promptInput = document.getElementById('emailPrompt');
const generateBtn = document.getElementById('generateBtn');
const emailPreview = document.getElementById('emailPreview');
const subjectInput = document.getElementById('subject');
const bodyTextarea = document.getElementById('body');
const sendBtn = document.getElementById('sendBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editSubjectBtn = document.getElementById('editSubject');
const editBodyBtn = document.getElementById('editBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModal');

// State management
let currentTemplate = 'business';
let currentPrompt = '';
let currentRecipients = [];
let isGenerating = false;
let isSubjectEditable = false;
let isBodyEditable = false;

// Utility functions
function showLoading(show = true) {
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}

function showSuccessModal() {
    successModal.classList.add('show');
}

function hideSuccessModal() {
    successModal.classList.remove('show');
}

function showEmailPreview() {
    emailPreview.style.display = 'block';
    emailPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideEmailPreview() {
    emailPreview.style.display = 'none';
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

function parseRecipients(recipientsString) {
    return recipientsString
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
}

function validateInputs() {
    const recipients = parseRecipients(recipientsInput.value);
    const prompt = promptInput.value.trim();

    if (recipients.length === 0) {
        alert('Please enter at least one recipient email address.');
        recipientsInput.focus();
        return false;
    }

    for (const email of recipients) {
        if (!validateEmail(email)) {
            alert(`Invalid email address: ${email}`);
            recipientsInput.focus();
            return false;
        }
    }

    if (prompt.length === 0) {
        alert('Please enter a prompt for email generation.');
        promptInput.focus();
        return false;
    }

    if (prompt.length < 10) {
        alert('Please provide a more detailed prompt (at least 10 characters).');
        promptInput.focus();
        return false;
    }

    return true;
}

function updateGenerateButtonState() {
    const hasRecipients = recipientsInput.value.trim().length > 0;
    const hasPrompt = promptInput.value.trim().length > 0;
    generateBtn.disabled = !hasRecipients || !hasPrompt || isGenerating;
    
    if (isGenerating) {
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    } else {
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Email';
    }
}

// Template card interactions
function initializeTemplateCards() {
    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active class from all cards
            templateCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            card.classList.add('active');
            
            // Update current template
            currentTemplate = card.dataset.template;
            
            // Update placeholder based on template
            updatePromptPlaceholder();
        });
    });
}

function updatePromptPlaceholder() {
    const placeholders = {
        business: "Write a professional email for business communication...",
        personal: "Compose a personal email message..."
    };
    
    promptInput.placeholder = placeholders[currentTemplate] || "Describe the email you want to generate...";
}

// API functions
async function generateEmail(prompt, recipients) {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: prompt,
                recipients: recipients
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Backend returns { success: true, email: { subject, body } }
        if (data.success && data.email) {
            return data.email;
        } else {
            throw new Error(data.error || 'Failed to generate email');
        }
    } catch (error) {
        console.error('Error generating email:', error);
        throw error;
    }
}

async function sendEmail(recipients, subject, body) {
    try {
        const response = await fetch(`${API_BASE_URL}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipients: recipients,
                subject: subject,
                body: body,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            return data;
        } else {
            throw new Error(data.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Health check function
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('Backend connection established');
            return true;
        } else {
            throw new Error('Backend health check failed');
        }
    } catch (error) {
        console.error('Backend connection failed:', error);
        alert('Backend server is not running. Please start the backend server on port 3001.');
        return false;
    }
}

// Event handlers
async function handleGenerateEmail() {
    if (!validateInputs()) {
        return;
    }

    currentRecipients = parseRecipients(recipientsInput.value);
    currentPrompt = promptInput.value.trim();
    isGenerating = true;
    updateGenerateButtonState();
    showLoading(true);

    try {
        const result = await generateEmail(currentPrompt, currentRecipients);
        
        // Populate the preview with generated content
        subjectInput.value = result.subject || 'Generated Email';
        bodyTextarea.value = result.body || '';
        
        // Reset edit states
        isSubjectEditable = false;
        isBodyEditable = false;
        
        // Show the email preview
        showEmailPreview();
        
        console.log('Email generated successfully');
        
    } catch (error) {
        console.error('Generation failed:', error);
        alert(`Failed to generate email: ${error.message}`);
    } finally {
        isGenerating = false;
        updateGenerateButtonState();
        showLoading(false);
    }
}

async function handleSendEmail() {
    const subject = subjectInput.value.trim();
    const body = bodyTextarea.value.trim();

    if (!subject) {
        alert('Please enter an email subject.');
        subjectInput.focus();
        return;
    }

    if (!body) {
        alert('Please enter email content.');
        bodyTextarea.focus();
        return;
    }

    // Show loading
    showLoading(true);
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await sendEmail(currentRecipients, subject, body);
        
        // Reset form
        recipientsInput.value = '';
        promptInput.value = '';
        subjectInput.value = '';
        bodyTextarea.value = '';
        hideEmailPreview();
        
        // Show success modal
        showSuccessModal();
        
        console.log('Email sent successfully');
        
    } catch (error) {
        console.error('Send failed:', error);
        alert(`Failed to send email: ${error.message}`);
    } finally {
        showLoading(false);
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
    }
}

function handleRegenerateEmail() {
    if (currentPrompt && currentRecipients.length > 0) {
        handleGenerateEmail();
    }
}

function handleCancelEmail() {
    hideEmailPreview();
    promptInput.focus();
}

function toggleSubjectEdit() {
    isSubjectEditable = !isSubjectEditable;
    
    if (isSubjectEditable) {
        subjectInput.focus();
        subjectInput.select();
        editSubjectBtn.innerHTML = '<i class="fas fa-check"></i>';
        editSubjectBtn.style.color = '#43e97b';
    } else {
        editSubjectBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editSubjectBtn.style.color = '';
    }
}

function toggleBodyEdit() {
    isBodyEditable = !isBodyEditable;
    
    if (isBodyEditable) {
        bodyTextarea.focus();
        bodyTextarea.select();
        editBodyBtn.innerHTML = '<i class="fas fa-check"></i>';
        editBodyBtn.style.color = '#43e97b';
    } else {
        editBodyBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBodyBtn.style.color = '';
    }
}

// Input validation and UI updates
function initializeInputValidation() {
    recipientsInput.addEventListener('input', updateGenerateButtonState);
    promptInput.addEventListener('input', updateGenerateButtonState);
    
    // Allow Enter key to trigger generation in prompt field
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && !generateBtn.disabled) {
            e.preventDefault();
            handleGenerateEmail();
        }
    });

    // Real-time email validation feedback
    recipientsInput.addEventListener('blur', () => {
        const recipients = parseRecipients(recipientsInput.value);
        if (recipients.length > 0) {
            const invalidEmails = recipients.filter(email => !validateEmail(email));
            if (invalidEmails.length > 0) {
                recipientsInput.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            } else {
                recipientsInput.style.borderColor = '';
            }
        }
    });
}

// Navigation animations
function initializeAnimations() {
    // Add stagger animation to template cards
    templateCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('animate-in');
    });

    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe sections for scroll animations
    document.querySelectorAll('.hero, .email-templates, .email-generation').forEach(section => {
        observer.observe(section);
    });
}

// Event listeners
function initializeEventListeners() {
    generateBtn.addEventListener('click', handleGenerateEmail);
    sendBtn.addEventListener('click', handleSendEmail);
    regenerateBtn.addEventListener('click', handleRegenerateEmail);
    cancelBtn.addEventListener('click', handleCancelEmail);
    editSubjectBtn.addEventListener('click', toggleSubjectEdit);
    editBodyBtn.addEventListener('click', toggleBodyEdit);
    closeModalBtn.addEventListener('click', hideSuccessModal);

    // Close modal when clicking outside
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            hideSuccessModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSuccessModal();
        }
    });
}

// Add CSS animations
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: slideInUp 0.6s ease forwards;
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .template-card {
            opacity: 0;
            transform: translateY(30px);
        }
    `;
    document.head.appendChild(style);
}

// Initialize the application
async function init() {
    console.log('Initializing GoMail...');
    
    addAnimationStyles();
    initializeTemplateCards();
    initializeInputValidation();
    initializeAnimations();
    initializeEventListeners();
    updateGenerateButtonState();
    updatePromptPlaceholder();
    
    // Check backend connection
    await checkBackendHealth();
    
    // Set initial focus
    setTimeout(() => {
        recipientsInput.focus();
    }, 500);
    
    console.log('GoMail initialized successfully');
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
