let fullData;
let selectedSources = [];

fetch("static/data/bias_data.json")
  .then(response => response.json())
  .then(data => {
    fullData = data;
    fullData.sources.sort();
    selectedSources = [...fullData.sources];
    populateSourceCheckboxes();
    renderView("compare-groups"); // Set compare-groups as default

    document.getElementById("personFilter").addEventListener("change", function () {
      renderView(this.value);
    });

    document.getElementById("sourceSelector").addEventListener("change", function () {
      const checkboxes = document.querySelectorAll("input[name='source']:checked");
      selectedSources = Array.from(checkboxes).map(cb => cb.value);
      renderView(document.getElementById("personFilter").value);
    });
  });

function populateSourceCheckboxes() {
  const container = document.getElementById("sourceSelector");
  container.innerHTML = fullData.sources.map(source => (
    `<div style="display: flex; align-items: center; gap: 6px;">
      <input type="checkbox" name="source" value="${source}" checked>
      <label for="${source}" style="margin: 0;">${source}</label>
    </div>`
  )).join("");
}

function renderView(group) {
  let selectedPeople = [];
  let showGroupAverages = false;

  if (group === "all") {
    selectedPeople = [
      "Elian Karel", "Silvia Marek", "Mandor Vann", "Lorenzo Di Stefano", "Sten Sanjorge Jr."
    ];
  } else if (group === "gastech") {
    selectedPeople = [
      "Sten Sanjorge Jr.", "Hank Fluss", "Chief Legal Officer", "GAStech COO"
    ];
  } else if (group === "pok") {
    selectedPeople = [
      "Elian Karel", "Henk Bodrogi", "Carmine Osvaldo", "Jeroen Karel", "Valentine Mies"
    ];
  } else if (group === "compare-groups") {
    showGroupAverages = true;
  }

  const visibleSources = selectedSources.length > 0 ? selectedSources : fullData.sources;

  if (showGroupAverages) {
    createGroupComparisonChart(visibleSources);
    createMentionTable({
      people: ["GAStech", "POK", "Kronos Government"],
      sources: visibleSources,
      mentions: {
        "GAStech": computeGroupMentions(["Sten Sanjorge Jr.", "Hank Fluss", "Chief Legal Officer", "GAStech COO"]),
        "POK": computeGroupMentions(["Elian Karel", "Henk Bodrogi", "Carmine Osvaldo", "Jeroen Karel", "Valentine Mies"]),
        "Kronos Government": computeGroupMentions(["Elian Karel", "Silvia Marek", "Mandor Vann"])
      }
    });
    return;
  }

  const subset = {
    people: selectedPeople,
    sources: visibleSources,
    sentiment: Object.fromEntries(selectedPeople.map(p => [p, fullData.sentiment[p] || {}])),
    mentions: Object.fromEntries(selectedPeople.map(p => [p, fullData.mentions[p] || {}]))
  };

  if (subset.people.length === 0 || Object.keys(subset.sentiment).length === 0) {
    alert("No data available for this group yet!");
    return;
  }

  createSentimentChart(subset);
  createMentionTable(subset);
}

function createSentimentChart(data) {
  const ctx = document.getElementById("sentimentChart").getContext("2d");
  if (window.sentimentChart && typeof window.sentimentChart.destroy === "function") {
    window.sentimentChart.destroy();
  }

  const datasets = data.people.map(person => ({
    label: person,
    data: data.sources.map(source => data.sentiment[person]?.[source] ?? 0),
    backgroundColor: randomColor()
  }));

  window.sentimentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.sources,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: -1,
          max: 1,
          title: {
            display: true,
            text: "Sentiment Score (-1 to 1)"
          }
        }
      }
    }
  });
}

function createGroupComparisonChart(sources) {
  const ctx = document.getElementById("sentimentChart").getContext("2d");
  if (window.sentimentChart && typeof window.sentimentChart.destroy === "function") {
    window.sentimentChart.destroy();
  }

  const groupNames = ["GAStech", "POK", "Kronos Government"];
  const groupMembers = {
    "GAStech": ["Sten Sanjorge Jr.", "Hank Fluss", "Chief Legal Officer", "GAStech COO"],
    "POK": ["Elian Karel", "Henk Bodrogi", "Carmine Osvaldo", "Jeroen Karel", "Valentine Mies"],
    "Kronos Government": ["Elian Karel", "Silvia Marek", "Mandor Vann"]
  };

  const sentimentAverages = groupNames.map(group => {
    const members = groupMembers[group];
    return sources.map(source => {
      let sum = 0, count = 0;
      for (const person of members) {
        const val = fullData.sentiment[person]?.[source];
        if (val !== undefined) {
          sum += val;
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    });
  });

  const datasets = groupNames.map((group, i) => ({
    label: group,
    data: sentimentAverages[i],
    backgroundColor: randomColor()
  }));

  window.sentimentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sources,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: -1,
          max: 1,
          title: {
            display: true,
            text: "Average Sentiment Score (-1 to 1)"
          }
        }
      }
    }
  });
}

function createMentionTable(data) {
  const tableHead = document.querySelector("#mentionTable thead");
  const tableBody = document.querySelector("#mentionTable tbody");

  let headerRow = "<tr><th>Person</th>";
  for (const source of data.sources) {
    headerRow += `<th>${source}</th>`;
  }
  headerRow += "</tr>";
  tableHead.innerHTML = headerRow;

  tableBody.innerHTML = data.people.map(person => {
    let row = `<tr><td>${person}</td>`;
    for (const source of data.sources) {
      const count = data.mentions[person]?.[source] ?? 0;
      const redIntensity = Math.max(0, 255 - count * 10);
      const cellColor = `rgba(255, ${redIntensity}, ${redIntensity})`;
      row += `<td style="background-color: ${cellColor};">${count}</td>`;
    }
    row += "</tr>";
    return row;
  }).join("");
}

function computeGroupMentions(members) {
  const result = {};
  for (const source of fullData.sources) {
    let total = 0;
    for (const person of members) {
      total += fullData.mentions[person]?.[source] || 0;
    }
    result[source] = total;
  }
  return result;
}

function randomColor() {
  const r = Math.floor(100 + Math.random() * 155);
  const g = Math.floor(100 + Math.random() * 155);
  const b = Math.floor(100 + Math.random() * 155);
  return `rgb(${r}, ${g}, ${b})`;
}
