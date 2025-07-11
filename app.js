// Global Application State
let selectedService = 'covid-test';
let selectedDate = '';
let selectedTime = '';
let currentStep = 1;
let appointments = [];
let queueState = {
    testing: [],
    vaccination: [],
    currentlyServing: { testing: null, vaccination: null }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Clear any corrupted queue data
    if (localStorage.getItem('queueState')) {
        try {
            const savedState = JSON.parse(localStorage.getItem('queueState'));
            // Validate queue data structure
            if (savedState.testing && savedState.vaccination && savedState.currentlyServing) {
                queueState = savedState;
            }
        } catch (e) {
            console.error("Clearing invalid queue data:", e);
            localStorage.removeItem('queueState');
        }
    }

    // Load appointments
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    
    initializeApp();
    startQueueUpdates();
});

function initializeApp() {
    generateDateOptions();
    
    // Reset queue manager
    queueManager.testingQueue = new PriorityQueue();
    queueManager.vaccinationQueue = new PriorityQueue();
    queueManager.currentlyServing = { testing: null, vaccination: null };
    
    // Rebuild queues from valid appointments only
    appointments.forEach(appointment => {
        if (!appointment.status || appointment.status !== 'cancelled') {
            const queueType = appointment.type.includes('Test') ? 'testing' : 'vaccination';
            queueManager.addToQueue(queueType, appointment);
        }
    });
    
    saveQueueState();
    updateQueueDisplay();
    selectService('covid-test');
}

// function initializeApp() {
//     generateDateOptions();
    
//     // Restore queue state from localStorage
//     queueState.testing.forEach(patient => queueManager.testingQueue.enqueue(patient, patient.riskLevel));
//     queueState.vaccination.forEach(patient => queueManager.vaccinationQueue.enqueue(patient, patient.riskLevel));
//     queueManager.currentlyServing = queueState.currentlyServing;
    
//     updateQueueDisplay();
//     selectService('covid-test');
// }

// Service Selection
function selectService(service) {
    selectedService = service;
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(service + '-card').classList.add('selected');
}

// Tab Management
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-button').classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    if (tabName === 'queue') renderQueue();
    else if (tabName === 'dashboard') renderAppointments();
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
    document.querySelectorAll('.date-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.date-option').classList.add('selected');
    generateTimeOptions();
    document.getElementById('time-selection').style.display = 'block';
}

// function generateTimeOptions() {
//     const timeGrid = document.getElementById('time-grid');
//     const availableSlots = slotManager.getAvailableSlots(selectedDate);
//     timeGrid.innerHTML = '';
    
//     if (availableSlots.length === 0) {
//         timeGrid.innerHTML = `
//             <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6b7280;">
//                 <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
//                 <p>No available slots for this date</p>
//             </div>
//         `;
//         return;
//     }
    
//     availableSlots.forEach(slot => {
//         const timeOption = document.createElement('div');
//         timeOption.className = 'time-option';
//         timeOption.onclick = () => selectTime(slot.time);
//         timeOption.innerHTML = `
//             <div class="time">${slot.time}</div>
//             <div class="slots">${slot.capacity - slot.booked} left</div>
//         `;
//         timeGrid.appendChild(timeOption);
//     });
// }
function generateTimeOptions() {
    const timeGrid = document.getElementById('time-grid');
    const availableSlots = slotManager.getAvailableSlots(selectedDate);
    timeGrid.innerHTML = '';
    
    if (availableSlots.length === 0) {
        timeGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6b7280;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No available slots for this date</p>
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
        
        // Disable if no slots left
        if (slot.capacity - slot.booked <= 0) {
            timeOption.classList.add('disabled');
            timeOption.onclick = null;
        }
        
        timeGrid.appendChild(timeOption);
    });
}

function selectTime(time) {
    selectedTime = time;
    document.querySelectorAll('.time-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.time-option').classList.add('selected');
    document.getElementById('continue-btn').style.display = 'block';
}

