
import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { LoadingState, VideoData, SeoAnalysisResult, ThumbnailAnalysisResult, ChannelAnalysisResult, KeywordAnalysisResult, COUNTRIES, SearchMode, GEMINI_MODELS, SavedAnalysis, TIMEFRAMES, YOUTUBE_CATEGORIES } from './types';
import { analyzeSeoStrategy, analyzeThumbnailPatterns, analyzeChannelStrategy, analyzeKeywordSEO } from './services/geminiService';
import { fetchYouTubeVideos, extractChannelIdentifier, extractVideoId, extractPlaylistId } from './services/youtubeService';
import { getSavedReports, getApiKey, saveApiKey, removeApiKey } from './services/storageService';
import ThumbnailCard from './components/ThumbnailCard';
import TagInput from './components/TagInput';
import VideoAnalyticsModal from './components/VideoAnalyticsModal';

const SEARCH_MODES = [
  { value: SearchMode.KEYWORDS, label: 'Từ khoá' },
  { value: SearchMode.CHANNELS, label: 'Kênh' },
  { value: SearchMode.VIDEO_IDS, label: 'Video' },
  { value: SearchMode.PLAYLIST, label: 'Danh sách phát' },
];

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputTags, setInputTags] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState(365);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [maxVideos, setMaxVideos] = useState(100);
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.KEYWORDS);
  const [geminiModel, setGeminiModel] = useState<string>(GEMINI_MODELS[0].id);
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [savedReports, setSavedReports] = useState<SavedAnalysis[]>([]);
  
  const [keywordResult, setKeywordResult] = useState<KeywordAnalysisResult | null>(null);
  const [keywordTab, setKeywordTab] = useState<'overview' | 'opportunities' | 'rising'>('overview');
  const [selectedTopic, setSelectedTopic] = useState<string>('Tất cả');
  const [selectedCountryKwd, setSelectedCountryKwd] = useState<string>('Tất cả');

  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoading = loadingState !== LoadingState.IDLE && loadingState !== LoadingState.ERROR;

  useEffect(() => {
    const savedKey = getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsApiKeySaved(true);
    }
    setSavedReports(getSavedReports());
  }, [selectedVideo]);

  const toggleSaveApiKey = () => {
    if (isApiKeySaved) {
      removeApiKey();
      setIsApiKeySaved(false);
    } else if (apiKey) {
      saveApiKey(apiKey);
      setIsApiKeySaved(true);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (inputTags.length === 0 || !apiKey) return;

    if (isApiKeySaved) {
      saveApiKey(apiKey);
    }

    setLoadingState(LoadingState.FETCHING_VIDEOS);
    setErrorMsg(null);
    setVideos([]);
    setKeywordResult(null);
    setSelectedTopic('Tất cả');
    setSelectedCountryKwd('Tất cả');

    try {
      const fetchedVideos = await fetchYouTubeVideos(
        apiKey, 
        inputTags, 
        selectedRegion, 
        maxVideos, 
        selectedTimeframe, 
        searchMode, 
        selectedCategory
      );
      
      if (fetchedVideos.length === 0) throw new Error(`Không tìm thấy video nào. Hãy thử thay đổi bộ lọc hoặc từ khoá.`);
      setVideos(fetchedVideos);

      if (searchMode === SearchMode.KEYWORDS) {
          try {
              const regName = COUNTRIES.find(c => c.code === selectedRegion)?.name || "Toàn cầu";
              const timeLabel = TIMEFRAMES.find(t => t.value === selectedTimeframe)?.label || "12 tháng qua";
              const catName = YOUTUBE_CATEGORIES.find(c => c.id === selectedCategory)?.name || "Tất cả danh mục";

              const kwAnalysis = await analyzeKeywordSEO(inputTags[0], fetchedVideos, geminiModel, regName, timeLabel, catName);
              setKeywordResult(kwAnalysis);
          } catch (e: any) { 
            console.warn("KW Analysis failed", e); 
            setErrorMsg("Không thể tải dữ liệu Trends Real-time. Vui lòng kiểm tra lại kết nối mạng.");
          }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi hệ thống.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const topicsList = useMemo(() => {
    if (!keywordResult) return ['Tất cả'];
    const s = new Set<string>();
    keywordResult.risingKeywords.forEach(k => s.add(k.topic));
    keywordResult.topOpportunities.forEach(k => s.add(k.topic));
    return ['Tất cả', ...Array.from(s)];
  }, [keywordResult]);

  const countriesList = useMemo(() => {
    if (!keywordResult) return ['Tất cả'];
    const s = new Set<string>();
    keywordResult.risingKeywords.forEach(k => s.add(k.country));
    keywordResult.topOpportunities.forEach(k => s.add(k.country));
    return ['Tất cả', ...Array.from(s)];
  }, [keywordResult]);

  const filteredRising = useMemo(() => {
    if (!keywordResult) return [];
    return keywordResult.risingKeywords.filter(k => 
      (selectedTopic === 'Tất cả' || k.topic === selectedTopic) &&
      (selectedCountryKwd === 'Tất cả' || k.country === selectedCountryKwd)
    );
  }, [keywordResult, selectedTopic, selectedCountryKwd]);

  const filteredOpportunities = useMemo(() => {
    if (!keywordResult) return [];
    return keywordResult.topOpportunities.filter(k => 
      (selectedTopic === 'Tất cả' || k.topic === selectedTopic) &&
      (selectedCountryKwd === 'Tất cả' || k.country === selectedCountryKwd)
    );
  }, [keywordResult, selectedTopic, selectedCountryKwd]);

  const getInputPlaceholder = () => {
    switch (searchMode) {
      case SearchMode.KEYWORDS: return "Nhập từ khoá (Enter để thêm)...";
      case SearchMode.CHANNELS: return "Dán link kênh YouTube...";
      case SearchMode.VIDEO_IDS: return "Dán link video YouTube...";
      case SearchMode.PLAYLIST: return "Dán link playlist...";
      default: return "";
    }
  };

  const getTagTransformLogic = (tag: string) => {
    if (searchMode === SearchMode.CHANNELS) return extractChannelIdentifier(tag).value;
    if (searchMode === SearchMode.VIDEO_IDS) return extractVideoId(tag);
    if (searchMode === SearchMode.PLAYLIST) return extractPlaylistId(tag);
    return tag;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-inter selection:bg-red-600/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13.47-.29.81-.48 1.01-.19.2-.43.32-.72.36-.53.08-1.5.11-2.92.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-1.9.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight hidden sm:block">TubeThumb <span className="text-red-600">Master</span></h1>
          </div>
          <div className="flex items-center gap-4">
              <button onClick={() => setShowGuide(!showGuide)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Hướng dẫn</button>
              <a href="#saved-reports" className="text-[10px] font-black text-white uppercase tracking-widest bg-gradient-to-r from-[#222] to-[#333] px-5 py-2.5 rounded-full transition-all border border-white/5 shadow-xl hover:scale-105">
                Kho lưu trữ ({savedReports.length})
              </a>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Quick Guide */}
        {showGuide && (
            <div className="max-w-4xl mx-auto mb-10 p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] animate-fade-in">
                <h3 className="text-lg font-black text-blue-400 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💡</span> Hướng dẫn nhanh
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-400 leading-relaxed">
                    <li className="flex gap-2"><span>1.</span> Truy cập Google Cloud Console để lấy <b>YouTube Data API Key</b>.</li>
                    <li className="flex gap-2"><span>2.</span> Nhập API Key vào ô bảo mật phía dưới và nhấn "Lưu" để dùng lâu dài.</li>
                    <li className="flex gap-2"><span>3.</span> Nhập từ khoá hoặc link kênh bạn muốn nghiên cứu.</li>
                    <li className="flex gap-2"><span>4.</span> Sử dụng các bộ lọc Vùng, Thời gian để AI lấy dữ liệu Real-time chính xác nhất.</li>
                </ul>
                <button onClick={() => setShowGuide(false)} className="mt-6 text-[10px] font-black uppercase text-blue-500 hover:underline">Đã hiểu, đóng hướng dẫn</button>
            </div>
        )}

        {/* Main Search Configuration (Google Trends Style) */}
        <div className="max-w-6xl mx-auto mb-16 space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
             <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none">Phân Tích Xu Hướng YouTube</h2>
             <p className="text-gray-500 text-sm font-medium">Báo cáo thị trường & xu hướng từ Google Trends bằng trí tuệ nhân tạo Gemini 3.0</p>
          </div>

          <div className="bg-[#1a1a1a] p-1.5 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border border-[#2a2a2a]">
            {/* Top Bar: Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-4 gap-4">
                <div className="flex-grow">
                   <TagInput 
                      tags={inputTags} 
                      setTags={setInputTags} 
                      disabled={isLoading} 
                      placeholder={getInputPlaceholder()} 
                      transformTag={getTagTransformLogic} 
                   />
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={!apiKey || inputTags.length === 0 || isLoading}
                  className="bg-white hover:bg-gray-200 text-black px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                >
                   {loadingState === LoadingState.FETCHING_VIDEOS ? (
                       <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> ĐANG TẢI...</>
                   ) : "BẮT ĐẦU"}
                </button>
            </div>

            {/* Bottom Bar: Filters */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-6 border-t border-[#2a2a2a] bg-[#141414]/50 rounded-b-[3rem]">
                {/* Search Mode */}
                <select 
                   value={searchMode} 
                   onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                   className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
                >
                   {SEARCH_MODES.map(m => <option key={m.value} value={m.value} className="bg-[#1a1a1a]">{m.label}</option>)}
                </select>

                <div className="w-px h-6 bg-[#333] hidden md:block"></div>

                {/* Region */}
                <select 
                   value={selectedRegion} 
                   onChange={(e) => setSelectedRegion(e.target.value)}
                   className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
                >
                   {COUNTRIES.map(c => <option key={c.code} value={c.code} className="bg-[#1a1a1a]">{c.name}</option>)}
                </select>

                {/* Timeframe */}
                <select 
                   value={selectedTimeframe} 
                   onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                   className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
                >
                   {TIMEFRAMES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1a1a]">{t.label}</option>)}
                </select>

                {/* Category */}
                <select 
                   value={selectedCategory} 
                   onChange={(e) => setSelectedCategory(e.target.value)}
                   className="bg-transparent text-gray-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333] transition-colors"
                >
                   {YOUTUBE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="bg-[#1a1a1a]">{cat.name}</option>)}
                </select>

                <div className="w-px h-6 bg-[#333] hidden md:block"></div>

                {/* API Key Management */}
                <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#333] rounded-2xl px-2 py-1.5 group focus-within:border-red-600/50 transition-all">
                  <input 
                     type="password"
                     value={apiKey}
                     onChange={(e) => setApiKey(e.target.value)}
                     placeholder="YouTube API Key..."
                     className="bg-transparent text-[10px] font-bold text-white outline-none w-32 px-3 placeholder:text-gray-700"
                  />
                  <button 
                    type="button"
                    onClick={toggleSaveApiKey}
                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition-all ${isApiKeySaved ? 'bg-green-600/10 text-green-500 border border-green-500/20' : 'bg-[#1a1a1a] text-gray-500 hover:text-white border border-transparent'}`}
                  >
                    {isApiKeySaved ? 'Đã lưu' : 'Lưu Key'}
                  </button>
                </div>
            </div>
          </div>
          {errorMsg && <div className="p-5 bg-red-900/10 border border-red-900/20 text-red-500 rounded-[2rem] text-xs font-bold text-center animate-shake flex items-center justify-center gap-3">
            <span className="text-xl">⚠️</span> {errorMsg}
          </div>}
        </div>

        {/* Dashboard Phân tích Từ khóa (Master) */}
        {searchMode === SearchMode.KEYWORDS && keywordResult && (
            <div className="max-w-7xl mx-auto mb-16 animate-fade-in">
                {/* Thanh Header Dashboard: Tab & Bộ lọc */}
                <div className="flex flex-wrap items-center justify-between gap-6 mb-10 bg-[#1a1a1a] p-5 rounded-[2.5rem] border border-[#2a2a2a] shadow-2xl">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setKeywordTab('overview')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'overview' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Tổng quan</button>
                        <button onClick={() => setKeywordTab('opportunities')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'opportunities' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Cơ hội từ khóa</button>
                        <button onClick={() => setKeywordTab('rising')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'rising' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#111] text-gray-500 hover:text-gray-300'}`}>Đang gia tăng</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Phân loại:</span>
                            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-5 py-2.5 rounded-2xl border border-[#333] focus:outline-none cursor-pointer hover:border-red-600/30 transition-all">
                                {topicsList.map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Khu vực:</span>
                            <select value={selectedCountryKwd} onChange={(e) => setSelectedCountryKwd(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-5 py-2.5 rounded-2xl border border-[#333] focus:outline-none cursor-pointer hover:border-red-600/30 transition-all">
                                {countriesList.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {keywordTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                        {/* Gauge Score */}
                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[60px] rounded-full group-hover:bg-red-600/10 transition-colors"></div>
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-12">Chỉ số sức mạnh: <span className={keywordResult.overallScore > 70 ? 'text-green-500' : 'text-yellow-500'}>{keywordResult.overallScore > 70 ? 'Cực Tốt' : 'Khả quan'}</span></h3>
                            <div className="relative w-64 h-32 mb-10 scale-110 sm:scale-125">
                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                    <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="#222" strokeWidth="12" strokeLinecap="round" />
                                    <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="url(#kwdGradientFinal)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * keywordResult.overallScore / 100)} className="transition-all duration-1000 ease-out" />
                                    <defs><linearGradient id="kwdGradientFinal" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                    <span className="text-7xl font-black text-white leading-none">{keywordResult.overallScore}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Trending Master</span>
                                </div>
                            </div>
                            <div className="w-full space-y-8 mt-10">
                                <div className="space-y-3 text-left">
                                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>Lưu lượng (Volume)</span><span className="text-white">{keywordResult.volume}%</span></div>
                                    <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-1000 rounded-full" style={{ width: `${keywordResult.volume}%` }}></div></div>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>Độ khó (Difficulty)</span><span className={keywordResult.competition > 60 ? 'text-red-500' : 'text-green-500'}>{keywordResult.competition}%</span></div>
                                    <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-green-500 to-red-600 transition-all duration-1000 rounded-full" style={{ width: `${keywordResult.competition}%` }}></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10">Dữ liệu Master Real-time</h3>
                            <div className="space-y-6">
                                <div className="bg-[#111] p-5 rounded-[1.5rem] border border-[#222] flex justify-between items-center group hover:border-red-600/30 transition-all cursor-default">
                                    <span className="text-xs text-red-600 font-black">#</span>
                                    <span className="text-xs text-gray-200 font-black flex-grow px-4 truncate">{keywordResult.searchTerm}</span>
                                    <span className="text-[9px] bg-red-600 text-white px-3 py-1 rounded-lg font-black uppercase tracking-tighter">Gốc</span>
                                </div>
                                <div className="space-y-5 px-3 text-xs">
                                    <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Lượt xem kỷ lục:</span> <span className="font-black text-white">{keywordResult.highestViews.toLocaleString()}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Lượt xem TB:</span> <span className="font-black text-white">{keywordResult.avgViews.toLocaleString()}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Video mới (7 ngày):</span> <span className="font-black text-green-500">{keywordResult.addedLast7Days}</span></div>
                                    <div className="flex justify-between py-2 border-b border-[#222]/50"><span className="text-gray-500 font-bold uppercase text-[9px]">Có trong Tiêu đề:</span> <span className="font-black text-white">{keywordResult.timesInTitle}</span></div>
                                    <div className="flex justify-between py-2"><span className="text-gray-500 font-bold uppercase text-[9px]">Thống lĩnh thị trường:</span> <span className="font-black text-red-500 truncate max-w-[140px]">{keywordResult.topCreator}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl overflow-hidden flex flex-col">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10">Căn cứ & Nguồn trích dẫn</h3>
                            <div className="space-y-4 overflow-y-auto pr-3 custom-scrollbar flex-grow">
                                {keywordResult.sources && keywordResult.sources.length > 0 ? keywordResult.sources.map((src, i) => (
                                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#111] p-4 rounded-2xl border border-transparent hover:border-red-600/30 transition-all group">
                                        <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-red-600 font-black group-hover:scale-110 transition-transform shadow-lg border border-white/5">G</div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-xs font-black text-white line-clamp-1 group-hover:text-red-500 transition-colors uppercase tracking-tight">{src.title}</div>
                                            <div className="text-[9px] text-gray-600 font-medium truncate mt-1">{src.uri}</div>
                                        </div>
                                    </a>
                                )) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-600 text-xs font-bold italic">Đang tổng hợp dữ liệu từ AI Master...</p>
                                    </div>
                                )}
                                <div className="pt-8 border-t border-[#222] mt-6">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase mb-5 tracking-widest">Từ khóa liên quan</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {keywordResult.relatedKeywords.slice(0, 8).map((kw, i) => (
                                            <span key={i} className="text-[10px] font-bold text-gray-400 bg-[#111] px-4 py-2 rounded-xl border border-[#222] hover:border-blue-600/40 transition-colors cursor-default">{kw.term}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {keywordTab === 'rising' && (
                    <div className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-12 shadow-2xl animate-fade-in overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Từ khóa bùng nổ <span className="text-red-600">(Trending Now)</span></h3>
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Dữ liệu cập nhật mỗi 1 giờ</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-[#222] text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    <tr>
                                        <th className="pb-8 pl-6">Từ khóa</th>
                                        <th className="pb-8">Lĩnh vực</th>
                                        <th className="pb-8">Quốc gia</th>
                                        <th className="pb-8 text-right pr-6">Thay đổi (Real-time)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {filteredRising.length > 0 ? filteredRising.map((kw, i) => (
                                        <tr key={i} className="border-b border-[#222]/30 hover:bg-[#111] transition-all group">
                                            <td className="py-8 pl-6 font-black text-gray-200 group-hover:text-red-500 transition-colors">{kw.term}</td>
                                            <td className="py-8"><span className="text-blue-500 font-black text-[9px] uppercase tracking-widest bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/10">{kw.topic}</span></td>
                                            <td className="py-8 text-gray-500 font-bold uppercase tracking-tighter">{kw.country}</td>
                                            <td className={`py-8 text-right pr-6 font-black text-lg ${kw.isUp ? 'text-green-500' : 'text-red-500'}`}>
                                                {kw.isUp ? '↗' : '↘'} {kw.change}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-32 text-center text-gray-600 italic font-bold">Không tìm thấy từ khóa nào phù hợp với bộ lọc hiện tại.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {keywordTab === 'opportunities' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                        {filteredOpportunities.length > 0 ? filteredOpportunities.map((op, i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-[3rem] border border-[#2a2a2a] p-10 hover:border-red-600/40 transition-all group flex flex-col h-full shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-[50px] group-hover:bg-blue-600/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black bg-red-600/10 text-red-500 px-4 py-2 rounded-full border border-red-500/10 uppercase tracking-widest">Tiềm năng: {op.score}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.topic}</span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.country}</span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center text-gray-700 group-hover:text-red-600 transition-all border border-white/5 shadow-inner">🎯</div>
                                </div>
                                <h4 className="text-2xl font-black text-white mb-6 group-hover:text-red-500 transition-colors leading-tight">{op.term}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed italic mb-10 font-medium">"{op.reason}"</p>
                                <button className="mt-auto w-full py-5 bg-[#111] hover:bg-red-600 text-gray-600 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl border border-white/5 active:scale-95">Xây dựng nội dung này</button>
                            </div>
                        )) : (
                            <div className="col-span-full py-40 text-center bg-[#1a1a1a] rounded-[3rem] border border-dashed border-[#2a2a2a]">
                                <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Dữ liệu cơ hội chưa sẵn sàng cho vùng này.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Video Results Section */}
        {videos.length > 0 && (
          <div className="space-y-12 mb-20">
            <div className="flex items-center justify-between px-6">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Thư viện Video liên quan ({videos.length})</h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest hidden sm:block">Nhấn vào ảnh để xem phân tích AI DNA</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {videos.map((video) => (
                <ThumbnailCard key={video.id} video={video} onShowAnalytics={(v) => setSelectedVideo(v)} />
              ))}
            </div>
          </div>
        )}

        {/* Modal phân tích video */}
        {selectedVideo && <VideoAnalyticsModal video={selectedVideo} onClose={() => setSelectedVideo(null)} geminiModel={geminiModel} />}
      </main>

      <footer className="py-12 border-t border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:row items-center justify-between gap-6">
              <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13.47-.29.81-.48 1.01-.19.2-.43.32-.72.36-.53.08-1.5.11-2.92.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-1.9.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z"/></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">TubeThumb Master Analytics v4.5</span>
              </div>
              <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest text-center">© 2024 YouTube Data Insights Engine. Bảo mật API Key là trách nhiệm của người dùng.</p>
              <div className="flex items-center gap-6">
                  <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">Điều khoản</a>
                  <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">Bảo mật</a>
                  <a href="#" className="text-[9px] font-black text-gray-600 uppercase hover:text-white transition-colors">API Docs</a>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default App;
