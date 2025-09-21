const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const olseraClient = require('./olseraApiClient');

class StockService {
  /**
   * Initialize a stock report by fetching data from Olsera API
   */
  async initializeStockReport(reportId, stockDate) {
    try {
      console.log('Initializing stock report for:', { reportId, stockDate });

      // Check if stock report already exists
      let stockReport = await prisma.stockReport.findUnique({
        where: { reportId },
        include: { items: true }
      });

      // If report exists with items and date is different, clear and re-initialize
      if (stockReport && stockReport.items.length > 0) {
        const existingDate = new Date(stockReport.stockDate).toISOString().split('T')[0];
        const newDate = new Date(stockDate).toISOString().split('T')[0];

        if (existingDate !== newDate) {
          console.log('Date changed, clearing existing items and re-fetching...');
          // Delete existing items
          await prisma.stockReportItem.deleteMany({
            where: { stockReportId: stockReport.id }
          });
          // Update the date
          stockReport = await prisma.stockReport.update({
            where: { id: stockReport.id },
            data: {
              stockDate: new Date(stockDate),
              completedAt: null,
              syncedAt: new Date()
            }
          });
        } else {
          console.log('Stock report already exists with items for this date');
          return stockReport; // Already initialized for same date
        }
      }

      // Create or update stock report
      if (!stockReport) {
        stockReport = await prisma.stockReport.create({
          data: {
            reportId,
            stockDate: new Date(stockDate),
            syncedAt: new Date()
          }
        });
      }

      // Fetch stock movement from Olsera
      console.log('Fetching stock movements from Olsera for date:', stockDate);
      const stockMovements = await olseraClient.getDailyStockMovement(stockDate);
      console.log('Fetched', stockMovements.length, 'stock movements from Olsera');

      // Check if we have data
      if (!stockMovements || stockMovements.length === 0) {
        console.log('No raw materials data found for this date');
        // Return the report with empty items
        return {
          ...stockReport,
          items: []
        };
      }

      // Get yesterday's closing stock for each item
      const previousStocks = await this.getPreviousClosingStocks(stockDate);

      // Create stock report items
      const stockItems = [];
      for (const movement of stockMovements) {
        // Calculate expected out (sales + outgoing)
        const expectedOut = (movement.sum_sales_qty || 0) + (movement.sum_outgoing_qty || 0);

        // Get previous closing or use beginning_qty from API
        const previousClosing = previousStocks[movement.product_id] || movement.beginning_qty || 0;

        const item = await prisma.stockReportItem.create({
          data: {
            stockReportId: stockReport.id,
            productId: movement.product_id.toString(),
            productName: movement.product_name,
            productSku: movement.product_sku || null,
            openingStock: previousClosing,
            expectedOut: expectedOut,
            unit: 'gram' // Default unit, can be configured
          }
        });

        stockItems.push(item);
      }

      // Update sync timestamp
      await prisma.stockReport.update({
        where: { id: stockReport.id },
        data: { syncedAt: new Date() }
      });

      return {
        ...stockReport,
        items: stockItems
      };
    } catch (error) {
      console.error('Failed to initialize stock report:', error);
      throw error;
    }
  }

  /**
   * Get previous day's closing stocks
   */
  async getPreviousClosingStocks(date) {
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);

    // Find previous day's stock report
    const previousReport = await prisma.stockReport.findFirst({
      where: {
        stockDate: {
          gte: new Date(previousDate.setHours(0, 0, 0, 0)),
          lt: new Date(previousDate.setHours(23, 59, 59, 999))
        },
        completedAt: { not: null }
      },
      include: {
        items: true
      }
    });

    if (!previousReport) {
      return {};
    }

    // Create a map of product ID to closing stock
    const closingStocks = {};
    for (const item of previousReport.items) {
      closingStocks[item.productId] = item.actualClosing || 0;
    }

    return closingStocks;
  }

  /**
   * Update a stock item with actual closing stock and calculate difference
   */
  async updateStockItem(itemId, actualClosing, photoId = null, notes = null) {
    try {
      const item = await prisma.stockReportItem.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        throw new Error('Stock item not found');
      }

      // Calculate the difference
      // Expected closing = Opening - Expected Out
      // Difference = Actual Closing - Expected Closing
      const expectedClosing = item.openingStock - item.expectedOut;
      const difference = actualClosing - expectedClosing;

      const updatedItem = await prisma.stockReportItem.update({
        where: { id: itemId },
        data: {
          actualClosing,
          difference,
          photoId,
          notes,
          completed: true
        }
      });

      // Check if all items are completed
      await this.checkReportCompletion(item.stockReportId);

      return updatedItem;
    } catch (error) {
      console.error('Failed to update stock item:', error);
      throw error;
    }
  }

  /**
   * Check if all items in a stock report are completed
   */
  async checkReportCompletion(stockReportId) {
    const stockReport = await prisma.stockReport.findUnique({
      where: { id: stockReportId },
      include: {
        items: true
      }
    });

    if (!stockReport) {
      return false;
    }

    const allCompleted = stockReport.items.every(item => item.completed);

    if (allCompleted && !stockReport.completedAt) {
      await prisma.stockReport.update({
        where: { id: stockReportId },
        data: { completedAt: new Date() }
      });
    }

    return allCompleted;
  }

  /**
   * Get stock report with all items
   */
  async getStockReport(reportId) {
    return prisma.stockReport.findUnique({
      where: { reportId },
      include: {
        items: {
          orderBy: { productName: 'asc' }
        }
      }
    });
  }

  /**
   * Get stock report statistics
   */
  async getStockReportStats(reportId) {
    const stockReport = await this.getStockReport(reportId);

    if (!stockReport) {
      return null;
    }

    const stats = {
      totalItems: stockReport.items.length,
      completedItems: stockReport.items.filter(item => item.completed).length,
      totalDifference: stockReport.items.reduce((sum, item) => sum + (item.difference || 0), 0),
      negativeDifferences: stockReport.items.filter(item => item.difference && item.difference < 0),
      positiveDifferences: stockReport.items.filter(item => item.difference && item.difference > 0)
    };

    stats.completionPercentage = Math.round((stats.completedItems / stats.totalItems) * 100);

    return stats;
  }

  /**
   * Generate stock report summary
   */
  async generateStockSummary(reportId) {
    const stockReport = await this.getStockReport(reportId);

    if (!stockReport) {
      return null;
    }

    const summary = {
      date: stockReport.stockDate,
      syncedAt: stockReport.syncedAt,
      completedAt: stockReport.completedAt,
      items: stockReport.items.map(item => ({
        product: item.productName,
        sku: item.productSku,
        opening: item.openingStock,
        expectedOut: item.expectedOut,
        actualClosing: item.actualClosing,
        difference: item.difference,
        unit: item.unit,
        status: item.completed ? 'Completed' : 'Pending'
      }))
    };

    return summary;
  }
}

module.exports = new StockService();