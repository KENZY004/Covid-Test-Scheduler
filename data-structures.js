// Priority Queue Implementation
class PriorityQueue {
    constructor() {
        this.heap = [];
        this.priorityLevels = {
            'high': 1,
            'medium': 2,
            'low': 3
        };
    }

    enqueue(item, priority) {
        const priorityValue = this.priorityLevels[priority] || 3;
        this.heap.push({ item, priority: priorityValue });
        this.heapifyUp();
    }

    dequeue() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const root = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown();
        return root;
    }

    heapifyUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    heapifyDown() {
        let index = 0;
        while (index * 2 + 1 < this.heap.length) {
            const leftChild = index * 2 + 1;
            const rightChild = index * 2 + 2;
            let smallest = leftChild;
            
            if (rightChild < this.heap.length && 
                this.heap[rightChild].priority < this.heap[leftChild].priority) {
                smallest = rightChild;
            }
            
            if (this.heap[index].priority <= this.heap[smallest].priority) break;
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    peek() {
        return this.heap[0];
    }
}

// Slot HashMap 
class SlotHashMap {
    constructor() {
        this.buckets = new Array(16);
        this.size = 0;
    }

    hash(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash + key.charCodeAt(i)) % this.buckets.length;
        }
        return hash;
    }

    set(key, value) {
        const index = this.hash(key);
        if (!this.buckets[index]) {
            this.buckets[index] = [];
        }

        const bucket = this.buckets[index];
        const existingItem = bucket.find(item => item.key === key);
        
        if (existingItem) {
            existingItem.value = value;
        } else {
            bucket.push({ key, value });
            this.size++;
        }
    }

    get(key) {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        if (!bucket) return null;

        const item = bucket.find(item => item.key === key);
        return item ? item.value : null;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        if (!bucket) return false;

        const itemIndex = bucket.findIndex(item => item.key === key);
        if (itemIndex !== -1) {
            bucket.splice(itemIndex, 1);
            this.size--;
            return true;
        }
        return false;
    }

    keys() {
        const keys = [];
        for (const bucket of this.buckets) {
            if (bucket) {
                for (const item of bucket) {
                    keys.push(item.key);
                }
            }
        }
        return keys;
    }

    values() {
        const values = [];
        for (const bucket of this.buckets) {
            if (bucket) {
                for (const item of bucket) {
                    values.push(item.value);
                }
            }
        }
        return values;
    }
}