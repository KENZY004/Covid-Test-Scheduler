
// Global Application State
let selectedService = 'covid-test';
let selectedDate = '';
let selectedTime = '';
let appointments = [];
let currentStep = 1;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    startQueueUpdates();
});

function initializeApp() {
    generateDateOptions();
    updateQueue();
    selectService('covid-test'); // Default selection
}

// Service Selection
function selectService(service) {
    selectedService = service;
    
    // Update UI to show selected service
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(service + '-card').classList.add('selected');
    
    // Show/hide priority options for testing
    const priorityGroup = document.getElementById('priority-group');
    if (service === 'covid-test') {
        priorityGroup.style.display = 'block';
    } else {
        priorityGroup.style.display = 'none';
    }
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-button').classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Load tab-specific content
    if (tabName === 'queue') {
        renderQueue();
    } else if (tabName === 'dashboard') {
        renderAppointments();
    }
}

// Date and Time Selection
function generateDateOptions() {
    const dateGrid = document.getElementById('date-grid');
    const today = new Date();
    
    dateGrid.innerHTML = '';
    
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dateOption = document.createElement('div');
        dateOption.className = 'date-option' + (i === 0 ? ' today' : '');
        dateOption.onclick = () => selectDate(date.toISOString().split('T')[0]);
        
        dateOption.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
                ${date.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div style="color: #6b7280;">
                ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
        `;
        
        dateGrid.appendChild(dateOption);
    }
}

function selectDate(date) {
    selectedDate = date;
    
    // Update UI
    document.querySelectorAll('.date-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.date-option').classList.add('selected');
    
    // Generate time slots
    generateTimeOptions();
    document.getElementById('time-selection').style.display = 'block';
}

function generateTimeOptions() {
    const timeGrid = document.getElementById('time-grid');
    const availableSlots = slotManager.getAvailableSlots(selectedDate);
    
    timeGrid.innerHTML = '';
    
    if (availableSlots.length === 0) {
        timeGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6b7280;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No available slots for this date</p>
                <p style="font-size: 0.875rem;">Please select a different date</p>
            </div>
        `;
        return;
    }
    
    availableSlots.forEach(slot => {
        const timeOption = document.createElement('div');
        timeOption.className = 'time-option';
        timeOption.onclick = () => selectTime(slot.time);
        
        timeOption.innerHTML = `
            <div class="time">${slot.time}</div>
            <div class="slots">${slot.capacity - slot.booked} left</div>
        `;
        
        timeGrid.appendChild(timeOption);
    });
}

function selectTime(time) {
    selectedTime = time;
    
    // Update UI
    document.querySelectorAll('.time-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.time-option').classList.add('selected');
    
    // Show continue button
    document.getElementById('continue-btn').style.display = 'block';
}

// Step Navigation
function nextStep() {
    if (currentStep === 1) {
        document.getElementById('date-selection').classList.remove('active');
        document.getElementById('patient-info').classList.add('active');
        
        // Update appointment summary
        const selectedDateObj = new Date(selectedDate);
        const summary = `Appointment: ${selectedDateObj.toLocaleDateString()} at ${selectedTime}`;
        document.getElementById('appointment-summary').textContent = summary;
        
        currentStep = 2;
    }
}

function previousStep() {
    if (currentStep === 2) {
        document.getElementById('patient-info').classList.remove('active');
        document.getElementById('date-selection').classList.add('active');
        currentStep = 1;
    }
}

// Form Submission
document.getElementById('patient-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const patientInfo = {
        name: formData.get('patient-name') || document.getElementById('patient-name').value,
        email: formData.get('patient-email') || document.getElementById('patient-email').value,
        phone: formData.get('patient-phone') || document.getElementById('patient-phone').value,
        age: formData.get('patient-age') || document.getElementById('patient-age').value,
        priority: document.querySelector('input[name="priority"]:checked')?.value || 'normal'
    };
    
    // Validate required fields
    if (!patientInfo.name || !patientInfo.email || !patientInfo.phone) {
        showToast('Missing Information', 'Please fill in all required fields.', 'error');
        return;
    }
    
    // Book the appointment
    const bookingResult = slotManager.bookSlot(selectedDate, selectedTime, patientInfo);
    
    if (bookingResult.success) {
        const appointment = {
            id: Date.now(),
            type: selectedService === 'covid-test' ? 'COVID-19 Test' : 'COVID-19 Vaccination',
            date: selectedDate,
            time: selectedTime,
            patient: patientInfo,
            status: 'confirmed'
        };
        
        appointments.push(appointment);
        
        showToast(
            'Appointment Booked Successfully!',
            `Your ${appointment.type} appointment is confirmed for ${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}`,
            'success'
        );
        
        // Reset form and switch to dashboard
        resetBookingForm();
        switchTabProgrammatically('dashboard');
        
    } else if (bookingResult.waitlisted) {
        showToast(
            'Added to Waiting List',
            `You're #${bookingResult.position} on the waiting list. We'll notify you if a slot opens up.`,
            'info'
        );
    }
});

