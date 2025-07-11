// Time Slot Management with Hash Map
class TimeSlotManager {
    constructor() {
        this.slots = new SlotHashMap();
        this.waitingQueue = new PriorityQueue();
        this.initializeSlots();
    }

    initializeSlots() {
        const today = new Date();
        for (let day = 0; day < 14; day++) { // 2 weeks of slots
            const date = new Date(today);
            date.setDate(today.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            this.slots.set(dateStr, this.generateDaySlots(dateStr));
        }
    }

    // UPDATED: Generate slots with past-time validation
    generateDaySlots(dateStr) {
        const slots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        const now = new Date();
        const isToday = dateStr === now.toISOString().split('T')[0];

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Check if slot is in the past (only for today)
                const isPastSlot = isToday && (
                    hour < now.getHours() || 
                    (hour === now.getHours() && minute < now.getMinutes())
                );

                slots.push({
                    time: timeStr,
                    available: !isPastSlot, // Disable if past slot
                    capacity: 4,
                    booked: 0,
                    isPast: isPastSlot // Flag for UI
                });
            }
        }
        return slots;
    }

    getAvailableSlots(date) {
        const daySlots = this.slots.get(date) || [];
        return daySlots.filter(slot => 
            slot.available && 
            slot.booked < slot.capacity && 
            !slot.isPast // Explicitly exclude past slots
        );
    }

    // bookSlot(date, time, patientData) {
    //     const daySlots = this.slots.get(date);
    //     if (!daySlots) return { success: false, waitlisted: false };

    //     const slot = daySlots.find(s => s.time === time);
        
    //     // Prevent booking if slot is past/paused/full
    //     if (!slot || slot.isPast || slot.booked >= slot.capacity) {
    //         // Add to priority queue (urgent cases go first)
    //         const priority = patientData.priority === 'urgent' ? 0 : 1;
    //         this.waitingQueue.enqueue(
    //             { date, time, ...patientData }, 
    //             priority
    //         );
    //         return { 
    //             success: false, 
    //             waitlisted: true, 
    //             position: this.waitingQueue.size() 
    //         };
    //     }
        
    //     slot.booked++;
    //     if (slot.booked >= slot.capacity) {
    //         slot.available = false;
    //     }
        
    //     return { success: true, waitlisted: false };
    // }
    // In slot-manager.js
bookSlot(date, time, patientData) {
    const daySlots = this.slots.get(date);
    if (!daySlots) return { success: false, waitlisted: false };

    const slot = daySlots.find(s => s.time === time);
    
    // Check if slot exists, is available, not in past, and has capacity
    if (slot && slot.available && !slot.isPast && slot.booked < slot.capacity) {
        slot.booked++;
        if (slot.booked >= slot.capacity) {
            slot.available = false;
        }
        return { success: true, waitlisted: false };
    }
    
    // If slot is full or unavailable, add to waiting queue
    const priority = patientData.riskLevel === 'high' ? 1 : 
                    patientData.riskLevel === 'medium' ? 2 : 3;
    this.waitingQueue.enqueue(
        { date, time, ...patientData }, 
        priority
    );
    return { 
        success: false, 
        waitlisted: true, 
        position: this.waitingQueue.size() 
    };
}

    // Helper methods (unchanged)
    getAllSlots(date) {
        return this.slots.get(date) || [];
    }
}

// Global instance
const slotManager = new TimeSlotManager();