// Step Navigation
function nextStep() {
    if (currentStep === 1) {
        document.getElementById('date-selection').classList.remove('active');
        document.getElementById('patient-info').classList.add('active');
        
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

// // Form Submission
// document.getElementById('patient-form').addEventListener('submit', function(e) {
//     e.preventDefault();
    
//     const patientInfo = {
//         id: Date.now(),
//         name: document.getElementById('patient-name').value,
//         email: document.getElementById('patient-email').value,
//         phone: document.getElementById('patient-phone').value,
//         age: document.getElementById('patient-age').value,
//         riskLevel: document.querySelector('input[name="risk-level"]:checked').value,
//         type: selectedService === 'covid-test' ? 'COVID-19 Test' : 'COVID-19 Vaccination',
//         time: selectedTime,
//         date: selectedDate,
//         bookedAt: new Date().toISOString(),
//         status: 'scheduled'  // Explicit status
//     };

//     if (!patientInfo.name || !patientInfo.email || !patientInfo.phone || !patientInfo.riskLevel) {
//         showToast('Missing Information', 'Please fill in all required fields.', 'error');
//         return;
//     }

//     // Add to appointments
//     appointments.push(patientInfo);
//     localStorage.setItem('appointments', JSON.stringify(appointments));
    
//     // Add to queue
//     const queueType = selectedService === 'covid-test' ? 'testing' : 'vaccination';
//     queueManager.addToQueue(queueType, patientInfo);
//     saveQueueState();

//     showToast('Booked!', `Your ${patientInfo.type} is confirmed for ${patientInfo.time}`, 'success');
//     resetBookingForm();
//     updateQueueDisplay();
//     switchTabProgrammatically('dashboard');
// });
// In app.js - update the form submit handler
document.getElementById('patient-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const patientInfo = {
        id: Date.now(),
        name: document.getElementById('patient-name').value,
        email: document.getElementById('patient-email').value,
        phone: document.getElementById('patient-phone').value,
        age: document.getElementById('patient-age').value,
        riskLevel: document.querySelector('input[name="risk-level"]:checked').value,
        type: selectedService === 'covid-test' ? 'COVID-19 Test' : 'COVID-19 Vaccination',
        time: selectedTime,
        date: selectedDate,
        bookedAt: new Date().toISOString(),
        status: 'scheduled'
    };

    if (!patientInfo.name || !patientInfo.email || !patientInfo.phone || !patientInfo.riskLevel) {
        showToast('Missing Information', 'Please fill in all required fields.', 'error');
        return;
    }

    // First try to book the slot
    const bookingResult = slotManager.bookSlot(selectedDate, selectedTime, patientInfo);
    
    if (bookingResult.success) {
        // Add to appointments
        appointments.push(patientInfo);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Add to queue
        const queueType = selectedService === 'covid-test' ? 'testing' : 'vaccination';
        queueManager.addToQueue(queueType, patientInfo);
        saveQueueState();

        showToast('Booked!', `Your ${patientInfo.type} is confirmed for ${patientInfo.time}`, 'success');
        resetBookingForm();
        updateQueueDisplay();
        switchTabProgrammatically('dashboard');
    } else if (bookingResult.waitlisted) {
        showToast('Waitlisted', `All slots are booked. You're #${bookingResult.position} on the waitlist.`, 'info');
    } else {
        showToast('Error', 'Could not book the selected time slot.', 'error');
    }
});

function resetBookingForm() {
    document.getElementById('patient-form').reset();
    document.getElementById('date-selection').classList.add('active');
    document.getElementById('patient-info').classList.remove('active');
    document.getElementById('time-selection').style.display = 'none';
    document.getElementById('continue-btn').style.display = 'none';
    
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
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const buttons = document.querySelectorAll('.tab-button');
    if (tabName === 'book') buttons[0].classList.add('active');
    if (tabName === 'queue') buttons[1].classList.add('active');
    if (tabName === 'dashboard') buttons[2].classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    if (tabName === 'dashboard') {
        renderAppointments();
    }
}

// Queue Management
function saveQueueState() {
    queueState = {
        testing: queueManager.getQueue('testing'),
        vaccination: queueManager.getQueue('vaccination'),
        currentlyServing: queueManager.currentlyServing
    };
    localStorage.setItem('queueState', JSON.stringify(queueState));
}

function renderQueueSection(type, containerId, countId) {
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);
    const queue = queueManager.getQueue(type);
    const currentPatient = queueManager.getCurrentlyServing(type);

    container.innerHTML = '';
    countElement.textContent = `${queue.length} in queue`;

    if (currentPatient) {
        const currentDiv = document.createElement('div');
        currentDiv.className = 'queue-item current';
        currentDiv.innerHTML = `
            <div class="queue-item-left">
                <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="queue-item-info">
                    <h4>${currentPatient.name}</h4>
                    <p>${currentPatient.type}</p>
                    <div class="risk-badge ${currentPatient.riskLevel}">
                        ${currentPatient.riskLevel} risk
                    </div>
                </div>
            </div>
            <div class="queue-item-right">
                <div class="time">${currentPatient.time}</div>
                <div class="priority">Priority: ${currentPatient.riskLevel}</div>
            </div>
        `;
        container.appendChild(currentDiv);
    }

    if (queue.length === 0) {
        container.innerHTML = `
            <div class="no-queue">
                <i class="fas fa-users"></i>
                <h3>No one in queue</h3>
            </div>
        `;
    } else {
        queue.forEach((patient, index) => {
            const queueDiv = document.createElement('div');
            queueDiv.className = `queue-item ${patient.riskLevel === 'high' ? 'high-priority' : ''}`;
            queueDiv.innerHTML = `
                <div class="queue-item-left">
                    <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                        ${index + 1}
                    </div>
                    <div class="queue-item-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.type}</p>
                        <div class="risk-badge ${patient.riskLevel}">
                            ${patient.riskLevel} risk
                        </div>
                    </div>
                </div>
                <div class="queue-item-right">
                    <div class="time">${patient.time}</div>
                    <div class="wait">~${queueManager.getEstimatedWaitTime(index + 1, patient.riskLevel)} min wait</div>
                    <div class="priority">Priority: ${patient.riskLevel}</div>
                </div>
            `;
            container.appendChild(queueDiv);
        });
    }
}