function resetBookingForm() {
    document.getElementById('patient-form').reset();
    document.getElementById('date-selection').classList.add('active');
    document.getElementById('patient-info').classList.remove('active');
    document.getElementById('time-selection').style.display = 'none';
    document.getElementById('continue-btn').style.display = 'none';
    
    // Clear selections
    document.querySelectorAll('.date-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelectorAll('.time-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    selectedDate = '';
    selectedTime = '';
    currentStep = 1;
}

function switchTabProgrammatically(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct button
    const buttons = document.querySelectorAll('.tab-button');
    if (tabName === 'book') buttons[0].classList.add('active');
    if (tabName === 'queue') buttons[1].classList.add('active');
    if (tabName === 'dashboard') buttons[2].classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Load content
    if (tabName === 'dashboard') {
        renderAppointments();
    }
}

// Queue Management
function updateQueue() {
    queueManager.updateQueue();
    renderQueue();
    updateQueueStats();
}

function renderQueue() {
    renderQueueSection('testing', 'testing-queue', 'testing-count');
    renderQueueSection('vaccination', 'vaccination-queue', 'vaccination-count');
}

function renderQueueSection(type, containerId, countId) {
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);
    const queue = queueManager.getQueue(type);
    const currentPatient = queueManager.getCurrentlyServing(type);
    
    container.innerHTML = '';
    countElement.textContent = `${queue.length} in queue`;
    
    // Show currently being served
    if (currentPatient) {
        const currentDiv = document.createElement('div');
        currentDiv.className = 'queue-item current';
        currentDiv.innerHTML = `
            <div class="queue-item-left">
                <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                    <i class="fas fa-user-clock"></i>
                </div>
                <div class="queue-item-info">
                    <h4>${currentPatient.name}</h4>
                    <p>${currentPatient.type} - In Progress</p>
                </div>
            </div>
            <div class="queue-item-right">
                <div class="time">Started: ${currentPatient.startTime}</div>
            </div>
        `;
        container.appendChild(currentDiv);
    }
    
    // Show queue
    if (queue.length === 0) {
        const noQueueDiv = document.createElement('div');
        noQueueDiv.className = 'no-queue';
        noQueueDiv.innerHTML = `
            <i class="fas fa-users"></i>
            <h3>No one in queue</h3>
            <p>Queue is empty</p>
        `;
        container.appendChild(noQueueDiv);
    } else {
        queue.forEach(patient => {
            const queueDiv = document.createElement('div');
            queueDiv.className = 'queue-item';
            queueDiv.innerHTML = `
                <div class="queue-item-left">
                    <div class="queue-position ${type === 'testing' ? '' : 'green'}">
                        ${patient.position}
                    </div>
                    <div class="queue-item-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.type}</p>
                        ${patient.priority === 'urgent' ? '<div class="urgent-badge">Urgent</div>' : ''}
                    </div>
                </div>
                <div class="queue-item-right">
                    <div class="time">${patient.time}</div>
                    <div class="wait">~${queueManager.getEstimatedWaitTime(patient.position)} min wait</div>
                </div>
            `;
            container.appendChild(queueDiv);
        });
    }
}

function updateQueueStats() {
    const stats = queueManager.getStats();
    document.getElementById('total-served').textContent = stats.totalServed;
    document.getElementById('avg-wait').textContent = Math.round(stats.averageWaitTime) + ' min';
    document.getElementById('current-wait').textContent = Math.round(stats.currentWaitTime) + ' min';
    document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
}

// Appointments Dashboard
function renderAppointments() {
    const container = document.getElementById('appointments-list');
    
    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="no-appointments">
                <i class="fas fa-calendar-times"></i>
                <h3>No Appointments Yet</h3>
                <p>Book your first appointment to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    appointments.forEach(appointment => {
        const appointmentDiv = document.createElement('div');
        appointmentDiv.className = 'appointment-card';
        appointmentDiv.innerHTML = `
            <div class="appointment-header">
                <h3>${appointment.type}</h3>
                <div class="appointment-status confirmed">Confirmed</div>
            </div>
            <div class="appointment-details">
                <div>
                    <strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}
                </div>
                <div>
                    <strong>Time:</strong> ${appointment.time}
                </div>
                <div>
                    <strong>Patient:</strong> ${appointment.patient.name}
                </div>
                <div>
                    <strong>Contact:</strong> ${appointment.patient.email}
                </div>
            </div>
        `;
        container.appendChild(appointmentDiv);
    });
}

// Toast Notifications
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const titleElement = toast.querySelector('.toast-title');
    const messageElement = toast.querySelector('.toast-message');
    const iconElement = toast.querySelector('.toast-icon');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    // Set icon based on type
    toast.className = 'toast show';
    if (type === 'error') {
        toast.classList.add('error');
        iconElement.className = 'toast-icon fas fa-exclamation-circle';
    } else if (type === 'info') {
        iconElement.className = 'toast-icon fas fa-info-circle';
    } else {
        iconElement.className = 'toast-icon fas fa-check-circle';
    }
    
    // Auto hide after 5 seconds
    setTimeout(hideToast, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.remove('show');
}

// Real-time Updates
function startQueueUpdates() {
    setInterval(() => {
        updateQueue();
        console.log('Queue updated at:', new Date().toLocaleTimeString());
    }, 8000); // Update every 8 seconds
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}
