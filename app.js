
// Global Application State
let selectedService = 'covid-test';
let selectedDate = '';
let selectedTime = '';
let currentStep = 1;
let appointments = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    startQueueUpdates();
    document.addEventListener('DOMContentLoaded', function() {
    // ... other initialization code ...
    
    // Remove any existing onclick attributes from HTML
    document.getElementById('covid-test-card').removeAttribute('onclick');
    document.getElementById('vaccination-card').removeAttribute('onclick');
    
    // Add robust click handlers
    document.getElementById('covid-test-card').addEventListener('click', function(e) {
        e.preventDefault();
        selectService('covid-test');
    });
    
    document.getElementById('vaccination-card').addEventListener('click', function(e) {
        e.preventDefault();
        selectService('vaccination');
    });
});
});

function initializeApp() {
    // Clear any corrupted data
    localStorage.removeItem('queueState');
    
    // Load appointments
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    
    // Initialize slot manager with existing appointments
    appointments.forEach(appointment => {
        if (appointment.status !== 'cancelled') {
            slotManager.bookSlot(appointment.date, appointment.time, appointment);
        }
    });
    
    // Rebuild queues
    queueManager.testingQueue = new PriorityQueue();
    queueManager.vaccinationQueue = new PriorityQueue();
    queueManager.currentlyServing = { testing: null, vaccination: null };
    
    appointments.forEach(appointment => {
        if (!appointment.status || appointment.status !== 'cancelled') {
            const queueType = appointment.type.includes('Test') ? 'testing' : 'vaccination';
            queueManager.addToQueue(queueType, appointment);
        }
    });
    
    generateDateOptions();
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
    
    // Update card selection UI
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(service + '-card').classList.add('selected');
    
    // Always switch to booking tab
    switchTab('book');
    
    // Reset and show the booking interface
    resetBookingForm();
    generateDateOptions();
    
    // Ensure date selection is visible
    document.getElementById('date-selection').classList.add('active');
    document.getElementById('patient-info').classList.remove('active');
    document.getElementById('time-selection').style.display = 'none';
    
    // Scroll to the date selection
    setTimeout(() => {
        document.getElementById('date-selection').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }, 100);
}
// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-button[onclick*="${tabName}"]`).classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Special handling for booking tab
    if (tabName === 'book') {
        resetBookingForm();
    }
    
    // Refresh content if needed
    if (tabName === 'queue') renderQueue();
    if (tabName === 'dashboard') renderAppointments();
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
//     const now = new Date();
//     const isToday = selectedDate === now.toISOString().split('T')[0];
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     // Filter out past slots for today
//     const availableSlots = slotManager.getAvailableSlots(selectedDate)
//         .filter(slot => {
//             if (!isToday) return true;
//             const [hour, minute] = slot.time.split(':').map(Number);
//             return hour > currentHour || 
//                   (hour === currentHour && minute > currentMinute);
//         });

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
//         const slotsLeft = slot.capacity - slot.booked;
//         const timeOption = document.createElement('div');
//         timeOption.className = slotsLeft <= 0 ? 'time-option disabled' : 'time-option';
        
//         if (slotsLeft > 0) {
//             timeOption.onclick = () => selectTime(slot.time);
//         }
        
//         timeOption.innerHTML = `
//             <div class="time">${slot.time}</div>
//             <div class="slots">${slotsLeft} left</div>
//         `;
//         timeGrid.appendChild(timeOption);
//     });
// }
function generateTimeOptions() {
    const timeGrid = document.getElementById('time-grid');
    
    // Show loading state
    timeGrid.innerHTML = `
        <div class="loading-slots">
            <i class="fas fa-spinner fa-spin"></i>
            Loading available slots...
        </div>
    `;
    
    // Process in next tick to prevent UI blocking
    setTimeout(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const isToday = selectedDate === today;

        // Get and filter available slots
        const availableSlots = slotManager.getAvailableSlots(selectedDate)
            .filter(slot => {
                // For today's slots, filter out past times
                if (!isToday) return true;
                const [hour, minute] = slot.time.split(':').map(Number);
                return hour > currentHour || 
                      (hour === currentHour && minute > currentMinute);
            });

        // Clear loading state
        timeGrid.innerHTML = '';

        if (availableSlots.length === 0) {
            timeGrid.innerHTML = `
                <div class="no-slots-available">
                    <i class="fas fa-calendar-times"></i>
                    <p>No available slots for this date</p>
                </div>
            `;
            return;
        }

        // Generate time slot options
        availableSlots.forEach(slot => {
            const slotsLeft = slot.capacity - slot.booked;
            const timeOption = document.createElement('div');
            timeOption.className = slotsLeft <= 0 ? 'time-option disabled' : 'time-option';
            
            if (slotsLeft > 0) {
                timeOption.onclick = () => selectTime(slot.time);
            }
            
            timeOption.innerHTML = `
                <div class="time">${formatTimeDisplay(slot.time)}</div>
                <div class="slots-remaining">
                    <span class="slots-count">${slotsLeft}</span>
                    <span class="slots-label">slot${slotsLeft !== 1 ? 's' : ''} left</span>
                </div>
            `;
            timeGrid.appendChild(timeOption);
        });
    }, 100);
}

