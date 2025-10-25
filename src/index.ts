import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { refreshCountries } from './services/countryService';
import fs from 'fs';
import path from 'path';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// POST /countries/refresh
app.post('/countries/refresh', async (req: Request, res: Response) => {
  try {
    await refreshCountries();
    res.status(200).json({ message: 'Countries refreshed successfully' });
  } catch (error: any) {
    console.error('Refresh failed:', error.message);
    res.status(503).json({
      error: 'External data source unavailable',
      details: error.message,
    });
  }
});

// GET /countries
app.get('/countries', async (req: Request, res: Response) => {
  const { region, currency, sort } = req.query;
  let orderBy: any = {};

  if (sort === 'gdp_desc') orderBy = { estimated_gdp: 'desc' };
  else if (sort === 'gdp_asc') orderBy = { estimated_gdp: 'asc' };
  else if (sort === 'name') orderBy = { name: 'asc' };

  const where: any = {};
  if (region) where.region = region;
  if (currency) where.currency_code = currency;

  try {
    const countries = await prisma.country.findMany({ where, orderBy });
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /countries/image
app.get('/countries/image', (req: Request, res: Response) => {
  const imagePath = path.join(process.cwd(), 'cache', 'summary.png');
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }
  res.sendFile(imagePath);
});


// GET /countries/:name
app.get('/countries/:name', async (req: Request, res: Response) => {
  try {
    const country = await prisma.country.findUnique({
      where: { name: req.params.name },
    });
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /countries/:name
app.delete('/countries/:name', async (req: Request, res: Response) => {
  try {
    const country = await prisma.country.delete({
      where: { name: req.params.name },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /status
app.get('/status', async (req: Request, res: Response) => {
  try {
    const total = await prisma.country.count();
    const last = await prisma.country.findFirst({
      orderBy: { last_refreshed_at: 'desc' },
      select: { last_refreshed_at: true },
    });
    res.json({
      total_countries: total,
      last_refreshed_at: last?.last_refreshed_at || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Country API running on port ${PORT}`);
});