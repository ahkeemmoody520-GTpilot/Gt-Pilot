
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { ImageConcept, AspectRatio, EngagementMetrics, PostBrief, ScheduledPost } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- System Prompts ---
const SYSTEM_PROMPT_CHATBOT = `Act as GT Pilot’s chat interface. Understand user goals, capture missing parameters, and hand off to Intelligence or Image modules. Support quick commands: “plan week,” “summarize engagement,” “generate visual,” and “schedule post.” Always confirm intent, show the routed module, and return a short checklist of next steps. Keep responses very concise.`;

const SYSTEM_PROMPT_INTELLIGENCE = `You are the core brain of GT Pilot, a modular social media manager. Your role is to understand user commands and call the appropriate function to fulfill the request. The available functions are: generatepostbriefs, summarizemetrics, and schedulepost. Keep responses concise, actionable, and tagged with module names for audit.`;

const SYSTEM_PROMPT_VISUALS = `You are the visual creation module for GT Pilot. Given a brand name, tone, and content brief, your task is to produce 1-3 distinct image concepts. For each concept, provide a title, a detailed concept description (this will be used as a prompt for an image generation model), a color palette, a social media caption, and alt text. Prioritize clean layouts, legible typography, and platform-optimized aspect ratios.`;


// --- Function Declarations for Intelligence Module ---
const generatePostBriefsDeclaration: FunctionDeclaration = {
    name: 'generatepostbriefs',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates social media post briefs based on a topic and tone.',
        properties: {
            topic: { type: Type.STRING, description: 'The central topic for the posts.' },
            tone: { type: Type.STRING, description: 'The desired tone of voice (e.g., professional, witty, casual).' }
        },
        required: ['topic', 'tone']
    }
};

const summarizeMetricsDeclaration: FunctionDeclaration = {
    name: 'summarizemetrics',
    parameters: {
        type: Type.OBJECT,
        description: 'Summarizes social media engagement metrics for a given period.',
        properties: {
            period: { type: Type.STRING, description: 'The time period to summarize (e.g., "last7days", "lastmonth").' }
        },
        required: ['period']
    }
};

const schedulePostDeclaration: FunctionDeclaration = {
    name: 'schedulepost',
    parameters: {
        type: Type.OBJECT,
        description: 'Schedules a post for a specific date, time, and platform.',
        properties: {
            datetime: { type: Type.STRING, description: 'The ISO 8601 date and time for scheduling.' },
            platform: { type: Type.STRING, description: 'The social media platform (e.g., Twitter, Instagram).' }
        },
        required: ['datetime', 'platform']
    }
};


// --- Service Functions ---

export const getChatbotResponse = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: SYSTEM_PROMPT_CHATBOT,
            }
        });
        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

export const routeAndExecuteCommand = async (prompt: string): Promise<EngagementMetrics | PostBrief[] | ScheduledPost | { error: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT_INTELLIGENCE,
                tools: [{ functionDeclarations: [generatePostBriefsDeclaration, summarizeMetricsDeclaration, schedulePostDeclaration] }]
            },
        });

        const call = response.functionCalls?.[0];

        if (!call) {
            return { error: "I couldn't determine the right action. Could you please rephrase?" };
        }
        
        // Mock function execution
        switch (call.name) {
            case 'summarizemetrics':
                const period = call.args.period as string;
                return {
                    period: period,
                    summary: `Engagement for ${period} shows strong growth in shares and comments.`,
                    data: [
                        { name: 'Likes', value: Math.floor(Math.random() * 5000) + 1000, fill: '#8884d8' },
                        { name: 'Comments', value: Math.floor(Math.random() * 1000) + 200, fill: '#82ca9d' },
                        { name: 'Shares', value: Math.floor(Math.random() * 800) + 150, fill: '#ffc658' },
                        { name: 'Views', value: Math.floor(Math.random() * 20000) + 5000, fill: '#ff8042' },
                    ]
                } as EngagementMetrics;
            
            case 'generatepostbriefs':
                 const topic = call.args.topic as string;
                 return [
                     { topic, content: `Exploring the future of ${topic} in modern tech.`, hashtags: [`#${topic.replace(/\s+/g, '')}`, '#Innovation'] },
                     { topic, content: `A deep dive into how ${topic} is changing the industry.`, hashtags: [`#${topic.replace(/\s+/g, '')}`, '#TechTrends'] },
                     { topic, content: `5 key takeaways about ${topic} you need to know.`, hashtags: [`#${topic.replace(/\s+/g, '')}`, '#FutureTech'] }
                 ] as PostBrief[];

            case 'schedulepost':
                const { datetime, platform } = call.args;
                return {
                    datetime: datetime as string,
                    platform: platform as string,
                    confirmation: `Successfully scheduled post for ${platform} at ${new Date(datetime as string).toLocaleString()}.`
                } as ScheduledPost;

            default:
                return { error: `Function ${call.name} is not implemented.` };
        }
    } catch (error) {
        console.error("Error in intelligence module:", error);
        return { error: "An error occurred while processing your command." };
    }
};

export const getImageConcepts = async (brandName: string, tone: string, brief: string): Promise<Omit<ImageConcept, 'id' | 'imageUrl' | 'isGenerating'>[]> => {
    try {
        const prompt = `Brand Name: ${brandName}\nTone: ${tone}\nContent Brief: ${brief}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT_VISUALS,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        concepts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    conceptDescription: { type: Type.STRING },
                                    palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    caption: { type: Type.STRING },
                                    altText: { type: Type.STRING },
                                    aspectRatio: { type: Type.STRING, enum: ["1:1", "16:9", "9:16", "4:3", "3:4"] }
                                }
                            }
                        }
                    }
                }
            }
        });
        const result = JSON.parse(response.text);
        return result.concepts;
    } catch (error) {
        console.error("Error generating image concepts:", error);
        throw new Error("Failed to generate image concepts.");
    }
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
                outputMimeType: 'image/jpeg',
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate the image.");
    }
};
