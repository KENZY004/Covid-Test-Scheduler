// queue-manager.js
class QueueManager {
    // constructor() {
    //     this.testingQueue = new PriorityQueue();
    //     this.vaccinationQueue = new PriorityQueue();
    //     this.currentlyServing = {
    //         testing: null,
    //         vaccination: null
    //     };
    //     this.stats = {
    //         totalServed: 0,
    //         averageWaitTime: 15,
    //         currentWaitTime: 12,
    //         lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    //     };
    // }
     constructor() {
        this.testingQueue = new PriorityQueue();
        this.vaccinationQueue = new PriorityQueue();
        this.currentlyServing = {
            testing: null,
            vaccination: null
        };
        this.stats = {
            totalServed: 0,
            averageWaitTime: 15,
            currentWaitTime: 12,
            lastUpdated: new Date().toLocaleTimeString()
        };
        
        // Clear any existing queue data from localStorage
        localStorage.removeItem('queueState');
    }

    getQueue(type) {
        const queue = type === 'testing' ? this.testingQueue : this.vaccinationQueue;
        
        // Create a sorted array from the heap
        const sortedHeap = [...queue.heap].sort((a, b) => {
            // First sort by priority (high=1, medium=2, low=3)
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Then by time of booking (earlier first)
            return new Date(a.item.bookedAt) - new Date(b.item.bookedAt);
        });

        // Add position numbers based on priority
        const sortedPatients = [];
        sortedHeap.forEach((item, index) => {
            const patient = {
                ...item.item,
                position: index + 1
            };
            sortedPatients.push(patient);
        });

        return sortedPatients;
    }

    getCurrentlyServing(type) {
        return this.currentlyServing[type];
    }

    addToQueue(type, patient) {
        const queue = type === 'testing' ? this.testingQueue : this.vaccinationQueue;
        queue.enqueue(patient, patient.riskLevel);
        this.updateStats();
        return this.getQueue(type);
    }

    updateQueue() {
        const now = new Date();
        this.stats.lastUpdated = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Process testing queue
        if (!this.testingQueue.isEmpty()) {
            this.currentlyServing.testing = this.testingQueue.dequeue().item;
            this.stats.totalServed++;
        }

        // Process vaccination queue
        if (!this.vaccinationQueue.isEmpty()) {
            this.currentlyServing.vaccination = this.vaccinationQueue.dequeue().item;
            this.stats.totalServed++;
        }

        this.updateStats();
    }

    updateStats() {
        const testingCount = this.testingQueue.size();
        const vaccinationCount = this.vaccinationQueue.size();
        
        // Calculate priority factor (high priority patients reduce wait time)
        const priorityFactor = this.getPriorityFactor();
        
        this.stats.currentWaitTime = Math.max(5, 
            (testingCount + vaccinationCount) * 5 * priorityFactor + Math.floor(Math.random() * 10)
        );
        this.stats.averageWaitTime = Math.max(10, 
            (testingCount + vaccinationCount) * 3 * priorityFactor + Math.floor(Math.random() * 7)
        );
    }

    getPriorityFactor() {
        const highPriorityInTesting = this.testingQueue.heap.some(item => item.priority === 1);
        const highPriorityInVaccination = this.vaccinationQueue.heap.some(item => item.priority === 1);
        return (highPriorityInTesting || highPriorityInVaccination) ? 0.7 : 1;
    }

    getStats() {
        return {
            ...this.stats,
            testingQueueLength: this.testingQueue.size(),
            vaccinationQueueLength: this.vaccinationQueue.size(),
            lastUpdated: this.stats.lastUpdated
        };
    }

    getEstimatedWaitTime(position, riskLevel) {
        const baseTime = riskLevel === 'high' ? 3 : 
                         riskLevel === 'medium' ? 5 : 7;
        return position * baseTime;
    }

    removeFromQueue(type, patientId) {
        const queue = type === 'testing' ? this.testingQueue : this.vaccinationQueue;
        queue.heap = queue.heap.filter(item => item.item.id !== patientId);
        this.updateStats();
    }
}

const queueManager = new QueueManager();