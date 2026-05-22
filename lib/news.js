/**
 * News Module with Rate Limiting, Auth, and Telegram Integration
 */

const Parser = require('rss-parser');
const parser = new Parser();

// Rate limiting
const rateLimit = {
  coingecko: { lastCall: 0, minInterval: 6000 }, // 10 calls/min
  rss: { lastCall: 0, minInterval: 1000 }
};

async function rateLimitedFetch(url, api = 'rss') {
  const now = Date.now();
  const limit = rateLimit[api];
  
  if (limit && now - limit.lastCall < limit.minInterval) {
    const wait = limit.minInterval - (now - limit.lastCall);
    console.log(`⏳ Rate limit: waiting ${wait}ms`);
    await new Promise(r => setTimeout(r, wait));
  }
  
  if (limit) limit.lastCall = Date.now();
  
  const resp = await fetch(url);
  return resp;
}

// Sentiment scoring (1-10)
function calculateSentimentScore(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  
  const positive = ['bull', 'rally', 'surge', 'breakout', 'adoption', 'etf', 'approval', 'upgrade', 'partnership', 'moon', 'pump', 'buy', 'long', 'support', 'growth', 'gain', 'profit', 'positive'];
  const negative = ['bear', 'crash', 'dump', 'hack', 'exploit', 'ban', 'sec', 'lawsuit', 'fraud', 'scam', 'collapse', 'sell', 'short', 'resistance', 'loss', 'drop', 'negative', 'warning', 'risk'];
  
  let score = 5; // Start neutral
  
  for (const word of positive) {
    if (text.includes(word)) score += 0.5;
  }
  
  for (const word of negative) {
    if (text.includes(word)) score -= 0.5;
  }
  
  // Breaking news bonus
  if (text.includes('breaking') || text.includes('urgent') || text.includes('just in')) {
    score += 1;
  }
  
  return Math.max(1, Math.min(10, score));
}

// Fetch news from RSS feeds
async function fetchRSSNews(ticker) {
  const feeds = [
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
    { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
    { url: 'https://decrypt.co/feed', source: 'Decrypt' }
  ];
  
  const articles = [];
  
  for (const feed of feeds) {
    try {
      const resp = await rateLimitedFetch(feed.url);
      const text = await resp.text();
      const parsed = await parser.parseString(text);
      
      for (const item of parsed.items.slice(0, 5)) {
        const title = item.title || '';
        const description = item.contentSnippet || item.content || '';
        
        // Check if related to ticker
        const tickerKeywords = {
          BTC: ['bitcoin', 'btc', 'btc'],
          ETH: ['ethereum', 'eth', 'ether'],
          SOL: ['solana', 'sol'],
          HYPE: ['hyperliquid', 'hype']
        };
        
        const keywords = tickerKeywords[ticker] || [ticker.toLowerCase()];
        const isRelated = keywords.some(k => 
          title.toLowerCase().includes(k) || description.toLowerCase().includes(k)
        );
        
        if (isRelated) {
          const score = calculateSentimentScore(title, description);
          
          articles.push({
            title,
            description: description.slice(0, 200),
            url: item.link,
            source: feed.source,
            timestamp: item.pubDate || new Date().toISOString(),
            sentimentScore: score,
            sentiment: score > 6 ? 'positive' : score < 4 ? 'negative' : 'neutral'
          });
        }
      }
    } catch (e) {
      console.error(`Error fetching ${feed.source}:`, e.message);
    }
  }
  
  return articles.sort((a, b) => b.sentimentScore - a.sentimentScore);
}

// Telegram webhook for breaking news
async function sendTelegramAlert(ticker, article) {
  const config = require('../config.json');
  const botToken = config.telegramBotToken;
  const chatId = config.telegramChatId;
  
  if (!botToken || !chatId) {
    console.log('Telegram not configured');
    return false;
  }
  
  const emoji = article.sentimentScore >= 7 ? '🟢' : article.sentimentScore <= 3 ? '🔴' : '⚪';
  
  const message = `${emoji} *${ticker} NEWS ALERT*\n\n` +
    `*${article.title}*\n\n` +
    `Sentiment: ${article.sentimentScore}/10\n` +
    `Source: ${article.source}\n\n` +
    `[Read more](${article.url})`;
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    return true;
  } catch (e) {
    console.error('Telegram error:', e.message);
    return false;
  }
}

// Get sentiment adjustment for trading agent
function getSentimentAdjustment(articles) {
  if (!articles || articles.length === 0) return 0;
  
  const avgScore = articles.reduce((sum, a) => sum + a.sentimentScore, 0) / articles.length;
  
  if (avgScore >= 7) return 1;  // Positive news
  if (avgScore <= 3) return -1; // Negative news
  return 0;
}

// Check for breaking news (score > 7)
function filterBreakingNews(articles) {
  return articles.filter(a => a.sentimentScore >= 7);
}

module.exports = {
  fetchRSSNews,
  calculateSentimentScore,
  sendTelegramAlert,
  getSentimentAdjustment,
  filterBreakingNews,
  rateLimitedFetch
};
