
export enum Module {
  Chatbot = 'chatbot',
  Intelligence = 'intelligence',
  Visuals = 'visuals',
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  module?: Module;
  timestamp: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface ImageConcept {
  id: string;
  title: string;
  conceptDescription: string;
  palette: string[];
  caption: string;
  altText: string;
  aspectRatio: AspectRatio;
  imageUrl?: string;
  isGenerating?: boolean;
}

export interface PostBrief {
  topic: string;
  content: string;
  hashtags: string[];
}

export interface EngagementMetrics {
  period: string;
  summary: string;
  data: { name: string; value: number; fill: string }[];
}

export interface ScheduledPost {
  datetime: string;
  platform: string;
  confirmation: string;
}
