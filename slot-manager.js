
// Time Slot Management with Hash Map for efficient lookups
class TimeSlotManager {
    constructor() {
        this.slots = new SlotHashMap();
        this.waitingQueue = new PriorityQueue();
        this.initializeSlots();
    }

    initializeSlots() {
        const today = new Date();
        for (let day = 0; day < 7; day++) {
            const date = new Date(today);
            date.setDate(today.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            
            this.slots.set(dateStr, this.generateDaySlots());
        }
    }

    generateDaySlots() {
        const slots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push({
                    time: timeStr,
                    available: true,
                    capacity: 4, // 4 appointments per 30-minute slot
                    booked: 0
                });
            }
        }
        return slots;
    }

    getAvailableSlots(date) {
        const daySlots = this.slots.get(date) || [];
        return daySlots.filter(slot => slot.available && slot.booked < slot.capacity);
    }

    bookSlot(date, time, patientData) {
        const daySlots = this.slots.get(date);
        if (!daySlots) return { success: false, waitlisted: false };
        
        const slot = daySlots.find(s => s.time === time);
        if (!slot || slot.booked >= slot.capacity) {
            // Add to waiting queue
            this.waitingQueue.enqueue({ date, time, ...patientData }, Date.now());
            return { success: false, waitlisted: true, position: this.waitingQueue.size() };
        }
        
        slot.booked++;
        if (slot.booked >= slot.capacity) {
            slot.available = false;
        }
        
        return { success: true, waitlisted: false };
    }

    getAllSlots(date) {
        return this.slots.get(date) || [];
    }
}

// Global slot manager instance
const slotManager = new TimeSlotManager();