// Helper function for consistent time display
function formatTimeDisplay(timeString) {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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


// Updated Form Submission Handler
document.getElementById('patient-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // In the form submission handler, update patientInfo object:
const patientInfo = {
    id: Date.now(),
    name: document.getElementById('patient-name').value,
    email: document.getElementById('patient-email').value,
    phone: document.getElementById('patient-phone').value,
    age: document.getElementById('patient-age').value,
    riskLevel: document.querySelector('input[name="risk-level"]:checked').value,
    hospital: document.getElementById('hospital-select').value,
    hospitalName: document.getElementById('hospital-select').options[document.getElementById('hospital-select').selectedIndex].text,
    type: selectedService === 'covid-test' ? 'COVID-19 Test' : 'COVID-19 Vaccination',
    time: selectedTime,
    date: selectedDate,
    bookedAt: new Date().toISOString(),
    status: 'scheduled'
};

    // Validate required fields
    if (!patientInfo.name || !patientInfo.email || !patientInfo.phone || !patientInfo.riskLevel) {
        showToast('Missing Information', 'Please fill in all required fields.', 'error');
        return;
    }

    // Try to book the slot
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
        
        // Refresh the UI
        generateTimeOptions(); // Update slot availability display
        document.getElementById('continue-btn').style.display = 'none';
        resetBookingForm();
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

// function renderQueueSection(type, containerId, countId) {
//     const container = document.getElementById(containerId);
//     const countElement = document.getElementById(countId);
//     const queue = queueManager.getQueue(type);
//     const currentPatient = queueManager.getCurrentlyServing(type);

//     container.innerHTML = '';
//     countElement.textContent = `${queue.length} in queue`;

//     if (currentPatient) {
//         const currentDiv = document.createElement('div');
//         currentDiv.className = 'queue-item current';
//         currentDiv.innerHTML = `
//             <div class="queue-item-left">
//                 <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
//                     <i class="fas fa-user-md"></i>
//                 </div>
//                 <div class="queue-item-info">
//                     <h4>${currentPatient.name}</h4>
//                     <p>${currentPatient.type}</p>
//                     <div class="risk-badge ${currentPatient.riskLevel}">
//                         ${currentPatient.riskLevel} risk
//                     </div>
//                 </div>
//             </div>
//             <div class="queue-item-right">
//                 <div class="time">${currentPatient.time}</div>
//                 <div class="priority">Priority: ${currentPatient.riskLevel}</div>
//             </div>
//         `;
//         container.appendChild(currentDiv);
//     }

//     if (queue.length === 0) {
//         container.innerHTML = `
//             <div class="no-queue">
//                 <i class="fas fa-users"></i>
//                 <h3>No one in queue</h3>
//             </div>
//         `;
//     } else {
//         queue.forEach((patient, index) => {
//             const queueDiv = document.createElement('div');
//             queueDiv.className = `queue-item ${patient.riskLevel === 'high' ? 'high-priority' : ''}`;
//             queueDiv.innerHTML = `
//                 <div class="queue-item-left">
//                     <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
//                         ${index + 1}
//                     </div>
//                     <div class="queue-item-info">
//                         <h4>${patient.name}</h4>
//                         <p>${patient.type}</p>
//                         <div class="risk-badge ${patient.riskLevel}">
//                             ${patient.riskLevel} risk
//                         </div>
//                     </div>
//                 </div>
//                 <div class="queue-item-right">
//                     <div class="time">${patient.time}</div>
//                     <div class="wait">~${queueManager.getEstimatedWaitTime(index + 1, patient.riskLevel)} min wait</div>
//                     <div class="priority">Priority: ${patient.riskLevel}</div>
//                 </div>
//             `;
//             container.appendChild(queueDiv);
//         });
//     }
// }


function updateQueue() {
    queueManager.updateQueue();
    saveQueueState();
}

function renderQueue() {
    renderQueueSection('testing', 'testing-queue', 'testing-count');
    renderQueueSection('vaccination', 'vaccination-queue', 'vaccination-count');
}







function renderQueueSection(type, containerId, countId) {
    const now = new Date();
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countId);
    const queue = queueManager.getQueue(type);
    const currentPatient = queueManager.getCurrentlyServing(type);

    container.innerHTML = '';
    countElement.textContent = `${queue.length} in queue`;

    if (currentPatient) {
        const isTodayCurrent = new Date(currentPatient.date).toDateString() === now.toDateString();
        const currentDiv = document.createElement('div');
        currentDiv.className = 'queue-item current';
        currentDiv.innerHTML = `
            <div class="queue-item-left">
                <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="queue-item-info">
                    <h4>${currentPatient.name}</h4>
                    <p>${currentPatient.type} at ${currentPatient.hospitalName}</p>
                    <div class="risk-badge ${currentPatient.riskLevel}">
                        ${currentPatient.riskLevel} risk
                    </div>
                </div>
            </div>
            <div class="queue-item-right">
                <div class="time">${currentPatient.time}</div>
                <div>${isTodayCurrent ? 'Being served now' : `Scheduled: ${formatDate(currentPatient.date)}`}</div>
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
        queue.forEach((patient) => {
            const isToday = new Date(patient.date).toDateString() === now.toDateString();
            const waitDisplay = isToday
                ? `~${queueManager.getEstimatedWaitTime(patient.position, patient.riskLevel)} min wait`
                : `Scheduled: ${formatDate(patient.date)} at ${patient.time}`;

            const queueDiv = document.createElement('div');
            queueDiv.className = `queue-item ${patient.riskLevel === 'high' ? 'high-priority' : ''}`;
            queueDiv.innerHTML = `
                <div class="queue-item-left">
                    <div class="queue-position ${type === 'testing' ? 'blue' : 'green'}">
                        ${patient.position}
                    </div>
                    <div class="queue-item-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.type} at ${patient.hospitalName}</p>
                        <div class="risk-badge ${patient.riskLevel}">
                            ${patient.riskLevel} risk
                        </div>
                    </div>
                </div>
                <div class="queue-item-right">
                    <div class="time">${patient.time}</div>
                    <div class="wait">${waitDisplay}</div>
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
                <h3>${appointment.type} at ${appointment.hospitalName}</h3>
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
    if (!confirm("Are you sure you want to cancel this appointment?")) {
        return;
    }

    // Find the appointment
    const appointmentIndex = appointments.findIndex(app => app.id === appointmentId);
    if (appointmentIndex === -1) return;

    // Mark as cancelled
    appointments[appointmentIndex].status = 'cancelled';
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // Remove from queue
    const queueType = appointments[appointmentIndex].type.includes('Test') ? 'testing' : 'vaccination';
    queueManager.removeFromQueue(queueType, appointmentId);
    
    // Immediately update the UI
    const appointmentElement = document.querySelector(`.appointment-card[data-id="${appointmentId}"]`);
    if (appointmentElement) {
        // Fade out animation
        appointmentElement.style.opacity = '0';
        setTimeout(() => {
            appointmentElement.remove();
            
            // Show "no appointments" message if needed
            if (document.querySelectorAll('.appointment-card').length === 0) {
                const container = document.getElementById('appointments-list');
                container.innerHTML = `
                    <div class="no-appointments">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No Active Appointments</h3>
                        <p>You have no upcoming appointments</p>
                    </div>
                `;
            }
        }, 300);
    }
    
    // Update queue display if on queue tab
    if (document.getElementById('queue-tab').classList.contains('active')) {
        renderQueue(); // This is your existing queue rendering function
    }
    
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