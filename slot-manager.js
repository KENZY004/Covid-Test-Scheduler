
class TimeSlotManager {
    constructor() {
        this.slots = {};
        this.initializeSlots();
    }

    initializeSlots() {
        // Try to load from localStorage first
        const savedSlots = localStorage.getItem('slotState');
        
        if (savedSlots) {
            try {
                this.slots = JSON.parse(savedSlots);
                console.log("Slots restored from localStorage");
                return;
            } catch (e) {
                console.error("Error restoring slots from localStorage:", e);
                // If restoration fails, proceed to generate new slots
            }
        }
        
        // Generate new slots if none were saved or restoration failed
        this.generateSlotsForNextTwoWeeks();
        this.saveSlotState();
    }

    generateSlotsForNextTwoWeeks() {
        const today = new Date();
        
        for (let day = 0; day < 14; day++) {
            const date = new Date(today);
            date.setDate(today.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            
            this.slots[dateStr] = this.generateDaySlots(dateStr);
        }
    }

    generateDaySlots(dateStr) {
        const slots = [];
        const startHour = 9;
        const endHour = 17;
        const now = new Date();
        const isToday = dateStr === now.toISOString().split('T')[0];

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const isPast = isToday && (
                    hour < now.getHours() || 
                    (hour === now.getHours() && minute < now.getMinutes())
                );

                slots.push({
                    time: timeStr,
                    available: !isPast,
                    capacity: 4,
                    booked: 0,
                    isPast: isPast
                });
            }
        }
        return slots;
    }

    getAvailableSlots(date) {
        if (!this.slots[date]) {
            // If date doesn't exist in slots, generate slots for it
            this.slots[date] = this.generateDaySlots(date);
            this.saveSlotState();
        }
        
        return this.slots[date].filter(slot => 
            slot.available && 
            slot.booked < slot.capacity && 
            !slot.isPast
        );
    }

    bookSlot(date, time, patientData) {
        // Ensure date exists in slots
        if (!this.slots[date]) {
            this.slots[date] = this.generateDaySlots(date);
        }
        
        const daySlots = this.slots[date];
        const slot = daySlots.find(s => s.time === time);
        
        if (!slot || slot.isPast || slot.booked >= slot.capacity) {
            return { 
                success: false, 
                waitlisted: true,
                position: 1 // Simple waitlist position
            };
        }

        slot.booked++;
        if (slot.booked >= slot.capacity) {
            slot.available = false;
        }
        
        this.saveSlotState();
        return { success: true };
    }

    cancelSlot(date, time) {
        if (!this.slots[date]) return false;

        const daySlots = this.slots[date];
        const slot = daySlots.find(s => s.time === time);
        
        if (!slot) return false;

        slot.booked = Math.max(0, slot.booked - 1);
        
        // If slots become available again, mark as available
        if (slot.booked < slot.capacity) {
            slot.available = true;
        }
        
        this.saveSlotState();
        return true;
    }

    saveSlotState() {
        localStorage.setItem('slotState', JSON.stringify(this.slots));
    }
}

const slotManager = new TimeSlotManager();