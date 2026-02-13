
export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelId: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  publishedAt: string;
  duration?: string;
  tags?: string[];
  viewCountRaw?: number;
  likeCountRaw?: number;
  commentCountRaw?: number;
  categoryId?: string;
  engagementRate?: string;
  definition?: string;
  caption?: string;
  licensedContent?: boolean;
  projection?: string;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  topicCategories?: string[];
  madeForKids?: boolean;
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  recordingLocation?: string;
  contentRating?: any;
}

export interface RisingKeyword {
  term: string;
  volume: string;
  change: string;
  isUp: boolean;
  topic: string; 
  country: string;
}

export interface KeywordOpportunity {
  term: string;
  score: number;
  reason: string;
  topic: string;
  country: string;
}

export interface KeywordAnalysisSource {
  title: string;
  uri: string;
}

export interface KeywordAnalysisResult {
  searchTerm: string;
  overallScore: number;
  volume: number;
  competition: number;
  highestViews: number;
  avgViews: number;
  avgSubscribers?: string;
  addedLast7Days: string;
  ccCount: string;
  avgAge: string;
  timesInTitle: string;
  timesInDesc: string;
  topCreator: string;
  topChannels: { name: string; subscriberCount: string; avatar?: string }[];
  relatedKeywords: { term: string; score: number }[];
  risingKeywords: RisingKeyword[];
  topOpportunities: KeywordOpportunity[];
  sources?: KeywordAnalysisSource[]; // Thêm nguồn trích dẫn từ Google Search
}

export interface SavedAnalysis {
  video: VideoData;
  analysis: SingleVideoAnalysis | null;
  savedAt: string;
}

export interface SeoAnalysisResult {
  titleAnalysis: string;
  keywordStrategy: string;
  descriptionInsights: string;
  tagUsage: string;
  viralTriggers: string;
  improvements: string;
}

export interface ThumbnailAnalysisResult {
  designStyle: string;
  emotionalAppeal: string;
  layoutComposition: string;
  colorAndLighting: string;
  typography: string;
  standoutElements: string;
  improvements: string;
}

export interface ChannelAnalysisResult {
  channelStrengths: string;
  channelWeaknesses: string;
  contentStrategyGap: string;
  actionableAdvice: string;
}

export interface SingleVideoAnalysis {
  performanceVerdict: string;
  audienceHook: string;
  retentionStrategy: string;
  growthPotential: string;
  predictedDemographics: {
    ageGroups: string;
    genderDistribution: string;
    targetLocations: string;
  };
}

export enum LoadingState {
  IDLE = 'IDLE',
  GENERATING_KEYWORDS = 'GENERATING_KEYWORDS', 
  FETCHING_VIDEOS = 'FETCHING_VIDEOS',
  ANALYZING_SEO = 'ANALYZING_SEO',
  ANALYZING_THUMB = 'ANALYZING_THUMB',
  ANALYZING_CHANNEL = 'ANALYZING_CHANNEL',
  ANALYZING_SINGLE = 'ANALYZING_SINGLE',
  ANALYZING_KEYWORD = 'ANALYZING_KEYWORD',
  ERROR = 'ERROR'
}

export enum SearchMode {
  KEYWORDS = 'KEYWORDS',
  CHANNELS = 'CHANNELS',
  VIDEO_IDS = 'VIDEO_IDS',
  PLAYLIST = 'PLAYLIST'
}

export const COUNTRIES = [
  { code: 'ALL', name: 'Trên toàn thế giới' },
  { code: 'VN', name: 'Việt Nam' },
  { code: 'US', name: 'Hoa Kỳ' },
  { code: 'KR', name: 'Hàn Quốc' },
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'GB', name: 'Anh Quốc' },
  { code: 'IN', name: 'Ấn Độ' },
  { code: 'BR', name: 'Brazil' },
  { code: 'TH', name: 'Thái Lan' },
];

export const TIMEFRAMES = [
  { value: 0.0416, label: '1 giờ qua' },
  { value: 1, label: '24 giờ qua' },
  { value: 7, label: '7 ngày qua' },
  { value: 30, label: '30 ngày qua' },
  { value: 90, label: '90 ngày qua' },
  { value: 365, label: '12 tháng qua' },
  { value: 3650, label: 'Tất cả' },
];

export const YOUTUBE_CATEGORIES = [
  { id: 'ALL', name: 'Tất cả danh mục' },
  { id: '1', name: 'Phim & Hoạt ảnh' },
  { id: '2', name: 'Ô tô & Xe cộ' },
  { id: '10', name: 'Âm nhạc' },
  { id: '15', name: 'Động vật' },
  { id: '17', name: 'Thể thao' },
  { id: '19', name: 'Du lịch & Sự kiện' },
  { id: '20', name: 'Trò chơi' },
  { id: '22', name: 'Mọi người & Blog' },
  { id: '23', name: 'Hài kịch' },
  { id: '24', name: 'Giải trí' },
  { id: '25', name: 'Tin tức & Chính trị' },
  { id: '26', name: 'Mẹo & Phong cách' },
  { id: '27', name: 'Giáo dục' },
  { id: '28', name: 'Khoa học & Công nghệ' },
  { id: '29', name: 'Hoạt động & Tổ chức' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Nhanh & Hiệu quả)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Phân tích sâu & Logic cao)' },
  { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (Ổn định)' },
];
