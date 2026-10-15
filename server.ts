import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { analyzeForexChart, askForexAdvisor, fetchMarketSentiment, fetchEconomicCalendar } from './server/geminiService';
import { fetchLiveMarketPrice } from './server/priceService';
import { generateLiveSignals } from './server/scannerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze-chart', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }
    const analysis = await analyzeForexChart(image, mimeType);
    res.json(analysis);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze chart' });
  }
});

app.post('/api/ask-advisor', async (req, res) => {
  try {
    const { analysis, question } = req.body;
    if (!analysis || !question) {
      res.status(400).json({ error: 'Analysis context and question are required' });
      return;
    }
    const answer = await askForexAdvisor(analysis, question);
    res.json({ answer });
  } catch (error: any) {
    console.error('Advisor error:', error);
    res.status(500).json({ error: error.message || 'Failed to get answer' });
  }
});

app.post('/api/market-sentiment', async (req, res) => {
  try {
    const { pair } = req.body;
    const sentiment = await fetchMarketSentiment(pair || 'EUR/USD');
    res.json(sentiment);
  } catch (error: any) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch market sentiment' });
  }
});

app.post('/api/economic-calendar', async (req, res) => {
  try {
    const { pair } = req.body;
    const events = await fetchEconomicCalendar(pair || 'EUR/USD');
    res.json(events);
  } catch (error: any) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch economic calendar' });
  }
});


app.get('/api/robex-signals', async (req, res) => {
  try {
    console.log(`[API] GET /api/robex-signals requested, User-Agent=${req.headers['user-agent']}, Host=${req.headers.host}`);
    const signals = await generateLiveSignals();
    console.log(`[API] Generated ${signals.length} live market signals. Providers: ${signals.map(s => s.provider).join(', ')}`);
    res.setHeader('X-Market-Data-Source', 'Live CTrader-Compatible Broker Feed');
    res.setHeader('X-Signal-Count', signals.length.toString());
    res.json(signals);
  } catch (error: any) {
    console.error('Signals error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch signals' });
  }
});

app.get('/api/market-price', async (req, res) => {
  try {
    const pair = (req.query.pair as string) || 'EUR/USD';
    const quote = await fetchLiveMarketPrice(pair);
    res.json(quote);
  } catch (error: any) {
    console.error('Price fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch market price' });
  }
});

// Serve static frontend build
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ForexPulse server running on port ${PORT}`);
});
