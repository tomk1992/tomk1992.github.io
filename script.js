/* ==========================================================
   ETF Growth Calculator (Germany)
   Author: Tommaso Piatti
   Description:
   Core logic for ETF growth, German-style tax & inflation handling
   ========================================================== */

// Input Formatting – German style (1.000,00)

document.addEventListener("DOMContentLoaded", () => {
  // For each input with data-format attribute
  document.querySelectorAll("input[data-format]").forEach(input => {
    // Format on blur (when user leaves the field)
    input.addEventListener("blur", () => {
      const raw = input.value;
      const num = parseGermanNumber(raw);
      if (!isNaN(num)) {
        // Format visually based on type
        if (input.dataset.format === "integer") {
          input.value = num.toLocaleString("de-DE", { maximumFractionDigits: 0 });
        } else if (input.dataset.format === "currency") {
          input.value = num.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else if (input.dataset.format === "percent") {
          input.value = num.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
        }
      }
    });
  });
});

// Helper to parse German numbers like "10.000,25" → 10000.25
function parseGermanNumber(str) {
  if (typeof str !== "string") return NaN;
  str = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(str);
}


// ---- Number Formatting Helpers ----
function formatNumber(num) {
  return num.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

function formatPercent(num, decimals = 1) {
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + " %";
}

// ---- Inflation Toggle ----
function toggleInflation() {
  document.getElementById("inflationField").style.display =
    document.getElementById("useInflation").checked ? "block" : "none";
}

// ---- Main Calculation ----
function calculate() {
   // --- Input Values ---
   const initial = parseGermanNumber(document.getElementById("initial").value);
   const monthly = parseGermanNumber(document.getElementById("monthly").value);
   const years = parseGermanNumber(document.getElementById("years").value);
   const r = parseGermanNumber(document.getElementById("returnRate").value) / 100;
   const fee = parseGermanNumber(document.getElementById("fee").value) / 100;
   const taxRate = parseGermanNumber(document.getElementById("taxRate").value) / 100;
   const teilfreist = parseFloat(document.getElementById("teilfreist").value) / 100;
   const useInflation = document.getElementById("useInflation").checked;
   const inflation = useInflation
       ? parseFloat(document.getElementById("inflation").value) / 100
    : 0;

  // --- Compounding ---
  const netReturn = r - fee;
  let value = initial;
  let invested = initial;
  let yearlyValues = [value];

  for (let i = 1; i <= years; i++) {
    value = (value + monthly * 12) * (1 + netReturn);
    invested += monthly * 12;
    yearlyValues.push(value);
  }

  // --- Tax Logic ---
  const grossGain = value - invested;
  const taxableGain = grossGain * (1 - teilfreist);
  const tax = taxableGain * taxRate;
  const netValue = value - tax;

  // --- Returns ---
  const CAGR = Math.pow(netValue / invested, 1 / years) - 1;
  const realCAGR = useInflation ? (1 + CAGR) / (1 + inflation) - 1 : null;

  // --- Output ---
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `
    <p><strong>Total invested:</strong> €${formatNumber(invested)}</p>
    <p><strong>Portfolio value (gross):</strong> €${formatNumber(value)}</p>
    <p><strong>Gross gain:</strong> €${formatNumber(grossGain)}</p>
    <p><strong>Taxes after Teilfreistellung:</strong> €${formatNumber(tax)}</p>
    <p><strong>Portfolio value (after tax):</strong> €${formatNumber(netValue)}</p>
    <p><strong>Annualised return (after tax):</strong> ${formatPercent(CAGR * 100, 1)}</p>
    ${
      useInflation
        ? `<p><strong>Real annual return (after inflation):</strong> ${formatPercent(
            realCAGR * 100,
            1
          )}</p>`
        : ""
    }
  `;

  drawChart(yearlyValues, years);
}

// ---- Chart Rendering ----
let chartInstance = null;

function drawChart(values, years) {
  const ctx = document.getElementById("chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: years + 1 }, (_, i) => i),
      datasets: [
        {
          label: "Portfolio value (€)",
          data: values,
          borderColor: "#0070f3",
          backgroundColor: "rgba(0,112,243,0.1)",
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: { display: true, text: "Portfolio growth over time" },
      },
      scales: {
        x: { title: { display: true, text: "Years" } },
        y: { title: { display: true, text: "Value (€)" } },
      },
    },
  });
}
