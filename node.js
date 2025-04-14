// server.js - Node.js backend with ML-based emotion detection
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const { createCanvas, loadImage } = require('canvas');
const WebSocket = require('ws');
const http = require('http');
const natural = require('natural');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// ML Model variables
let emotionModel;
let faceDetector;
const emotionLabels = ['angry', 'disgusted', 'fearful', 'happy', 'sad', 'surprised', 'neutral'];

// Text analysis
const { SentimentAnalyzer, WordTokenizer } = natural;
const tokenizer = new WordTokenizer();
const analyzer = new SentimentAnalyzer('English');

// Emotion keywords for enhanced text analysis
const emotionKeywords = {
    angry: ['angry', 'mad', 'furious', 'annoyed', 'rage', 'hate', 'frustrat', 'irritat'],
    disgusted: ['disgust', 'gross', 'sick', 'nausea', 'repulsive'],
    fearful: ['fear', 'afraid', 'scared', 'terrified', 'worried', 'anxious'],
    happy: ['happy', 'joy', 'excit', 'glad', 'delighted', 'love', 'wonderful', 'great'],
    sad: ['sad', 'unhappy', 'depress', 'disappoint', 'upset', 'miserable', 'sorrow'],
    surprised: ['surprise', 'shock', 'amaze', 'astonish', 'wow', 'unexpected'],
    neutral: ['normal', 'okay', 'fine', 'neutral']
};

// Load ML models
async function loadModels() {
    try {
        console.log('Loading emotion detection models...');
        
        // Load face detector model
        faceDetector = await tf.loadGraphModel('file://./models/face_detection_model/model.json');
        
        // Load emotion classifier model
        emotionModel = await tf.loadLayersModel('file://./models/emotion_recognition_model/model.json');
        
        console.log('All models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Preprocess image for face detection
async function preprocessImage(imageBuffer) {
    // Load image
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to tensor
    const tensor = tf.browser.fromPixels(imageData)
        .expandDims(0)
        .toFloat()
        .div(255.0);
        
    return { tensor, width: image.width, height: image.height };
}

// Detect faces in image
async function detectFaces(imageTensor, imageWidth, imageHeight) {
    // Run face detection
    const predictions = await faceDetector.predict(imageTensor);
    
    // Process predictions (specific format depends on your face detection model)
    // This is a simplified example - adjust according to your model's output format
    const boxes = await predictions[0].arraySync();
    const scores = await predictions[1].arraySync();
    
    // Filter by score threshold
    const threshold = 0.7;
    const validBoxes = [];
    
    for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] >= threshold) {
            // Convert normalized box coordinates to pixel values
            const box = boxes[0][i];
            validBoxes.push({
                yMin: box[0] * imageHeight,
                xMin: box[1] * imageWidth,
                yMax: box[2] * imageHeight,
                xMax: box[3] * imageWidth,
                score: scores[0][i]
            });
        }
    }
    
    return validBoxes;
}

