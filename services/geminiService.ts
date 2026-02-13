
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VideoData, SeoAnalysisResult, ThumbnailAnalysisResult, ChannelAnalysisResult, SingleVideoAnalysis, KeywordAnalysisResult, KeywordAnalysisSource } from "../types";

const geminiApiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

export const analyzeKeywordSEO = async (
  searchTerm: string, 
  videos: VideoData[], 
  modelId: string,
  regionName: string = "Toàn cầu",
  timeframe: string = "12 tháng qua",
  categoryName: string = "Tất cả danh mục"
): Promise<KeywordAnalysisResult> => {
  const model = modelId || "gemini-3-flash-preview";
  
  const views = videos.map(v => v.viewCountRaw || 0);
  const highestViews = Math.max(...views, 0);
  const avgViews = Math.round(views.reduce((a, b) => a + b, 0) / (videos.length || 1));
  
  const now = new Date();
  const last7DaysCount = videos.filter(v => {
      const d = new Date(v.publishedAt);
      return (now.getTime() - d.getTime()) <= (7 * 24 * 60 * 60 * 1000);
  }).length;
  
  const ccCount = videos.filter(v => v.caption === 'true').length;
  const inTitleCount = videos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase())).length;
  
  const channels: Record<string, { count: number; views: number }> = {};
  videos.forEach(v => {
      if (!channels[v.channelTitle]) channels[v.channelTitle] = { count: 0, views: 0 };
      channels[v.channelTitle].count++;
      channels[v.channelTitle].views += (v.viewCountRaw || 0);
  });
  const sortedCreators = Object.entries(channels).sort((a, b) => b[1].views - a[1].views);
  const topCreator = sortedCreators[0]?.[0] || "Chưa xác định";

  const prompt = `
    Bạn là một chuyên gia phân tích dữ liệu YouTube Master.
    NHIỆM VỤ: Hãy sử dụng công cụ Google Search để tìm nạp dữ liệu thực tế mới nhất từ Google Trends và YouTube Search cho từ khóa: "${searchTerm}".
    
    BỐI CẢNH TÌM KIẾM:
    - Vùng: ${regionName}
    - Thời gian: ${timeframe}
    - Danh mục: ${categoryName}

    Dựa trên thông tin tìm được, hãy trả về dữ liệu phân tích chi tiết.
    Yêu cầu trả về JSON chính xác theo Schema. Trả lời bằng tiếng Việt.
    Hãy cung cấp:
    - 15 từ khóa đang gia tăng (Rising Keywords) thực tế từ Trends.
    - 15 cơ hội từ khóa hàng đầu (Top Opportunities) dựa trên xu hướng tìm kiếm hiện tại.
    - Phân loại rõ ràng 'topic' và 'country'.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      overallScore: { type: Type.NUMBER },
      volume: { type: Type.NUMBER },
      competition: { type: Type.NUMBER },
      relatedKeywords: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            score: { type: Type.NUMBER }
          },
          required: ["term", "score"]
        }
      },
      risingKeywords: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            volume: { type: Type.STRING },
            change: { type: Type.STRING },
            isUp: { type: Type.BOOLEAN },
            topic: { type: Type.STRING },
            country: { type: Type.STRING }
          },
          required: ["term", "volume", "change", "isUp", "topic", "country"]
        }
      },
      topOpportunities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            score: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            topic: { type: Type.STRING },
            country: { type: Type.STRING }
          },
          required: ["term", "score", "reason", "topic", "country"]
        }
      }
    },
    required: ["overallScore", "volume", "competition", "relatedKeywords", "risingKeywords", "topOpportunities"]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        tools: [{ googleSearch: {} }] 
      },
    });

    const sources: KeywordAnalysisSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({ title: chunk.web.title || "Nguồn tin cậy", uri: chunk.web.uri });
        }
      });
    }

    const aiData = JSON.parse(response.text || '{}');
    
    return {
      searchTerm,
      highestViews,
      avgViews,
      addedLast7Days: `${last7DaysCount}/${videos.length}`,
      ccCount: `${ccCount}/${videos.length}`,
      timesInTitle: `${inTitleCount}/${videos.length}`,
      timesInDesc: videos.filter(v => v.description.toLowerCase().includes(searchTerm.toLowerCase())).length + `/${videos.length}`,
      topCreator,
      avgAge: "Theo xu hướng hiện tại",
      topChannels: sortedCreators.slice(0, 3).map(([name]) => ({ name, subscriberCount: "N/A" })),
      ...aiData,
      sources: sources.length > 0 ? sources : undefined
    } as KeywordAnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Lỗi khi kết nối với Google Trends Real-time.");
  }
};

export const analyzeSeoStrategy = async (videos: VideoData[], modelId: string): Promise<SeoAnalysisResult> => {
  const model = modelId || "gemini-3-flash-preview";
  const prompt = `Phân tích chiến lược SEO và trả về JSON. Trả lời bằng tiếng Việt.`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || '{}') as SeoAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích SEO`); }
};

