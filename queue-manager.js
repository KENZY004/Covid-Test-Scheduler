
// Queue Management System using Data Structures
class QueueManager {
    constructor() {
        this.testingQueue = [];
        this.vaccinationQueue = [];
        this.currentlyServing = {
            testing: null,
            vaccination: null
        };
        this.stats = {
            totalServed: 0,
            averageWaitTime: 15,
            currentWaitTime: 12
        };
        this.initializeQueue();
    }

    initializeQueue() {
        // Initialize with sample data for demonstration
        const testPatients = [
            { id: 1, name: 'John D.', time: '14:30', type: 'PCR Test', priority: 'normal', position: 1 },
            { id: 2, name: 'Sarah M.', time: '14:45', type: 'Rapid Test', priority: 'urgent', position: 2 },
            { id: 3, name: 'Mike R.', time: '15:00', type: 'PCR Test', priority: 'normal', position: 3 },
            { id: 4, name: 'Emily K.', time: '15:15', type: 'Rapid Test', priority: 'normal', position: 4 },
        ];

        const vaccinePatients = [
            { id: 5, name: 'David L.', time: '14:20', type: 'Booster Shot', priority: 'normal', position: 1 },
            { id: 6, name: 'Lisa H.', time: '14:40', type: 'First Dose', priority: 'normal', position: 2 },
            { id: 7, name: 'Tom B.', time: '15:20', type: 'Second Dose', priority: 'normal', position: 3 },
        ];

        this.testingQueue = testPatients;
        this.vaccinationQueue = vaccinePatients;
        this.currentlyServing.testing = { id: 0, name: 'Anna C.', type: 'PCR Test', startTime: '14:15' };
        this.currentlyServing.vaccination = { id: 0, name: 'Robert S.', type: 'Booster Shot', startTime: '14:10' };
    }

    getQueue(type) {
        return type === 'testing' ? this.testingQueue : this.vaccinationQueue;
    }

    getCurrentlyServing(type) {
        return this.currentlyServing[type];
    }

    addToQueue(type, patient) {
        const queue = this.getQueue(type);
        patient.position = queue.length + 1;
        patient.id = Date.now();
        queue.push(patient);
        this.updatePositions(type);
    }

    updateQueue() {
        // Simulate queue progression
        const random = Math.random();
        
        if (random < 0.3 && this.testingQueue.length > 0) {
            // Move testing queue forward
            this.currentlyServing.testing = this.testingQueue.shift();
            this.updatePositions('testing');
            this.stats.totalServed++;
        }
        
        if (random < 0.2 && this.vaccinationQueue.length > 0) {
            // Move vaccination queue forward
            this.currentlyServing.vaccination = this.vaccinationQueue.shift();
            this.updatePositions('vaccination');
            this.stats.totalServed++;
        }

        // Update wait times
        this.stats.currentWaitTime = Math.max(5, this.stats.currentWaitTime + (Math.random() - 0.5) * 10);
        this.stats.averageWaitTime = Math.max(10, this.stats.averageWaitTime + (Math.random() - 0.5) * 5);
    }

    updatePositions(type) {
        const queue = this.getQueue(type);
        queue.forEach((patient, index) => {
            patient.position = index + 1;
        });
    }

    getStats() {
        return {
            ...this.stats,
            testingQueueLength: this.testingQueue.length,
            vaccinationQueueLength: this.vaccinationQueue.length
        };
    }

    getEstimatedWaitTime(position) {
        const baseTime = 15; // minutes per person
        return position * baseTime;
    }
}

// Global queue manager instance
const queueManager = new QueueManager();
