
import { VideoData, SearchMode } from "../types";

// --- ID EXTRACTION HELPERS ---

export const extractVideoId = (input: string): string => {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const matchV = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchV) return matchV[1];
  const matchShort = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];
  const matchShorts = input.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (matchShorts) return matchShort[1];
  return input;
};

export const extractPlaylistId = (input: string): string => {
  if (/^[a-zA-Z0-9_-]{18,40}$/.test(input)) return input;
  const matchList = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (matchList) return matchList[1];
  return input;
};

export const extractChannelIdentifier = (input: string): { type: 'ID' | 'HANDLE' | 'UNKNOWN', value: string } => {
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) return { type: 'ID', value: input };
  if (/^@[^\s/]+$/.test(input)) return { type: 'HANDLE', value: input };
  const matchChannel = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (matchChannel) return { type: 'ID', value: matchChannel[1] };
  const matchUrl = input.match(/youtube\.com\/(?:c\/|user\/|@)([^/?&\s]+)/);
  if (matchUrl) {
    try {
      return { type: 'HANDLE', value: decodeURIComponent(matchUrl[1]) };
    } catch (e) {
      return { type: 'HANDLE', value: matchUrl[1] };
    }
  }
  return { type: 'UNKNOWN', value: input };
};

const resolveChannelIds = async (apiKey: string, inputs: string[]): Promise<string[]> => {
  const resolvedIds: string[] = [];
  for (const input of inputs) {
    const { type, value } = extractChannelIdentifier(input);
    if (type === 'ID') {
      resolvedIds.push(value);
    } else {
      try {
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.append("part", "snippet");
        searchUrl.searchParams.append("type", "channel");
        searchUrl.searchParams.append("q", value);
        searchUrl.searchParams.append("maxResults", "1");
        searchUrl.searchParams.append("key", apiKey);
        const res = await fetch(searchUrl.toString());
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          resolvedIds.push(data.items[0].id.channelId);
        }
      } catch (e) {
        console.warn(`Failed to resolve channel ID for ${value}`, e);
      }
    }
  }
  return resolvedIds;
};

// Main function to fetch videos
export const fetchYouTubeVideos = async (
  apiKey: string,
  tags: string[],
  regionCode: string,
  maxResults: number = 100,
  days: number = 30,
  mode: SearchMode,
  categoryId?: string
): Promise<VideoData[]> => {
  if (!apiKey) throw new Error("Vui lòng nhập YouTube API Key");
  const date = new Date();
  
  // Handle fractional days (hours)
  if (days < 1) {
    date.setTime(date.getTime() - (days * 24 * 60 * 60 * 1000));
  } else {
    date.setDate(date.getDate() - Math.floor(days));
  }
  
  const publishedAfter = date.toISOString();

  let videoIdsToFetch: string[] = [];
  if (mode === SearchMode.KEYWORDS) {
    const searchQuery = tags.join('|');
    videoIdsToFetch = await performSearch(apiKey, searchQuery, undefined, publishedAfter, regionCode, maxResults, categoryId);
  } else if (mode === SearchMode.CHANNELS) {
    const channelIds = await resolveChannelIds(apiKey, tags);
    if (channelIds.length === 0) return [];
    const promises = channelIds.map(async (channelId) => {
      try {
        const resultsPerChannel = Math.max(5, Math.ceil(maxResults / channelIds.length));
        return await performSearch(apiKey, "", channelId, publishedAfter, regionCode, resultsPerChannel, categoryId);
      } catch (e) {
        return [];
      }
    });
    const results = await Promise.all(promises);
    videoIdsToFetch = [...new Set(results.flat())];
  } else if (mode === SearchMode.VIDEO_IDS) {
    videoIdsToFetch = tags.map(extractVideoId);
  } else if (mode === SearchMode.PLAYLIST) {
    const playlistIds = tags.map(extractPlaylistId);
    const promises = playlistIds.map(async (pid) => {
      return await fetchPlaylistItems(apiKey, pid, maxResults);
    });
    const results = await Promise.all(promises);
    videoIdsToFetch = [...new Set(results.flat())];
  }

  if (videoIdsToFetch.length === 0) return [];
  if (mode !== SearchMode.VIDEO_IDS && videoIdsToFetch.length > maxResults) {
    videoIdsToFetch = videoIdsToFetch.slice(0, maxResults);
  }

  const videoDetails = await fetchVideoDetails(apiKey, videoIdsToFetch);
  const filteredVideos = videoDetails.filter(video => {
    const videoDate = new Date(video.publishedAt);
    const filterDate = new Date(publishedAfter);
    return videoDate >= filterDate;
  });

  return filteredVideos.sort((a, b) => (b.viewCountRaw || 0) - (a.viewCountRaw || 0));
};

