import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Clock, ExternalLink, Star, Trash2, Plus, Globe, TrendingUp, AlertCircle, Settings } from 'lucide-react';

const NewsApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [savedSearches, setSavedSearches] = useState([
    'Trump Iran Israel',
    'Middle East conflict',
    'Iran nuclear talks',
    'Gaza ceasefire',
    'Ukraine war'
  ]);
  const [bookmarkedArticles, setBookmarkedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [newSavedSearch, setNewSavedSearch] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    language: 'en',
    sourceCountry: '',
    sentiment: '',
    sortBy: 'publish-time'
  });
  const [error, setError] = useState('');

  // Load API key from environment variable or localStorage on component mount
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_WORLD_NEWS_API_KEY;
    const savedApiKey = localStorage.getItem('worldNewsApiKey');
    
    if (envApiKey) {
      setApiKey(envApiKey);
      setShowApiKeyInput(false);
    } else if (savedApiKey) {
      setApiKey(savedApiKey);
      setShowApiKeyInput(false);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  // Real World News API call with CORS proxy
  const searchNews = async (query) => {
    if (!apiKey) {
      setError('Please enter your World News API key first');
      setShowApiKeyInput(true);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        'api-key': apiKey,
        'text': query,
        'language': searchFilters.language,
        'sort': searchFilters.sortBy,
        'number': '20'
      });

      // Add optional filters
      if (searchFilters.sourceCountry) {
        params.append('source-countries', searchFilters.sourceCountry);
      }
      
      if (searchFilters.sentiment) {
        if (searchFilters.sentiment === 'positive') {
          params.append('min-sentiment', '0.1');
        } else if (searchFilters.sentiment === 'negative') {
          params.append('max-sentiment', '-0.1');
        }
      }

      // Try direct API call first, fallback to CORS proxy if needed
      let response;
      try {
        response = await fetch(`https://api.worldnewsapi.com/search-news?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (corsError) {
        // If CORS fails, use a CORS proxy
        console.log('CORS issue detected, using proxy...');
        response = await fetch(`https://cors-anywhere.herokuapp.com/https://api.worldnewsapi.com/search-news?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your World News API key.');
        } else if (response.status === 403) {
          throw new Error('API quota exceeded. Please check your World News API plan.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else {
          throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      // Transform the API response to match our app format
      const transformedArticles = data.news?.map((article, index) => ({
        id: article.id || index,
        title: article.title,
        summary: article.summary || article.text?.substring(0, 200) + '...',
        source: article.author || new URL(article.url).hostname,
        publishedAt: article.publish_date,
        url: article.url,
        imageUrl: article.image,
        sentiment: article.sentiment
      })) || [];
      
      if (transformedArticles.length === 0) {
        setError('No articles found for this search. Try different keywords or filters.');
      } else {
        setArticles(transformedArticles);
      }
    } catch (err) {
      console.error('News API Error:', err);
      if (err.message.includes('CORS') || err.message.includes('fetch')) {
        setError('CORS error: This app needs to be deployed to a server or use a backend proxy to access the API. For now, try the demo mode or deploy to a hosting service.');
      } else {
        setError(err.message);
      }
      
      // Fallback to demo data if API fails
      setArticles([
        {
          id: 'demo-1',
          title: `Breaking: Latest developments on ${query}`,
          summary: `Recent updates and analysis regarding ${query}. This is demo data - deploy the app to access real news.`,
          source: 'Demo Source',
          publishedAt: new Date().toISOString(),
          url: '#',
          imageUrl: 'https://via.placeholder.com/300x200/4F46E5/white?text=Demo+News',
          sentiment: 0.1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('worldNewsApiKey', apiKey.trim());
      setShowApiKeyInput(false);
      setError('');
    }
  };

  const handleSearch = (query = searchQuery) => {
    if (query.trim()) {
      searchNews(query);
    }
  };

  const addSavedSearch = () => {
    if (newSavedSearch.trim() && !savedSearches.includes(newSavedSearch.trim())) {
      setSavedSearches([...savedSearches, newSavedSearch.trim()]);
      setNewSavedSearch('');
    }
  };

  const removeSavedSearch = (searchToRemove) => {
    setSavedSearches(savedSearches.filter(search => search !== searchToRemove));
  };

  const toggleBookmark = (article) => {
    const isBookmarked = bookmarkedArticles.some(a => a.id === article.id);
    if (isBookmarked) {
      setBookmarkedArticles(bookmarkedArticles.filter(a => a.id !== article.id));
    } else {
      setBookmarkedArticles([...bookmarkedArticles, article]);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'text-gray-500';
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (sentiment) => {
    if (!sentiment) return '';
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  const ArticleCard = ({ article, showBookmarkButton = true }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{article.title}</h3>
          <p className="text-gray-700 text-base mb-4 leading-relaxed">{article.summary}</p>
        </div>
        {article.imageUrl && (
          <img 
            src={article.imageUrl} 
            alt="Article" 
            className="w-24 h-24 object-cover rounded-xl ml-6 flex-shrink-0 shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <span className="font-semibold text-gray-800">{article.source}</span>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatTime(article.publishedAt)}
          </div>
          {article.sentiment !== undefined && (
            <div className={`flex items-center ${getSentimentColor(article.sentiment)}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {getSentimentLabel(article.sentiment)}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {showBookmarkButton && (
            <button
              onClick={() => toggleBookmark(article)}
              className={`p-2 rounded-xl transition-all duration-200 ${
                bookmarkedArticles.some(a => a.id === article.id)
                  ? 'text-yellow-500 bg-yellow-100 shadow-md'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
            >
              <Star className="w-4 h-4" fill={bookmarkedArticles.some(a => a.id === article.id) ? 'currentColor' : 'none'} />
            </button>
          )}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );

  // API Key Setup Modal
  if (showApiKeyInput) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <Globe className="mx-auto w-16 h-16 text-red-600 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Otis' News API</h2>
          <p className="text-gray-700 text-base">Enter your API key to access real-time news</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              placeholder="Enter your World News API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-md"
            />
          </div>
          
          <div className="bg-red-50 p-4 rounded-xl">
            <p className="text-sm text-red-800 font-medium">
              Get your free API key at{' '}
              <a href="https://worldnewsapi.com" target="_blank" rel="noopener noreferrer" className="underline">
                worldnewsapi.com
              </a>
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
          
          <button
            onClick={saveApiKey}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Save & Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 mb-8 overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-red-600 to-purple-600 text-white">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Globe className="w-8 h-8 text-red-200" />
              Otis' Live News Tracker
            </h1>
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              title="API Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="text"
                placeholder="Search real-time news (e.g., 'Trump Iran Israel', 'Ukraine war', 'AI technology')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-red-300/50 focus:border-red-300/50 backdrop-blur-sm"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-8 py-4 bg-white text-red-600 rounded-xl hover:bg-white/90 disabled:opacity-50 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select
              value={searchFilters.language}
              onChange={(e) => setSearchFilters({...searchFilters, language: e.target.value})}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm backdrop-blur-sm focus:ring-2 focus:ring-red-300/50"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ar">Arabic</option>
            </select>
            
            <select
              value={searchFilters.sourceCountry}
              onChange={(e) => setSearchFilters({...searchFilters, sourceCountry: e.target.value})}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm backdrop-blur-sm focus:ring-2 focus:ring-red-300/50"
            >
              <option value="">All Countries</option>
              <option value="us">United States</option>
              <option value="gb">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
              <option value="de">Germany</option>
            </select>
            
            <select
              value={searchFilters.sentiment}
              onChange={(e) => setSearchFilters({...searchFilters, sentiment: e.target.value})}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm backdrop-blur-sm focus:ring-2 focus:ring-red-300/50"
            >
              <option value="">Any Sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            
            <select
              value={searchFilters.sortBy}
              onChange={(e) => setSearchFilters({...searchFilters, sortBy: e.target.value})}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm backdrop-blur-sm focus:ring-2 focus:ring-red-300/50"
            >
              <option value="publish-time">Latest First</option>
              <option value="relevance">Most Relevant</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-8 py-4 font-semibold transition-all duration-200 ${activeTab === 'search' ? 'bg-white border-b-4 border-red-500 text-red-600 shadow-lg' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}
          >
            Live News ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-8 py-4 font-semibold transition-all duration-200 ${activeTab === 'saved' ? 'bg-white border-b-4 border-red-500 text-red-600 shadow-lg' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}
          >
            Saved Searches
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-8 py-4 font-semibold transition-all duration-200 ${activeTab === 'bookmarks' ? 'bg-white border-b-4 border-red-500 text-red-600 shadow-lg' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}
          >
            Bookmarks ({bookmarkedArticles.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-2xl p-6 mb-8 flex items-center shadow-lg">
          <AlertCircle className="w-6 h-6 text-red-300 mr-3" />
          <span className="text-red-100 font-medium">{error}</span>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'search' && (
        <div>
          {articles.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Live News Results</h2>
                <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  <Globe className="w-4 h-4 mr-2 text-red-500" />
                  Powered by World News API
                </div>
              </div>
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
              <Search className="mx-auto w-16 h-16 text-red-400 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Search Live News</h3>
              <p className="text-gray-600 mb-6 text-lg">Enter a search term above to find real-time news articles from around the world.</p>
              <p className="text-sm text-red-600 font-medium bg-red-50 px-4 py-2 rounded-full inline-block">✨ Try searching: "Trump Iran Israel" or "Middle East conflict"</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Searches</h2>
          
          {/* Add new saved search */}
          <div className="flex space-x-4 mb-8">
            <input
              type="text"
              placeholder="Add a new saved search"
              value={newSavedSearch}
              onChange={(e) => setNewSavedSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSavedSearch()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-md"
            />
            <button
              onClick={addSavedSearch}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="grid gap-3">
            {savedSearches.map((search, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <button
                  onClick={() => {
                    setSearchQuery(search);
                    handleSearch(search);
                    setActiveTab('search');
                  }}
                  className="flex-1 text-left font-medium text-gray-900 hover:text-red-600"
                >
                  {search}
                </button>
                <button
                  onClick={() => removeSavedSearch(search)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div>
          {bookmarkedArticles.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Bookmarked Articles</h2>
              {bookmarkedArticles.map(article => (
                <ArticleCard key={article.id} article={article} showBookmarkButton={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
              <Star className="mx-auto w-16 h-16 text-yellow-400 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Bookmarks Yet</h3>
              <p className="text-gray-600 text-lg">Star articles to bookmark them for later reading.</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default NewsApp;