function updateQueue() {
    queueManager.updateQueue();
    saveQueueState();
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

    if (currentPatient) {
        const currentDiv = document.createElement('div');
        currentDiv.className = 'queue-item current';
        currentDiv.innerHTML = `
            <div class="queue-item-left">
                <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="queue-item-info">
                    <h4>${currentPatient.name}</h4>
                    <p>${currentPatient.type}</p>
                    <div class="risk-badge ${currentPatient.riskLevel}">
                        ${currentPatient.riskLevel} risk
                    </div>
                </div>
            </div>
            <div class="queue-item-right">
                <div class="time">${currentPatient.time}</div>
                <div class="priority">Priority: ${currentPatient.riskLevel}</div>
            </div>
        `;
        container.appendChild(currentDiv);
    }

    if (queue.length === 0) {
        container.innerHTML = `
            <div class="no-queue">
                <i class="fas fa-users"></i>
                <h3>No one in queue</h3>
            </div>
        `;
    } else {
        queue.forEach((patient, index) => {
            const queueDiv = document.createElement('div');
            queueDiv.className = `queue-item ${patient.riskLevel === 'high' ? 'high-priority' : ''}`;
            queueDiv.innerHTML = `
                <div class="queue-item-left">
                    <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                        ${index + 1}
                    </div>
                    <div class="queue-item-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.type}</p>
                        <div class="risk-badge ${patient.riskLevel}">
                            ${patient.riskLevel} risk
                        </div>
                    </div>
                </div>
                <div class="queue-item-right">
                    <div class="time">${patient.time}</div>
                    <div class="wait">~${queueManager.getEstimatedWaitTime(index + 1, patient.riskLevel)} min wait</div>
                    <div class="priority">Priority: ${patient.riskLevel}</div>
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
    document.getElementById('last-updated').textContent = stats.lastUpdated;
}

function renderAppointments() {
    const container = document.getElementById('appointments-list');
    
    // Filter out cancelled appointments
    const activeAppointments = appointments.filter(app => app.status !== 'cancelled');
    
    if (activeAppointments.length === 0) {
        container.innerHTML = `
            <div class="no-appointments">
                <i class="fas fa-calendar-times"></i>
                <h3>No Active Appointments</h3>
                <p>You have no upcoming appointments</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    activeAppointments.forEach(appointment => {
        const appointmentDiv = document.createElement('div');
        appointmentDiv.className = 'appointment-card';
        appointmentDiv.setAttribute('data-id', appointment.id);
        appointmentDiv.innerHTML = `
            <div class="appointment-header">
                <h3>${appointment.type}</h3>
                <div class="appointment-status ${appointment.status || 'scheduled'}">
                    ${appointment.status || 'scheduled'}
                </div>
            </div>
            <div class="appointment-details">
                <div>
                    <strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}
                </div>
                <div>
                    <strong>Time:</strong> ${appointment.time}
                </div>
                <div>
                    <strong>Patient:</strong> ${appointment.name}
                </div>
                <div>
                    <strong>Risk Level:</strong> <span class="risk-badge ${appointment.riskLevel}">
                        ${appointment.riskLevel}
                    </span>
                </div>
                <div>
                    <strong>Contact:</strong> ${appointment.email}
                </div>
            </div>
            <button class="btn danger" onclick="cancelAppointment(${appointment.id})">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
        container.appendChild(appointmentDiv);
    });
}
// Update the cancelAppointment function to properly handle cancellation

function cancelAppointment(appointmentId) {
    // Find the appointment to get its type
    const appointment = appointments.find(app => app.id === appointmentId);
    if (!appointment) return;

    // Remove from appointments
    appointments = appointments.filter(app => app.id !== appointmentId);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // Remove from the correct queue
    const queueType = appointment.type.includes('Test') ? 'testing' : 'vaccination';
    queueManager.removeFromQueue(queueType, appointmentId);
    
    saveQueueState();
    updateQueueDisplay();
    renderAppointments();
    
    showToast('Cancelled', 'Appointment has been cancelled', 'info');
}
// Toast Notifications
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const titleElement = toast.querySelector('.toast-title');
    const messageElement = toast.querySelector('.toast-message');
    const iconElement = toast.querySelector('.toast-icon');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    toast.className = 'toast show';
    if (type === 'error') {
        toast.classList.add('error');
        iconElement.className = 'toast-icon fas fa-exclamation-circle';
    } else if (type === 'info') {
        iconElement.className = 'toast-icon fas fa-info-circle';
    } else {
        iconElement.className = 'toast-icon fas fa-check-circle';
    }
    
    setTimeout(hideToast, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.remove('show');
}

// Real-time Updates
function startQueueUpdates() {
    setInterval(() => {
        updateQueueDisplay();
    }, 8000);
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