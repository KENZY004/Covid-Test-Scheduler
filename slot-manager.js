class TimeSlotManager {
    constructor() {
        this.slots = new SlotHashMap();
        this.waitingQueue = new PriorityQueue();
        this.loadSlotState();
        this.initializeSlots();
    }

    loadSlotState() {
        const savedSlots = JSON.parse(localStorage.getItem('slotState'));
        if (savedSlots) {
            // Convert plain object back to SlotHashMap
            const newMap = new SlotHashMap();
            Object.keys(savedSlots).forEach(key => {
                newMap[key] = savedSlots[key];
            });
            this.slots = newMap;
        }
    }

    saveSlotState() {
        localStorage.setItem('slotState', JSON.stringify(this.slots));
    }

    initializeSlots() {
        const today = new Date();
        for (let day = 0; day < 14; day++) {
            const date = new Date(today);
            date.setDate(today.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            
            // Only initialize if not already loaded
            if (!this.slots.get(dateStr)) {
                this.slots.set(dateStr, this.generateDaySlots(dateStr));
            }
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
        const daySlots = this.slots.get(date) || [];
        return daySlots.filter(slot => 
            slot.available && 
            slot.booked < slot.capacity && 
            !slot.isPast
        );
    }

// In slot-manager.js
    bookSlot(date, time, patientData) {
            const slotKey = `${date}-${time}-${patientData.hospital}`;
        const daySlots = this.slots.get(date);
        if (!daySlots) return { success: false, waitlisted: false };

        const slot = daySlots.find(s => s.time === time);
        if (!slot || slot.isPast || slot.booked >= slot.capacity) {
            return { 
                success: false, 
                waitlisted: true,
                position: this.waitingQueue.size() + 1
            };
        }

        slot.booked++;
        if (slot.booked >= slot.capacity) {
            slot.available = false;
        }
        this.saveSlotState();
        return { success: true };
    }
}


const slotManager = new TimeSlotManager();