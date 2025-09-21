const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OlseraApiClient {
  constructor() {
    this.baseUrl = 'https://api-open.olsera.co.id/api/open-api/v1';
    this.credentials = null;
    this.axiosInstance = null;
  }

  async initialize() {
    // Get credentials from database
    this.credentials = await prisma.apiCredentials.findFirst({
      where: { provider: 'olsera', active: true }
    });

    if (!this.credentials) {
      console.log('Using default Olsera credentials');
      // Use default credentials from environment or hardcoded for now
      this.credentials = {
        appId: process.env.OLSERA_APP_ID || 'gP3lntQHc8EiFML3TgJL',
        secretKey: process.env.OLSERA_SECRET_KEY || 'cH7hjmkWQP0LlzIhLgkyaAhEKckRY57k',
        baseUrl: this.baseUrl
      };
    } else {
      console.log('Using Olsera credentials from database');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Check if token is expired and refresh if needed
    if (this.credentials.tokenExpiry && new Date(this.credentials.tokenExpiry) <= new Date()) {
      await this.authenticate();
    } else if (!this.credentials.accessToken) {
      await this.authenticate();
    }
  }

  async authenticate() {
    try {
      console.log('Authenticating with Olsera API...');
      console.log('Using app_id:', this.credentials.appId);

      const response = await axios.post(`${this.baseUrl}/id/token`, {
        app_id: this.credentials.appId,
        secret_key: this.credentials.secretKey,
        grant_type: 'secret_key'
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate token expiry
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

      // Update credentials in database if we have a database record
      if (this.credentials.id) {
        await prisma.apiCredentials.update({
          where: { id: this.credentials.id },
          data: {
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiry
          }
        });
      }

      // Update local credentials
      this.credentials.accessToken = access_token;
      this.credentials.refreshToken = refresh_token;
      this.credentials.tokenExpiry = tokenExpiry;

      // Update axios instance with new token
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      console.log('Successfully authenticated with Olsera API');
      return true;
    } catch (error) {
      console.error('Olsera authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Olsera API');
    }
  }

  async getStockMovement(startDate, endDate) {
    if (!this.axiosInstance) {
      await this.initialize();
    }

    // Ensure we have a valid token
    if (!this.credentials.accessToken) {
      await this.authenticate();
    }

    try {
      // Set authorization header
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.credentials.accessToken}`;

      const allItems = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await this.axiosInstance.get('/en/inventory/stockmovement', {
          params: {
            start_date: startDate,
            end_date: endDate,
            page: currentPage
          }
        });

        const { data, meta } = response.data;

        console.log(`Page ${currentPage}: Got ${data.length} items from Olsera`);

        // Filter for raw materials only (Bahan Baku)
        const rawMaterials = data.filter(item => item.product_group_name === 'Bahan Baku');
        console.log(`Filtered to ${rawMaterials.length} raw materials (Bahan Baku)`);
        allItems.push(...rawMaterials);

        // Check if there are more pages
        hasMorePages = currentPage < meta.last_page;
        currentPage++;
      }

      console.log(`Total raw materials fetched: ${allItems.length}`);
      return allItems;
    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.getStockMovement(startDate, endDate);
      }

      console.error('Failed to fetch stock movement:', error.response?.data || error.message);
      throw new Error('Failed to fetch stock movement from Olsera');
    }
  }

  async getDailyStockMovement(date) {
    // For daily stock movement, we use the specific date
    const formattedDate = this.formatDate(date);
    console.log('Fetching stock movement for date:', formattedDate);

    // Use the actual date for both start and end to get that day's data
    // This will fetch all stock movements for the selected date
    return this.getStockMovement(formattedDate, formattedDate);
  }

  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    console.log('Formatted date:', date, '->', formatted);
    return formatted;
  }
}

module.exports = new OlseraApiClient();