export const analyzeThumbnailPatterns = async (videos: VideoData[], modelId: string): Promise<ThumbnailAnalysisResult> => {
  const model = modelId || "gemini-3-flash-preview";
  const prompt = `Phân tích thumbnail và trả về JSON. Trả lời bằng tiếng Việt.`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || '{}') as ThumbnailAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích Thumbnail`); }
};

export const analyzeChannelStrategy = async (videos: VideoData[], modelId: string): Promise<ChannelAnalysisResult> => {
  const model = modelId || "gemini-3-flash-preview";
  const prompt = `Phân tích SWOT cho kênh và trả về JSON. Trả lời bằng tiếng Việt.`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || '{}') as ChannelAnalysisResult;
  } catch (error) { throw new Error(`Lỗi phân tích Kênh`); }
};

export const analyzeSingleVideoAnalytics = async (video: VideoData, modelId: string): Promise<SingleVideoAnalysis> => {
  const model = modelId || "gemini-3-flash-preview";
  
  const prompt = `
    Phân tích chi tiết video YouTube sau dựa trên thông tin được cung cấp:
    Tiêu đề: ${video.title}
    Mô tả: ${video.description}
    Kênh: ${video.channelTitle}
    Lượt xem: ${video.viewCountRaw}
    Lượt thích: ${video.likeCountRaw}
    Tỉ lệ tương tác: ${video.engagementRate}%

    Yêu cầu trả về kết quả dưới định dạng JSON theo cấu trúc chính xác. 
    Dự đoán nhân khẩu học khán giả (ageGroups, genderDistribution, targetLocations) dựa trên phong cách nội dung và metadata.
    Trả lời hoàn toàn bằng tiếng Việt.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      performanceVerdict: { type: Type.STRING, description: "Kết luận tổng quan về hiệu suất video" },
      audienceHook: { type: Type.STRING, description: "Cơ chế thu hút khán giả" },
      retentionStrategy: { type: Type.STRING, description: "Chiến lược giữ chân người xem" },
      growthPotential: { type: Type.STRING, description: "Tiềm năng tăng trưởng" },
      predictedDemographics: {
        type: Type.OBJECT,
        properties: {
          ageGroups: { type: Type.STRING },
          genderDistribution: { type: Type.STRING },
          targetLocations: { type: Type.STRING }
        },
        required: ["ageGroups", "genderDistribution", "targetLocations"]
      }
    },
    required: ["performanceVerdict", "audienceHook", "retentionStrategy", "growthPotential", "predictedDemographics"]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: schema
      },
    });
    return JSON.parse(response.text || '{}') as SingleVideoAnalysis;
  } catch (error) { 
    console.error("Single Analysis Error:", error);
    throw new Error(`Lỗi phân tích video chi tiết`); 
  }
};