// Extract face from image and classify emotion
async function classifyEmotion(imageBuffer, face) {
    try {
        // Load image
        const image = await loadImage(imageBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        // Extract face region
        const faceWidth = face.xMax - face.xMin;
        const faceHeight = face.yMax - face.yMin;
        const faceData = ctx.getImageData(face.xMin, face.yMin, faceWidth, faceHeight);
        
        // Create a new canvas for the face
        const faceCanvas = createCanvas(48, 48); // Emotion model expects 48x48
        const faceCtx = faceCanvas.getContext('2d');
        
        // Draw the face on the new canvas, converting to grayscale
        faceCtx.drawImage(image, 
            face.xMin, face.yMin, faceWidth, faceHeight,
            0, 0, 48, 48);
        const faceImageData = faceCtx.getImageData(0, 0, 48, 48);
        
        // Convert to grayscale tensor
        const rgbData = faceImageData.data;
        const grayData = new Float32Array(48 * 48);
        
        for (let i = 0; i < rgbData.length; i += 4) {
            // Convert RGB to grayscale using luminance formula
            const gray = 0.2989 * rgbData[i] + 0.5870 * rgbData[i + 1] + 0.1140 * rgbData[i + 2];
            grayData[i / 4] = gray / 255.0; // Normalize to [0, 1]
        }
        
        // Reshape for model input
        const tensor = tf.tensor(grayData).reshape([1, 48, 48, 1]);
        
        // Predict emotion
        const predictions = await emotionModel.predict(tensor);
        const emotionScores = await predictions.arraySync();
        
        // Process results
        const emotionResult = {};
        emotionLabels.forEach((emotion, i) => {
            emotionResult[emotion] = emotionScores[0][i] * 100; // Convert to percentage
        });
        
        // Find dominant emotion
        const dominantEmotion = emotionLabels.reduce(
            (max, emotion) => emotionResult[emotion] > emotionResult[max] ? emotion : max,
            emotionLabels[0]
        );
        
        // Clean up tensors
        tensor.dispose();
        predictions.dispose();
        
        return {
            emotions: emotionResult,
            dominantEmotion
        };
    } catch (error) {
        console.error('Error classifying emotion:', error);
        throw error;
    }
}

// Analyze text for emotional content
function analyzeTextEmotion(text) {
    // Basic sentiment analysis
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const sentimentScore = analyzer.getSentiment(tokens);
    
    // Initialize emotion scores with small base values
    const emotions = {
        angry: 5,
        disgusted: 5,
        fearful: 5,
        happy: 5,
        sad: 5,
        surprised: 5,
        neutral: 15 // Higher base value for neutral
    };
    
    // Check for emotion keywords
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        for (const keyword of keywords) {
            for (const token of tokens) {
                if (token.includes(keyword)) {
                    emotions[emotion] += 20; // Increase score for found keyword
                }
            }
        }
    }
    
    // Adjust based on sentiment score
    if (sentimentScore > 0.3) {
        emotions.happy += 30;
    } else if (sentimentScore < -0.3) {
        emotions.sad += 20;
        emotions.angry += 10;
    } else {
        emotions.neutral += 20;
    }
    
    // Check for punctuation
    if (text.includes('!')) {
        emotions.surprised += 10;
        emotions.angry += 5;
        emotions.happy += 5;
    }
    
    if (text.includes('?')) {
        emotions.surprised += 5;
    }
    
    // Normalize to 100%
    const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
    for (const emotion in emotions) {
        emotions[emotion] = (emotions[emotion] / total) * 100;
    }
    
    // Find dominant emotion
    const dominantEmotion = Object.keys(emotions).reduce(
        (max, emotion) => emotions[emotion] > emotions[max] ? emotion : max,
        Object.keys(emotions)[0]
    );
    
    return {
        emotions,
        dominantEmotion,
        sentimentScore
    };
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Emotion detection API is running' });
});

// Process image for emotion detection
app.post('/api/detect-face', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imagePath = req.file.path;
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Preprocess image
        const { tensor, width, height } = await preprocessImage(imageBuffer);
        
        // Detect faces
        const faces = await detectFaces(tensor, width, height);
        
        if (faces.length === 0) {
            return res.status(404).json({ error: 'No faces detected in the image' });
        }
        
        // Process each face
        const results = [];
        for (const face of faces) {
            // Classify emotion
            const emotionResult = await classifyEmotion(imageBuffer, face);
            
            results.push({
                box: {
                    x: face.xMin,
                    y: face.yMin,
                    width: face.xMax - face.xMin,
                    height: face.yMax - face.yMin
                },
                emotions: emotionResult.emotions,
                dominantEmotion: emotionResult.dominantEmotion,
                confidence: face.score
            });
        }
        
        // Clean up
        fs.unlinkSync(imagePath);
        tensor.dispose();
        
        res.json({ results });
        
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

// Text emotion analysis endpoint
app.post('/api/analyze-text', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Valid text input is required' });
        }
        
        const result = analyzeTextEmotion(text);
        res.json(result);
        
    } catch (error) {
        console.error('Error analyzing text:', error);
        res.status(500).json({ error: 'Failed to analyze text' });
    }
});

// WebSocket for real-time video processing
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (message) => {
        try {
            // Parse message type
            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                // Assume binary data (image frame)
                if (message instanceof Buffer) {
                    // Process video frame
                    const { tensor, width, height } = await preprocessImage(message);
                    const faces = await detectFaces(tensor, width, height);
                    
                    if (faces.length > 0) {
                        // Process first face only for performance
                        const emotionResult = await classifyEmotion(message, faces[0]);
                        
                        // Send results back
                        ws.send(JSON.stringify({
                            type: 'emotion-result',
                            data: {
                                box: {
                                    x: faces[0].xMin,
                                    y: faces[0].yMin,
                                    width: faces[0].xMax - faces[0].xMin,
                                    height: faces[0].yMax - faces[0].yMin
                                },
                                emotions: emotionResult.emotions,
                                dominantEmotion: emotionResult.dominantEmotion
                            }
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'no-face-detected'
                        }));
                    }
                    
                    // Clean up
                    tensor.dispose();
                }
                return;
            }
            
            // Handle text messages
            if (data.type === 'text-analysis') {
                const result = analyzeTextEmotion(data.text);
                ws.send(JSON.stringify({
                    type: 'text-result',
                    data: result
                }));
            }
            
        } catch (error) {
            console.error('WebSocket processing error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process data'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start server
async function startServer() {
    await loadModels();
    
    server.listen(PORT, () => {
        console.log(`Emotion detection server running on port ${PORT}`);
    });
}

startServer().catch(console.error);

module.exports = app;