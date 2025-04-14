// app.js - Frontend script
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const textInput = document.getElementById('text-input');
    const analyzeTextBtn = document.getElementById('analyze-text-btn');
    const textResult = document.getElementById('text-result');
    
    // Emotion bar elements
    const angryBar = document.getElementById('angry-bar');
    const confusedBar = document.getElementById('confused-bar');
    const happyBar = document.getElementById('happy-bar');
    const sadBar = document.getElementById('sad-bar');
    const surpriseBar = document.getElementById('surprise-bar');
    
    // Primary emotion display
    const primaryEmotion = document.getElementById('primary-emotion');
    const emotionEmoji = document.getElementById('emotion-emoji');
    
    // Canvas setup
    const ctx = overlay.getContext('2d');
    let stream = null;
    let detectionInterval = null;
    let faceDetectionActive = false;
    
    // Emotion emojis map
    const emotionEmojis = {
        angry: '😠',
        confused: '😕',
        happy: '😊',
        sad: '😢',
        surprise: '😲',
        neutral: '😐'
    };
    
    // Start camera and face detection
    startBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            video.srcObject = stream;
            overlay.width = video.clientWidth;
            overlay.height = video.clientHeight;
            
            faceDetectionActive = true;
            statusIndicator.classList.add('active');
            statusText.textContent = 'Detection active';
            
            // Start emotion detection process
            startEmotionDetection();
            
        } catch (err) {
            console.error('Error accessing camera:', err);
            statusText.textContent = 'Camera access failed';
        }
    });
    
    // Stop camera and face detection
    stopBtn.addEventListener('click', () => {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
            stream = null;
        }
        
        clearInterval(detectionInterval);
        faceDetectionActive = false;
        statusIndicator.classList.remove('active');
        statusText.textContent = 'Detection stopped';
        
        // Clear canvas
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (video.srcObject) {
            overlay.width = video.clientWidth;
            overlay.height = video.clientHeight;
        }
    });
    
    // Text emotion analysis
    analyzeTextBtn.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            analyzeTextEmotion(text);
        } else {
            textResult.textContent = 'Please enter some text to analyze';
        }
    });
    
    // Function to start emotion detection (simulated)
    function startEmotionDetection() {
        clearInterval(detectionInterval);
        
        detectionInterval = setInterval(() => {
            if (!faceDetectionActive) return;
            
            // Simulate face detection with random rectangle (in real app, would use a face detection API)
            const faceWidth = overlay.width * 0.6;
            const faceHeight = faceWidth * 1.3;
            const x = (overlay.width - faceWidth) / 2;
            const y = (overlay.height - faceHeight) / 2;
            
            // Clear previous drawing
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            
            // Draw face rectangle
            ctx.strokeStyle = 'rgba(0, 247, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(x, y, faceWidth, faceHeight);
            ctx.stroke();
            
            // Add some points on the face (simulating facial landmarks)
            ctx.fillStyle = 'rgba(255, 0, 234, 0.8)';
            
            // Eyes
            const eyeY = y + faceHeight * 0.33;
            const leftEyeX = x + faceWidth * 0.3;
            const rightEyeX = x + faceWidth * 0.7;
            
            ctx.beginPath();
            ctx.arc(leftEyeX, eyeY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEyeX, eyeY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Nose
            ctx.beginPath();
            ctx.arc(x + faceWidth / 2, y + faceHeight * 0.55, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Mouth corners
            const mouthY = y + faceHeight * 0.75;
            const mouthWidth = faceWidth * 0.4;
            
            ctx.beginPath();
            ctx.arc(x + faceWidth / 2 - mouthWidth / 2, mouthY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x + faceWidth / 2 + mouthWidth / 2, mouthY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Connection lines
            ctx.strokeStyle = 'rgba(255, 0, 234, 0.5)';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(leftEyeX, eyeY);
            ctx.lineTo(rightEyeX, eyeY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + faceWidth / 2, y + faceHeight * 0.55);
            ctx.lineTo(x + faceWidth / 2 - mouthWidth / 2, mouthY);
            ctx.lineTo(x + faceWidth / 2 + mouthWidth / 2, mouthY);
            ctx.lineTo(x + faceWidth / 2, y + faceHeight * 0.55);
            ctx.stroke();
            
            // Get simulated emotion values
            const emotions = getSimulatedEmotions();
            updateEmotionDisplay(emotions);
            
        }, 100);
    }
    
    // Function to get simulated emotion values
    function getSimulatedEmotions() {
        // In a real app, this would come from an API
        // For demo purposes, we're generating random values with one dominant emotion
        
        // Base random values
        let emotions = {
            angry: Math.random() * 30,
            confused: Math.random() * 30,
            happy: Math.random() * 30,
            sad: Math.random() * 30,
            surprise: Math.random() * 30
        };
        
        // Choose a dominant emotion every few seconds
        const timestamp = Date.now() / 1000;
        const dominantIndex = Math.floor(timestamp / 3) % 5;
        const emotionKeys = Object.keys(emotions);
        const dominantEmotion = emotionKeys[dominantIndex];
        
        // Make the dominant emotion stronger
        emotions[dominantEmotion] = 50 + Math.random() * 50;
        
        // Normalize so sum is 100
        const sum = Object.values(emotions).reduce((a, b) => a + b, 0);
        Object.keys(emotions).forEach(key => {
            emotions[key] = (emotions[key] / sum) * 100;
        });
        
        return emotions;
    }
    
    // Update emotion display with values
    function updateEmotionDisplay(emotions) {
        // Update bars
        angryBar.style.width = `${emotions.angry}%`;
        confusedBar.style.width = `${emotions.confused}%`;
        happyBar.style.width = `${emotions.happy}%`;
        sadBar.style.width = `${emotions.sad}%`;
        surpriseBar.style.width = `${emotions.surprise}%`;
        
        // Find dominant emotion
        let dominant = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
        
        // Update primary emotion display
        primaryEmotion.textContent = dominant.charAt(0).toUpperCase() + dominant.slice(1);
        emotionEmoji.textContent = emotionEmojis[dominant] || emotionEmojis.neutral;
    }
    
    // Analyze text for emotions (simulated)
    async function analyzeTextEmotion(text) {
        textResult.textContent = 'Analyzing...';
        
        try {
            // In a real app, this would be a call to your backend API
            // For this demo, we'll simulate an API call with setTimeout
            setTimeout(() => {
                const result = simulateTextEmotionAnalysis(text);
                
                // Display results
                textResult.textContent = `Detected emotions: ${result.primaryEmotion} (${Math.round(result.score)}%)`;
                
                // If detection is not active, update display with text emotions
                if (!faceDetectionActive) {
                    const emotions = {
                        angry: result.emotions.angry,
                        confused: result.emotions.confused,
                        happy: result.emotions.happy,
                        sad: result.emotions.sad,
                        surprise: result.emotions.surprise
                    };
                    updateEmotionDisplay(emotions);
                }
            }, 1000);
            
        } catch (error) {
            textResult.textContent = 'Analysis failed: ' + error.message;
        }
    }
    
    // Simple sentiment analysis simulation
    function simulateTextEmotionAnalysis(text) {
        text = text.toLowerCase();
        
        // Very basic keyword matching
        const emotionKeywords = {
            angry: ['angry', 'mad', 'furious', 'annoyed', 'rage', 'hate', 'frustrat', 'irritat'],
            confused: ['confused', 'unsure', 'uncertain', 'puzzled', 'perplexed', 'don\'t understand'],
            happy: ['happy', 'joy', 'excit', 'glad', 'delighted', 'love', 'wonderful', 'great', 'fantastic'],
            sad: ['sad', 'unhappy', 'depress', 'disappoint', 'upset', 'miserable', 'sorrow', 'grief'],
            surprise: ['surprise', 'shock', 'amaze', 'astonish', 'wow', 'unexpected']
        };
        
        // Initialize scores
        const emotions = {
            angry: 10,
            confused: 10,
            happy: 10,
            sad: 10,
            surprise: 10
        };
        
        // Check for keywords
        Object.keys(emotionKeywords).forEach(emotion => {
            emotionKeywords[emotion].forEach(keyword => {
                if (text.includes(keyword)) {
                    emotions[emotion] += 30;
                }
            });
        });
        
        // Check for punctuation indicators
        if (text.includes('!')) {
            emotions.angry += 5;
            emotions.surprise += 10;
            emotions.happy += 5;
        }
        
        if (text.includes('?')) {
            emotions.confused += 15;
        }
        
        // Normalize to 100%
        const sum = Object.values(emotions).reduce((a, b) => a + b, 0);
        Object.keys(emotions).forEach(emotion => {
            emotions[emotion] = (emotions[emotion] / sum) * 100;
        });
        
        // Find dominant emotion
        let dominant = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
        
        return {
            primaryEmotion: dominant.charAt(0).toUpperCase() + dominant.slice(1),
            score: emotions[dominant],
            emotions: emotions
        };
    }
});