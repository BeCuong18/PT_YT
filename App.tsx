
import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { LoadingState, VideoData, SeoAnalysisResult, ThumbnailAnalysisResult, ChannelAnalysisResult, KeywordAnalysisResult, COUNTRIES, SearchMode, GEMINI_MODELS, SavedAnalysis, TIMEFRAMES, YOUTUBE_CATEGORIES } from './types';
import { analyzeSeoStrategy, analyzeThumbnailPatterns, analyzeChannelStrategy, analyzeKeywordSEO } from './services/geminiService';
import { fetchYouTubeVideos, extractChannelIdentifier, extractVideoId, extractPlaylistId } from './services/youtubeService';
import { getSavedReports, deleteReport } from './services/storageService';
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
  
  const [seoResult, setSeoResult] = useState<SeoAnalysisResult | null>(null);
  const [thumbResult, setThumbResult] = useState<ThumbnailAnalysisResult | null>(null);
  const [channelResult, setChannelResult] = useState<ChannelAnalysisResult | null>(null);
  const [keywordResult, setKeywordResult] = useState<KeywordAnalysisResult | null>(null);
  
  const [keywordTab, setKeywordTab] = useState<'overview' | 'opportunities' | 'rising'>('overview');
  const [selectedTopic, setSelectedTopic] = useState<string>('Tất cả');
  const [selectedCountryKwd, setSelectedCountryKwd] = useState<string>('Tất cả');

  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoading = loadingState !== LoadingState.IDLE && loadingState !== LoadingState.ERROR;

  useEffect(() => {
    setSavedReports(getSavedReports());
  }, [selectedVideo]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (inputTags.length === 0 || !apiKey) return;

    setLoadingState(LoadingState.FETCHING_VIDEOS);
    setErrorMsg(null);
    setVideos([]);
    setSeoResult(null);
    setThumbResult(null);
    setChannelResult(null);
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
      
      if (fetchedVideos.length === 0) throw new Error(`Không tìm thấy video nào phù hợp.`);
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
            setErrorMsg("Không thể tải dữ liệu Trends Real-time. Vui lòng thử lại sau.");
          }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi.");
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
      case SearchMode.KEYWORDS: return "Thêm từ khoá tìm kiếm...";
      case SearchMode.CHANNELS: return "Dán link kênh hoặc @handle...";
      case SearchMode.VIDEO_IDS: return "Dán link video...";
      case SearchMode.PLAYLIST: return "Dán link danh sách phát...";
      default: return "";
    }
  };

  const getTagTransformLogic = (tag: string) => {
    if (searchMode === SearchMode.CHANNELS) return extractChannelIdentifier(tag).value;
    if (searchMode === SearchMode.VIDEO_IDS) return extractVideoId(tag);
    if (searchMode === SearchMode.PLAYLIST) return extractPlaylistId(tag);
    return tag;
  };

  const getScoreColor = (score: number) => {
      if (score > 70) return 'text-green-500';
      if (score > 40) return 'text-yellow-500';
      return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-inter">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">TubeThumb <span className="text-red-600">Analytics</span></h1>
          </div>
          <a href="#saved-reports" className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest bg-[#222] px-4 py-2 rounded-full transition-all">
            Đã Lưu ({savedReports.length})
          </a>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Main Search Configuration (Google Trends Style) */}
        <div className="max-w-6xl mx-auto mb-16 space-y-8">
          <div className="text-center space-y-2">
             <h2 className="text-4xl font-black text-white tracking-tighter">PHÂN TÍCH XU HƯỚNG YOUTUBE</h2>
             <p className="text-gray-500 text-sm font-medium">Khám phá nội dung đang thu hút nhất trên toàn cầu bằng AI Real-time</p>
          </div>

          <div className="bg-[#1a1a1a] p-1 rounded-[2.5rem] shadow-2xl border border-[#2a2a2a]">
            {/* Top Bar: Search Input */}
            <div className="flex items-center p-4 gap-4">
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
                  className="bg-white hover:bg-gray-200 text-black px-10 py-4 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50"
                >
                   {loadingState === LoadingState.FETCHING_VIDEOS ? "Đang tải..." : "Tìm kiếm"}
                </button>
            </div>

            {/* Bottom Bar: Filters */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-6 border-t border-[#2a2a2a] bg-[#141414] rounded-b-[2.5rem]">
                {/* Search Mode */}
                <select 
                   value={searchMode} 
                   onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                   className="bg-transparent text-gray-300 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333]"
                >
                   {SEARCH_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                <div className="w-px h-6 bg-[#333] hidden md:block"></div>

                {/* Region */}
                <select 
                   value={selectedRegion} 
                   onChange={(e) => setSelectedRegion(e.target.value)}
                   className="bg-transparent text-gray-300 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333]"
                >
                   {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>

                {/* Timeframe */}
                <select 
                   value={selectedTimeframe} 
                   onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                   className="bg-transparent text-gray-300 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333]"
                >
                   {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                {/* Category */}
                <select 
                   value={selectedCategory} 
                   onChange={(e) => setSelectedCategory(e.target.value)}
                   className="bg-transparent text-gray-300 font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/5 cursor-pointer focus:outline-none border border-[#333]"
                >
                   {YOUTUBE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>

                <div className="w-px h-6 bg-[#333] hidden md:block"></div>

                {/* API Key Input (Mini) */}
                <div className="relative">
                  <input 
                     type="password"
                     value={apiKey}
                     onChange={(e) => setApiKey(e.target.value)}
                     placeholder="API Key..."
                     className="bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-all w-32"
                  />
                  {!apiKey && <div className="absolute -top-6 left-0 text-[9px] font-black text-red-500 animate-bounce">Yêu cầu API Key</div>}
                </div>
            </div>
          </div>
          {errorMsg && <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded-2xl text-xs font-bold text-center animate-shake">{errorMsg}</div>}
        </div>

        {/* Dashboard Phân tích Từ khóa (Master) */}
        {searchMode === SearchMode.KEYWORDS && keywordResult && (
            <div className="max-w-7xl mx-auto mb-16 animate-fade-in">
                {/* Thanh Header Dashboard: Tab & Bộ lọc */}
                <div className="flex flex-wrap items-center justify-between gap-6 mb-8 bg-[#1a1a1a] p-4 rounded-[1.5rem] border border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setKeywordTab('overview')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500'}`}>Tổng quan</button>
                        <button onClick={() => setKeywordTab('opportunities')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'opportunities' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500'}`}>Cơ hội từ khóa</button>
                        <button onClick={() => setKeywordTab('rising')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${keywordTab === 'rising' ? 'bg-blue-600 text-white' : 'bg-[#111] text-gray-500'}`}>Đang gia tăng</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Chủ đề:</span>
                            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-4 py-2 rounded-xl border border-[#333] focus:outline-none cursor-pointer">
                                {topicsList.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Vùng:</span>
                            <select value={selectedCountryKwd} onChange={(e) => setSelectedCountryKwd(e.target.value)} className="bg-[#111] text-[11px] font-bold text-white px-4 py-2 rounded-xl border border-[#333] focus:outline-none cursor-pointer">
                                {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {keywordTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[2rem] border border-[#333] p-10 flex flex-col items-center justify-center text-center shadow-xl">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-10">Điểm Google Trends: <span className={getScoreColor(keywordResult.overallScore)}>{keywordResult.overallScore > 70 ? 'Rất Tốt' : 'Trung Bình'}</span></h3>
                            <div className="relative w-56 h-28 mb-8">
                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                    <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="#222" strokeWidth="12" strokeLinecap="round" />
                                    <path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="url(#kwdGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * keywordResult.overallScore / 100)} className="transition-all duration-1000 ease-out" />
                                    <defs><linearGradient id="kwdGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#22c55e" /></linearGradient></defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                    <span className="text-6xl font-black text-white">{keywordResult.overallScore}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Trending Score</span>
                                </div>
                            </div>
                            <div className="w-full space-y-6 mt-4">
                                <div className="space-y-2 text-left">
                                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase"><span>Lưu lượng (Real-time)</span><span>{keywordResult.volume}</span></div>
                                    <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000" style={{ width: `${keywordResult.volume}%` }}></div></div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>Cạnh tranh thị trường</span><span className={keywordResult.competition > 60 ? 'text-red-500' : 'text-green-500'}>{keywordResult.competition > 70 ? 'Rất Cao' : 'Thấp'}</span></div>
                                    <div className="h-2.5 bg-[#111] rounded-full border border-[#222]"><div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-1000" style={{ width: `${keywordResult.competition}%` }}></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[2rem] border border-[#333] p-10 shadow-xl">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">Thống kê từ khóa thực tế</h3>
                            <div className="space-y-5">
                                <div className="bg-[#111] p-4 rounded-2xl border border-[#222] flex justify-between items-center"><span className="text-xs text-red-500 font-black">#</span><span className="text-xs text-gray-300 font-bold flex-grow px-3">{keywordResult.searchTerm}</span><span className="text-[10px] bg-red-600/20 px-3 py-1 rounded text-red-500 font-black uppercase tracking-tighter">PRIMARY</span></div>
                                <div className="space-y-4 px-2 text-xs">
                                    <div className="flex justify-between py-1.5 border-b border-[#222]"><span className="text-gray-500">View cao nhất:</span> <span className="font-black text-white">{keywordResult.highestViews.toLocaleString()}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-[#222]"><span className="text-gray-500">View trung bình:</span> <span className="font-black text-white">{keywordResult.avgViews.toLocaleString()}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-[#222]"><span className="text-gray-500">Video mới (7 ngày):</span> <span className="font-black text-white">{keywordResult.addedLast7Days}</span></div>
                                    <div className="flex justify-between py-1.5 border-b border-[#222]"><span className="text-gray-500">Trong Tiêu đề:</span> <span className="font-black text-white">{keywordResult.timesInTitle}</span></div>
                                    <div className="flex justify-between py-1.5"><span className="text-gray-500">Kênh dẫn đầu:</span> <span className="font-black text-red-500 truncate max-w-[150px]">{keywordResult.topCreator}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-[#1a1a1a] rounded-[2rem] border border-[#333] p-10 shadow-xl overflow-hidden">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">Nguồn dữ liệu thực tế</h3>
                            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                {keywordResult.sources && keywordResult.sources.length > 0 ? keywordResult.sources.map((src, i) => (
                                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#111] p-3 rounded-2xl border border-transparent hover:border-blue-600/40 transition-all group">
                                        <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-xs font-black text-blue-500">🔗</div>
                                        <div className="flex-grow">
                                            <div className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400">{src.title}</div>
                                            <div className="text-[9px] text-gray-500 font-medium truncate">{src.uri}</div>
                                        </div>
                                    </a>
                                )) : (
                                    <p className="text-gray-500 text-xs italic">Sử dụng mô hình suy luận AI nâng cao...</p>
                                )}
                                <hr className="border-[#333] my-6" />
                                <h4 className="text-[10px] font-black text-gray-600 uppercase mb-4 tracking-widest">Từ khóa lân cận</h4>
                                {keywordResult.relatedKeywords.slice(0, 5).map((kw, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl border border-[#222]"><span className="text-xs font-bold text-gray-400">{kw.term}</span><span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-lg">{kw.score}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {keywordTab === 'rising' && (
                    <div className="bg-[#1a1a1a] rounded-[2rem] border border-[#333] p-10 shadow-xl animate-fade-in overflow-hidden">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Từ khóa bùng nổ (Real-time Rising)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-[#222] text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="pb-6 pl-4">Từ khóa</th>
                                        <th className="pb-6">Phân loại</th>
                                        <th className="pb-6">Quốc gia</th>
                                        <th className="pb-6 text-right pr-4">Tăng trưởng</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {filteredRising.length > 0 ? filteredRising.map((kw, i) => (
                                        <tr key={i} className="border-b border-[#222]/50 hover:bg-[#111] transition-all group">
                                            <td className="py-6 pl-4 font-bold text-gray-300 group-hover:text-white">{kw.term}</td>
                                            <td className="py-6"><span className="text-blue-500 font-bold text-[9px] uppercase tracking-tighter bg-blue-500/10 px-3 py-1 rounded-full">{kw.topic}</span></td>
                                            <td className="py-6 text-gray-500 font-medium">{kw.country}</td>
                                            <td className={`py-6 text-right pr-4 font-black ${kw.isUp ? 'text-green-500' : 'text-red-500'}`}>
                                                {kw.isUp ? '↗' : '↘'} {kw.change}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-20 text-center text-gray-500 italic">Không tìm thấy dữ liệu.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {keywordTab === 'opportunities' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {filteredOpportunities.length > 0 ? filteredOpportunities.map((op, i) => (
                            <div key={i} className="bg-[#1a1a1a] rounded-[2.5rem] border border-[#333] p-10 hover:border-blue-600/40 transition-all group flex flex-col h-full shadow-lg">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black bg-blue-600/10 text-blue-500 px-4 py-1.5 rounded-full uppercase tracking-widest w-fit">Tiềm năng: {op.score}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.topic}</span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{op.country}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#111] flex items-center justify-center text-gray-600 group-hover:text-blue-500 transition-colors">🎯</div>
                                </div>
                                <h4 className="text-xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors">{op.term}</h4>
                                <p className="text-sm text-gray-400 leading-relaxed italic mb-8">"{op.reason}"</p>
                                <button className="mt-auto w-full py-3.5 bg-[#111] hover:bg-blue-600 text-gray-500 hover:text-white rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-md">Khai thác</button>
                            </div>
                        )) : (
                            <div className="col-span-full py-32 text-center bg-[#1a1a1a] rounded-[2.5rem] border border-dashed border-[#333]">
                                <p className="text-gray-500 italic text-sm">Chưa có dữ liệu cơ hội.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Video Results */}
        {videos.length > 0 && (
          <div className="space-y-12 mb-20">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Kết quả tìm kiếm ({videos.length})</h3>
              <p className="text-xs text-gray-500 italic hidden sm:block">* Chọn video để xem phân tích AI chuyên sâu</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {videos.map((video) => (
                <ThumbnailCard key={video.id} video={video} onShowAnalytics={(v) => setSelectedVideo(v)} />
              ))}
            </div>
          </div>
        )}

        {selectedVideo && <VideoAnalyticsModal video={selectedVideo} onClose={() => setSelectedVideo(null)} geminiModel={geminiModel} />}
      </main>
    </div>
  );
};

export default App;
