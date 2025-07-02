const User = require("../db/models/User");
const Product = require("../db/models/Product");
const Order = require("../db/models/Order");
const OrderItem = require("../db/models/OrderItem");
const { getTimeRange } = require("./utils/parseDateRange");

class AdminController {
  async getUsers(req, res) {
    return res.json(await this._paginate(User, req, res));
  }

  async getProducts(req, res) {
    return res.json(await this._paginate(Product, req, res));
  }

  async getOrders(req, res) {
    try {
      const { data: orders, total } = await this._paginate(Order, req);

      const userIds = orders.map((order) => order.userId);

      // Lấy user tương ứng
      const users = await User.find({ _id: { $in: userIds } }).select(
        "name avatar email"
      ); // chỉ lấy các field cần thiết

      // map userId => user object
      const userMap = {};
      users.forEach((user) => {
        userMap[user._id.toString()] = user;
      });

      // merge vào từng order
      const enrichedOrders = orders.map((order) => {
        const user = userMap[order.userId.toString()];
        return {
          ...order.toObject(),
          user: user
            ? {
                name: user.name,
                avatar: user.avatar,
                email: user.email,
              }
            : null,
        };
      });

      res.json({ data: enrichedOrders, total });
    } catch (err) {
      console.error("getOrders error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getOrderItems(req, res) {
    await this._paginate(OrderItem, req, res);
  }

  // 🔁 pagination function common
  async _paginate(model, req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      model.countDocuments(),
    ]);

    return { data, total };
  }

