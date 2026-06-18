const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const BASE_URL = "http://4.224.186.213/evaluation-service";

function solveKnapsack(tasks, capacity) {
  const n = tasks.length;
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const duration = tasks[i - 1].Duration;
    const impact = tasks[i - 1].Impact;

    for (let h = 0; h <= capacity; h++) {
      dp[i][h] = dp[i - 1][h];
      if (duration <= h) {
        dp[i][h] = Math.max(dp[i][h], impact + dp[i - 1][h - duration]);
      }
    }
  }

  let h = capacity;
  const selectedTasks = [];

  for (let i = n; i > 0; i--) {
    if (dp[i][h] !== dp[i - 1][h]) {
      const task = tasks[i - 1];
      selectedTasks.push(task);
      h -= task.Duration;
    }
  }

  return {
    totalImpact: dp[n][capacity],
    totalDuration: selectedTasks.reduce((sum, t) => sum + t.Duration, 0),
    selectedTasks: selectedTasks.reverse()
  };
}

app.get("/schedule", async (req, res) => {
  try {
    const token = process.env.ACCESS_TOKEN;

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const depotsRes = await axios.get(`${BASE_URL}/depots`, { headers });
    const vehiclesRes = await axios.get(`${BASE_URL}/vehicles`, { headers });

    const depots = depotsRes.data.depots || [];
    const vehicles = vehiclesRes.data.vehicles || [];

    const schedules = depots.map((depot) => {
      const result = solveKnapsack(vehicles, depot.MechanicHours);

      return {
        depotId: depot.ID,
        mechanicHours: depot.MechanicHours,
        usedHours: result.totalDuration,
        remainingHours: depot.MechanicHours - result.totalDuration,
        totalImpact: result.totalImpact,
        selectedTasks: result.selectedTasks
      };
    });

    res.status(200).json({
      message: "Vehicle maintenance schedule generated successfully",
      schedules
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate schedule",
      error: error.response?.data || error.message
    });
  }
});

app.listen(3000, () => {
  console.log("Vehicle Scheduler running on http://localhost:3000");
});