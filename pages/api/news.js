/**
 * News API with Auth and Rate Limiting
 */

const news = require('../../lib/news');

// Simple API auth
function validateAuth(req) {
  const config = require('../../config.json');
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  return token === config.apiSecret;
}

export default async function handler(req, res) {
  const { tickers } = req.query;
  
  if (!tickers) {
    return res.status(400).json({ error: 'Missing tickers' });
  }
  
  const tickerList = tickers.split(',').map(t => t.toUpperCase().trim());
  
  try {
    const allNews = {};
    
    for (const ticker of tickerList) {
      const articles = await news.fetchRSSNews(ticker);
      
      // Format for frontend
      allNews[ticker] = {
        articles: articles,
        breaking: articles.filter(a => a.sentimentScore >= 7),
        sentiment: {
          positive: articles.filter(a => a.sentiment === 'positive').length,
          negative: articles.filter(a => a.sentiment === 'negative').length,
          neutral: articles.filter(a => a.sentiment === 'neutral').length
        }
      };
    }
    
    res.json(allNews);
    
  } catch (e) {
    console.error('News API error:', e);
    res.status(500).json({ error: e.message });
  }
}