const performSearch = async (
  apiKey: string, 
  query: string, 
  channelId: string | undefined, 
  publishedAfter: string, 
  regionCode: string, 
  limit: number,
  categoryId?: string
): Promise<string[]> => {
  let allIds: string[] = [];
  let nextPageToken = '';
  let fetchedCount = 0;
  while (fetchedCount < limit) {
    const currentLimit = Math.min(50, limit - fetchedCount);
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.append("part", "id");
    searchUrl.searchParams.append("maxResults", currentLimit.toString());
    searchUrl.searchParams.append("type", "video");
    searchUrl.searchParams.append("order", "viewCount");
    searchUrl.searchParams.append("publishedAfter", publishedAfter);
    if (regionCode && regionCode !== 'ALL') searchUrl.searchParams.append("regionCode", regionCode);
    if (query) searchUrl.searchParams.append("q", query);
    if (channelId) searchUrl.searchParams.append("channelId", channelId);
    if (categoryId && categoryId !== 'ALL') searchUrl.searchParams.append("videoCategoryId", categoryId);
    searchUrl.searchParams.append("key", apiKey);
    if (nextPageToken) searchUrl.searchParams.append("pageToken", nextPageToken);
    const res = await fetch(searchUrl.toString());
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Lỗi search API");
    }
    const data = await res.json();
    if (data.items) {
      const ids = data.items.map((item: any) => item.id.videoId);
      allIds = [...allIds, ...ids];
      fetchedCount += ids.length;
    }
    nextPageToken = data.nextPageToken;
    if (!nextPageToken || !data.items || data.items.length === 0) break;
  }
  return allIds;
};

const fetchPlaylistItems = async (apiKey: string, playlistId: string, limit: number): Promise<string[]> => {
  let allIds: string[] = [];
  let nextPageToken = '';
  let fetchedCount = 0;
  while (fetchedCount < limit) {
    const currentLimit = Math.min(50, limit - fetchedCount);
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.append("part", "contentDetails");
    url.searchParams.append("playlistId", playlistId);
    url.searchParams.append("maxResults", currentLimit.toString());
    url.searchParams.append("key", apiKey);
    if (nextPageToken) url.searchParams.append("pageToken", nextPageToken);
    const res = await fetch(url.toString());
    if (!res.ok) break; 
    const data = await res.json();
    if (data.items) {
      const ids = data.items.map((item: any) => item.contentDetails.videoId);
      allIds = [...allIds, ...ids];
      fetchedCount += ids.length;
    }
    nextPageToken = data.nextPageToken;
    if (!nextPageToken || !data.items || data.items.length === 0) break;
  }
  return allIds;
};

export const fetchVideoDetails = async (apiKey: string, videoIds: string[]): Promise<VideoData[]> => {
  const chunkSize = 50;
  let allVideoDetails: any[] = [];
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunkIds = videoIds.slice(i, i + chunkSize).join(",");
    if (!chunkIds) continue;
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.append("part", "snippet,statistics,contentDetails,topicDetails,status,recordingDetails");
    videosUrl.searchParams.append("id", chunkIds);
    videosUrl.searchParams.append("key", apiKey);
    const videosRes = await fetch(videosUrl.toString());
    if (!videosRes.ok) continue;
    const videosData = await videosRes.json();
    if (videosData.items) allVideoDetails = [...allVideoDetails, ...videosData.items];
  }

  return allVideoDetails.map((item: any) => {
    const snippet = item.snippet;
    const stats = item.statistics;
    const details = item.contentDetails;
    const status = item.status || {};
    const topics = item.topicDetails || {};
    const recording = item.recordingDetails || {};
    
    const thumb = snippet.thumbnails.maxres || snippet.thumbnails.high || snippet.thumbnails.medium || snippet.thumbnails.default;
    
    const views = parseInt(stats.viewCount || "0", 10);
    const likes = parseInt(stats.likeCount || "0", 10);
    const comments = parseInt(stats.commentCount || "0", 10);
    const engagement = views > 0 ? (((likes + comments) / views) * 100).toFixed(2) : "0.00";

    return {
      id: item.id,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: thumb.url,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      publishedAt: snippet.publishedAt,
      duration: parseISO8601Duration(details.duration),
      tags: snippet.tags || [],
      categoryId: snippet.categoryId,
      viewCountRaw: views,
      likeCountRaw: likes,
      commentCountRaw: comments,
      viewCount: formatNumber(stats.viewCount),
      likeCount: formatNumber(stats.likeCount),
      commentCount: formatNumber(stats.commentCount),
      engagementRate: engagement,
      definition: details.definition,
      caption: details.caption,
      licensedContent: details.licensedContent,
      projection: details.projection,
      defaultAudioLanguage: snippet.defaultAudioLanguage,
      defaultLanguage: snippet.defaultLanguage,
      topicCategories: topics.topicCategories || [],
      madeForKids: status.madeForKids,
      embeddable: status.embeddable,
      publicStatsViewable: status.publicStatsViewable,
      recordingLocation: recording.locationDescription || (recording.location ? `${recording.location.latitude}, ${recording.location.longitude}` : undefined),
      contentRating: item.contentDetails.contentRating
    };
  });
};

const parseISO8601Duration = (duration: string): string => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatNumber = (numStr: string): string => {
  if (!numStr) return "0";
  const num = parseInt(numStr, 10);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};
