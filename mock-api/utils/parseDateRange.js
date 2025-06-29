function getTimeRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneDay = 24 * 60 * 60 * 1000;
  let start, end;

  switch (filter) {
    case "today":
      start = today;
      end = now;
      break;
    case "last day":
      end = today;
      start = new Date(today.getTime() - oneDay);
      break;
    case "this week":
      const dayOfWeek = today.getDay() || 7; // Make Sunday = 7
      start = new Date(today);
      start.setDate(start.getDate() - (dayOfWeek - 1));
      end = now;
      break;
    case "last week":
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(
        thisWeekStart.getDate() - ((today.getDay() || 7) - 1)
      );
      end = thisWeekStart;
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      break;
    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case "last month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "all":
    default:
      return null;
  }

  return { start, end };
}

module.exports = { getTimeRange };
