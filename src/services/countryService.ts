import axios from 'axios';
import { PrismaClient, Country } from '@prisma/client';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// External API endpoints
const COUNTRIES_API = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

// Ensure cache dir exists
const CACHE_DIR = path.join(process.cwd(), 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

export const refreshCountries = async (): Promise<void> => {
  try {
    // 1. Fetch countries
    const countriesRes = await axios.get(COUNTRIES_API, { timeout: 10000 });
    const exchangeRes = await axios.get(EXCHANGE_API, { timeout: 10000 });
    const exchangeRates = exchangeRes.data.rates; // e.g., { NGN: 1600.23, ... }

    const refreshTime = new Date();

    // 2. Process each country
    for (const c of countriesRes.data) {
      let currencyCode: string | null = null;
      let exchangeRate: number | null = null;
      let estimatedGdp: number | null = null;

      // Extract first currency code
      if (Array.isArray(c.currencies) && c.currencies.length > 0) {
        currencyCode = c.currencies[0].code || null;
      }

      // Get exchange rate if currency exists
      if (currencyCode && exchangeRates[currencyCode] !== undefined) {
        exchangeRate = exchangeRates[currencyCode];
        const multiplier = Math.floor(Math.random() * 1001) + 1000; // 1000–2000
        estimatedGdp = (c.population * multiplier) / exchangeRate!;
      } else {
        // No valid currency or rate → set GDP to 0 or null per spec
        estimatedGdp = currencyCode ? null : 0;
      }

      // Upsert by name (case-insensitive)
      await prisma.country.upsert({
        where: { name: c.name },
        update: {
          capital: c.capital || null,
          region: c.region || null,
          population: c.population,
          currency_code: currencyCode,
          exchange_rate: exchangeRate,
          estimated_gdp: estimatedGdp,
          flag_url: c.flag || null,
          last_refreshed_at: refreshTime,
        },
        create: {
          name: c.name,
          capital: c.capital || null,
          region: c.region || null,
          population: c.population,
          currency_code: currencyCode,
          exchange_rate: exchangeRate,
          estimated_gdp: estimatedGdp,
          flag_url: c.flag || null,
          last_refreshed_at: refreshTime,
        },
      });
    }

    // 3. Update global refresh timestamp (store in a separate table or use max())
    // For simplicity, we'll just note it in logs and image

    // 4. Generate summary image
    await generateSummaryImage();

  } catch (error: any) {
    const source = error.config?.url?.includes('restcountries') 
      ? 'restcountries.com' 
      : error.config?.url?.includes('er-api') 
        ? 'open.er-api.com' 
        : 'unknown';
    
    throw new Error(`Could not fetch data from ${source}`);
  }
};

// Generate cache/summary.png
const generateSummaryImage = async () => {
  const top5 = await prisma.country.findMany({
    where: { estimated_gdp: { not: null } },
    orderBy: { estimated_gdp: 'desc' },
    take: 5,
    select: { name: true, estimated_gdp: true },
  });

  const total = await prisma.country.count();
  const lastRefresh = new Date().toISOString();

  // Create canvas
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Country Currency API — Summary', 20, 40);

  // Total countries
  ctx.font = '18px Arial';
  ctx.fillText(`Total Countries: ${total}`, 20, 80);

  // Top 5 GDP
  ctx.fillText('Top 5 by Estimated GDP:', 20, 120);
  top5.forEach((country, i) => {
    const gdp = country.estimated_gdp ? `$${(country.estimated_gdp / 1e9).toFixed(2)}B` : 'N/A';
    ctx.fillText(`${i + 1}. ${country.name}: ${gdp}`, 30, 150 + i * 30);
  });

  // Timestamp
  ctx.font = '14px Arial';
  ctx.fillText(`Last Refresh: ${lastRefresh}`, 20, height - 30);

  // Save image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(CACHE_DIR, 'summary.png'), buffer);
};