  async getOrdersByUser(req, res) {
    try {
      const { userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId parameter" });
      }

      const [orders, total] = await Promise.all([
        Order.find({ userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Order.countDocuments({ userId }),
      ]);

      res.json({ data: orders, total });
    } catch (err) {
      console.error("Lỗi khi lấy đơn hàng theo userId:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getOrderItemsByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (!orderId) {
        return res.status(400).json({ error: "Thiếu orderId trong URL." });
      }

      const [data, total] = await Promise.all([
        OrderItem.find({ orderId })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        OrderItem.countDocuments({ orderId }),
      ]);

      res.json({ data, total });
    } catch (err) {
      console.error("Lỗi khi lấy OrderItem theo orderId:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getSalesOverview(req, res) {
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const deliveredOrders = await Order.find({
        status: { $in: ["delivered", "shipped"] },
        createdAt: { $gte: oneYearAgo, $lte: now },
      }).select("orderId");

      const orderIds = deliveredOrders.map((o) => o.orderId);

      const items = await OrderItem.find({
        orderId: { $in: orderIds },
        createdAt: { $gte: oneYearAgo, $lte: now },
      });

      const currentMonth = now.getMonth(); // 0-11
      const monthOrder = Array.from(
        { length: 12 },
        (_, i) => (currentMonth + 1 + i) % 12
      );

      const stats = monthOrder.map((monthIndex) => {
        const date = new Date(now.getFullYear(), monthIndex);
        return {
          monthIndex,
          month: date.toLocaleString("en-US", { month: "short" }),
          sales: 0,
          profit: 0,
          growth: 0,
        };
      });

      // Cộng dồn sales/profit vào đúng tháng
      for (const item of items) {
        const itemMonth = new Date(item.createdAt).getMonth(); // 0-11
        const stat = stats.find((s) => s.monthIndex === itemMonth);
        if (stat) {
          const revenue = item.unitPrice * item.quantity;
          const cost = item.costPrice * item.quantity;
          stat.sales += revenue;
          stat.profit += revenue - cost;
        }
      }

      // Tính % growth giữa các tháng
      for (let i = 1; i < stats.length; i++) {
        const prev = stats[i - 1].sales;
        const curr = stats[i].sales;
        stats[i].growth =
          prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      }

      // Xóa trường `monthIndex` trước khi trả về
      const result = stats.map(({ month, sales, profit, growth }) => ({
        month,
        sales,
        profit,
        growth,
      }));

      res.json(result);
    } catch (err) {
      console.error("Error generating sales overview:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getOrderStatusCounts(req, res) {
    try {
      const statuses = [
        "new",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      const filter = req.query.filter;
      const now = new Date();

      let startDate = null;
      let endDate = null;

      const utcDate = (y, m, d) => new Date(Date.UTC(y, m, d));

      switch (filter) {
        case "today": {
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          const d = now.getUTCDate();
          startDate = utcDate(y, m, d);
          endDate = utcDate(y, m, d + 1);
          break;
        }

        case "last_day": {
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          const d = now.getUTCDate();
          startDate = utcDate(y, m, d - 1);
          endDate = utcDate(y, m, d);
          break;
        }

        case "this_week": {
          const day = now.getUTCDay(); // 0 (Sun) → 6 (Sat)
          const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Về thứ 2
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          startDate = utcDate(y, m, diff);
          endDate = utcDate(y, m, now.getUTCDate() + 1);
          break;
        }

        case "last_week": {
          const day = now.getUTCDay();
          const thisMonday = now.getUTCDate() - day + (day === 0 ? -6 : 1);
          const lastMonday = thisMonday - 7;
          const lastSunday = thisMonday;
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          startDate = utcDate(y, m, lastMonday);
          endDate = utcDate(y, m, lastSunday);
          break;
        }

        case "this_month": {
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          startDate = utcDate(y, m, 1);
          endDate = utcDate(y, m, now.getUTCDate() + 1);
          break;
        }

        case "last_month": {
          const y = now.getUTCFullYear();
          const m = now.getUTCMonth();
          startDate = utcDate(y, m - 1, 1);
          endDate = utcDate(y, m, 1);
          break;
        }

        default:
          break;
      }

      const match = { status: { $in: statuses } };

      // 🟡 Dùng timestamp thay vì createdAt
      if (startDate && endDate) {
        match.timestamp = { $gte: startDate, $lt: endDate };
      }

      const counts = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const result = Object.fromEntries(
        statuses.map((status) => {
          const found = counts.find((c) => c._id === status);
          return [status, found ? found.count : 0];
        })
      );

      res.json(result);
    } catch (err) {
      console.error("❌ Error getting order status counts:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getProductTypeStats(req, res) {
    try {
      const { filter } = req.query;

      const timeRange = getTimeRange(filter);

      const pipeline = [
        {
          $lookup: {
            from: "orders",
            localField: "orderId",
            foreignField: "orderId",
            as: "order",
          },
        },
        { $unwind: "$order" },

        ...(timeRange
          ? [
              {
                $match: {
                  "order.timestamp": {
                    $gte: timeRange.start,
                    $lt: timeRange.end,
                  },
                },
              },
            ]
          : []),

        {
          $lookup: {
            from: "products",
            localField: "name",
            foreignField: "name",
            as: "product",
          },
        },
        { $unwind: "$product" },

        {
          $group: {
            _id: "$product.type",
            amount: { $sum: "$quantity" },
          },
        },
      ];

      const stats = await OrderItem.aggregate(pipeline);

      const total = stats.reduce((sum, item) => sum + item.amount, 0);

      const result = {};

      stats
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .forEach((item) => {
          const percentage = total === 0 ? 0 : (item.amount / total) * 100;
          result[item._id] = {
            amount: item.amount,
            growth: Number(percentage.toFixed(2)),
          };
        });

      res.json(result);
    } catch (err) {
      console.error("❌ Error generating product type stats:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUserTop(req, res) {
    try {
      const { filter } = req.query;

      const now = new Date();
      let startDate;

      switch (filter) {
        case "day":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const result = await Order.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$userId",
            amount: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
        {
          $sort: { total: -1 },
        },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            user: {
              name: "$user.name",
              email: "$user.email",
              avatar: "$user.avatar",
            },
            amount: 1,
            total: 1,
          },
        },
      ]);

      res.json(result);
    } catch (err) {
      console.error("Error getting top users:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getOrderDailyBreakdownPerWeek(req, res) {
    const weekdays = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const normalizeWeekData = (docs) => {
      const result = {};
      let weekTotal = 0;

      weekdays.forEach((day) => {
        result[day] = { count: 0, totalAmount: 0 };
      });

      docs.forEach((item) => {
        const dayIndex = item._id - 1;
        const name = weekdays[dayIndex];
        const total = item.totalAmount || 0;
        result[name] = {
          count: item.count,
          totalAmount: total,
        };
        weekTotal += total;
      });

      result["weekTotal"] = weekTotal;
      return result;
    };

    const getLast7DaysRange = (baseDate) => {
      const end = new Date(baseDate);
      end.setHours(23, 59, 59, 999);

      const start = new Date(baseDate);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      return { start, end };
    };

    const today = new Date();
    const thisWeek = getLast7DaysRange(today);

    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const sameWeekLastMonth = getLast7DaysRange(lastMonth);

    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);
    const sameWeekLastYear = getLast7DaysRange(lastYear);

    const getDailyStats = async ({ start, end }) => {
      const docs = await Order.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dayOfWeek: "$timestamp" },
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);
      return normalizeWeekData(docs);
    };

    const [thisWeekData, lastMonthData, lastYearData] = await Promise.all([
      getDailyStats(thisWeek),
      getDailyStats(sameWeekLastMonth),
      getDailyStats(sameWeekLastYear),
    ]);

    res.json({
      thisWeek: thisWeekData,
      sameWeekLastMonth: lastMonthData,
      sameWeekLastYear: lastYearData,
    });
  }
}

module.exports = new AdminController();
