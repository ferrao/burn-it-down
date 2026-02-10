import { Chart } from "chart.js/auto";
import { Canvas } from "skia-canvas";
import fs from "fs-extra";
import path from "path";

// ==========================================
// 1. CLI ARGUMENT PARSING
// ==========================================
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Usage: node plot.mjs <data-file.json> [output-file-path]");
  process.exit(1);
}

const inputFilePath = args[0];
let outputFilePath = args[1] || "chart.png";

if (!outputFilePath.endsWith(".png")) {
  outputFilePath += ".png";
}

const outputDir = path.dirname(outputFilePath);
if (outputDir !== ".") {
  await fs.ensureDir(outputDir);
}

// ==========================================
// 2. LOAD DATA
// ==========================================
let projectData;
try {
  const fileContent = await fs.readFile(inputFilePath, "utf8");
  projectData = JSON.parse(fileContent);
} catch (err) {
  console.error(
    `❌ Error reading or parsing file "${inputFilePath}":`,
    err.message,
  );
  process.exit(1);
}

// ==========================================
// 3. DATA PROCESSING
// ==========================================

const totalScope = projectData.tasks.reduce((sum, t) => sum + t.points, 0);

const start = new Date(projectData.startDate);
const end = new Date(
  projectData.milestones[projectData.milestones.length - 1].date,
);

const oneDay = 24 * 60 * 60 * 1000;
const timelineLabels = [];
const timelineDates = [];

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  timelineLabels.push(d.toISOString().split("T")[0]);
  timelineDates.push(new Date(d));
}

// Process Actual Points
const actualPoints = projectData.tasks
  .filter((t) => t.completedAt)
  .map((t) => {
    const tDate = new Date(t.completedAt);
    const xValue = (tDate - start) / oneDay;
    const pointsFinishedBefore = projectData.tasks
      .filter(
        (inner) => inner.completedAt && new Date(inner.completedAt) < tDate,
      )
      .reduce((sum, inner) => sum + inner.points, 0);
    const yValue = totalScope - pointsFinishedBefore - t.points;
    return { x: xValue, y: Math.max(0, yValue) };
  })
  .sort((a, b) => a.x - b.x);
actualPoints.unshift({ x: 0, y: totalScope });

// Process Ideal Points
const idealPoints = timelineLabels.map((label, index) => {
  const totalDurationDays = (end - start) / oneDay;
  const dailyBurnRate = totalScope / totalDurationDays;
  const remaining = totalScope - dailyBurnRate * index;
  return { x: index, y: Math.max(0, remaining) };
});

// ==========================================
// 4. CHART GENERATION
// ==========================================
async function generateChart() {
  const canvas = new Canvas(1000, 600);
  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: timelineLabels.map((_, i) => i),
      datasets: [
        {
          label: "Ideal Burndown",
          data: idealPoints,
          borderColor: "#4F46E5", // Royal Blue
          borderWidth: 2,
          tension: 0,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "Actual Progress",
          data: actualPoints,
          borderColor: "#EF4444", // Vibrant Red
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0,
          borderWidth: 3,
          pointRadius: 3,
          pointBackgroundColor: "#FFF",
          pointBorderColor: "#EF4444",
          pointBorderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      layout: {
        padding: {
          top: 20,
          bottom: 60,
          left: 10,
          right: 20,
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          grid: {
            display: false,
          },
          ticks: {
            color: "#666",
            stepSize: 5,
          },
          title: {
            display: true,
            text: "Timeline (Days)",
            color: "#666",
            font: { size: 14 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "#e0e0e0",
          },
          ticks: {
            color: "#333",
          },
          title: {
            display: true,
            text: "Remaining Effort (Points)",
            color: "#333",
            font: { size: 14, weight: "bold" },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Task-Granularity Burndown Chart",
          font: { size: 18, weight: "bold" },
          color: "#333",
        },
        legend: {
          labels: {
            color: "#333",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: function (context) {
              const dataIndex = context[0].dataIndex;
              const labelDate = timelineLabels[dataIndex];
              return labelDate || "Start";
            },
            label: function (context) {
              return `Remaining: ${context.parsed.y} pts`;
            },
          },
        },
      },
    },
  });

  // ==========================================
  // 5. MANUAL OVERLAY
  // ==========================================
  const xAxis = chart.scales.x;
  const yAxis = chart.scales.y;

  ctx.save();

  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";

  projectData.milestones.forEach((m) => {
    const mDate = new Date(m.date);
    const daysFromStart = (mDate - start) / oneDay;

    const xPixel = xAxis.getPixelForValue(Math.round(daysFromStart));
    const yPixel = xAxis.bottom + 10;

    ctx.fillText(m.name, xPixel, yPixel);

    // Tick mark
    ctx.beginPath();
    ctx.moveTo(xPixel, xAxis.bottom);
    ctx.lineTo(xPixel, xAxis.bottom + 5);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.restore();

  // save image
  const pngBuffer = await canvas.toBuffer("png");
  await fs.writeFile(outputFilePath, pngBuffer);
  console.log(`✅ Chart generated: ${outputFilePath}`);
}

generateChart().catch((err) => {
  console.error("❌ Error generating chart:", err);
});
