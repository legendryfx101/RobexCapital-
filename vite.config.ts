import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import { analyzeForexChart, askForexAdvisor, fetchMarketSentiment, fetchEconomicCalendar } from './server/geminiService';
import { fetchLiveMarketPrice } from './server/priceService';

function apiPlugin(): Plugin {
  return {
    name: 'forex-api-plugin',
    configureServer(server) {
      const app = express();
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

      app.get('/api/market-price', async (req, res) => {
        try {
          const pair = (req.query.pair as string) || 'EUR/USD';
          const quote = await fetchLiveMarketPrice(pair);
          res.json(quote);
        } catch (error: any) {
          console.error('Price error:', error);
          res.status(500).json({ error: error.message || 'Failed to fetch market price' });
        }
      });

      app.get('/api/robex-signals', async (req, res) => {
        try {
          const { generateLiveSignals } = require('./server/scannerService');
          const mode = (req.query.mode as string) || 'LIVE';
          const signals = await generateLiveSignals(mode);
          res.json(signals);
        } catch (error: any) {
          console.error('Signals error:', error);
          res.status(500).json({ error: error.message || 'Failed to fetch signals' });
        }
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
