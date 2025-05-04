console.log("Loaded hierarchical people.js");

const bios = {
    "Henk Bodrogi": "Early POK leader. Met with Minister Nespola in 1998 to discuss water contamination. Resigned due to ill health.",
    "Elian Karel": "Succeeded Bodrogi. Charismatic leader of POK. Died in 2009 in prison. Remembered as a martyr by POK.",
    "Juliana Vann": "Died at 10 from cancer due to alleged water contamination. A martyr figure in the POK movement.",
    "Silvia Marek": "Succeeded Karel. Considered a weak leader, enabling criminal takeover of the POK.",
    "Jeroen Karel": "Founding member of POK and father of Elian Karel.",
    "Edvard Vann": "GAStech security guard questioned due to his name. Denies POK ties and felt falsely accused.",
    "President Dorel Kapelou II": "Current President. Called POK a terrorist group. Attends events with GAStech executives.",
    "Vincent Kapelou": "Minister of Health, nephew of the President. Received threats from POK. Has advanced degrees in chemistry.",
    "Rufus Drymiau": "Government spokesman. Declared POK a terrorist group in 2009.",
    "Cesare Nespola": "Former Minister of Health. Met POK in 1998. Proposed health reforms. Died in 2001.",
    "Adrien Carman": "Police spokesman. Commented on violence at POK events and led public statements during 2014 kidnapping.",
    "Officer Emilio Haber": "Abila police officer. Describes POK as vandals who are quickly arrested.",
    "Tomas Sarto": "Minister of Interior under Pres. Araullo. Supported foreign investment.",
    "President Luis Araullo": "Former president. Lost to Kapelou. Promoted foreign investment incentives."
};

const orgNodes = [
  "Protectors of Kronos (POK)",
  "GAStech International",
  "Kronos Government",
  "Abila Police",
  "Tethyn Federal Law Enforcement",
  "Tethyn Ministry of Foreign Affairs",
  "Abila Fire Department",
];


document.addEventListener("DOMContentLoaded", () => {
  const width = window.innerWidth;
  const height = window.innerHeight; 

  const svg = d3.select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const color = d3.scaleOrdinal()
    .domain(["POK", "GAStech", "Government", "Media", "Citizen"])
    .range(d3.schemeCategory10);

  const teamColor = d3.scaleOrdinal()
    .domain(["Facilities", "Engineering", "IT", "Security", "Executive"])
    .range(["#666", "#007700", "#0000cc", "#cc0000", "#000"]);

  const groups = color.domain();
  const activeGroups = new Set(groups);

  const clusterCenters = {
    "POK": width * 0.15,
    "GAStech": width * 0.35,
    "Government": width * 0.55,
    "Media": width * 0.75,
    "Expert": width * 0.25,
    "Citizen": width * 0.65
  };

  const checkboxContainer = d3.select("#filter-container");
  groups.forEach(group => {
    const label = checkboxContainer.append("label")
      .style("margin-right", "15px")
      .style("display", "flex")
      .style("align-items", "center");

    label.append("span")
      .style("width", "12px")
      .style("height", "12px")
      .style("display", "inline-block")
      .style("margin-right", "5px")
      .style("background-color", color(group));

    label.append("input")
      .attr("type", "checkbox")
      .attr("checked", true)
      .style("margin-right", "5px")
      .on("change", function () {
        this.checked ? activeGroups.add(group) : activeGroups.delete(group);
        updateGraph();
      });

    label.append("span").text(group);
  });

  const teamLegend = checkboxContainer.append("div")
    .style("margin-left", "40px")
    .style("display", "inline-block");

  teamLegend.append("strong").text("GAStech Teams:").style("display", "block");

  teamColor.domain().forEach(team => {
    const row = teamLegend.append("div").style("margin", "2px 0");
    row.append("span")
      .style("display", "inline-block")
      .style("width", "12px")
      .style("height", "12px")
      .style("margin-right", "5px")
      .style("background-color", teamColor(team));
    row.append("span").text(team);
  });

  let nodes = [], links = [], levels = {}, teams = {};

  fetch("/people_data")
    .then(res => res.json())
    .then(graphData => {
      nodes = graphData.nodes;
      links = graphData.links;
      return fetch("/static/people_hierarchy_levels.json");
    })
    .then(res => res.json())
    .then(levelData => {
      levels = levelData.levels || {};
      teams = levelData.teams || {};
      updateGraph();
    })
    .catch(err => console.error("Error loading data:", err));

  function toInitials(name) {
    return name.split(" ").map(p => p[0]).join("");
  }

  function fetchResumeText(name) {
    const fileName = name.replace(/[^a-zA-Z0-9]/g, "");
    return fetch(`/resume_text/${fileName}`)
      .then(res => res.json())
      .then(data => data.text || null)
      .catch(() => null);
  }

  function updateGraph() {
    svg.selectAll("*").remove();

    const filteredNodes = nodes.filter(n => activeGroups.has(n.group));
    filteredNodes.forEach(n => {
      n.level = levels[n.id] ?? 4;
      n.initials = toInitials(n.id);
      n.team = n.group === "GAStech" ? teams[n.id] : null;
    });

    const nodeMap = new Map(filteredNodes.map(n => [n.id, n]));

    const filteredLinks = links
      .map(l => nodeMap.has(l.source) && nodeMap.has(l.target) ? {
        ...l,
        source: nodeMap.get(l.source),
        target: nodeMap.get(l.target)
      } : null)
      .filter(Boolean);

    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("collision", d3.forceCollide(50))
      .force("x", d3.forceX(d => clusterCenters[d.group] || width / 2).strength(0.3))
      .force("y", d3.forceY(height / 2).strength(0.3))
      .alphaDecay(0.07);

    const link = svg.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1.2)
      .selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line");

    const linkLabels = svg.append("g")
      .selectAll("text")
      .data(filteredLinks)
      .enter()
      .append("text")
      .attr("font-size", 11)
      .attr("fill", "#555")
      .attr("dx", 4)
      .attr("dy", -4)
      .text(d => d.relation);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "fixed")
      .style("padding", "10px")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("max-width", "600px")
      .style("max-height", "300px")
      .style("overflow-y", "auto")
      .style("white-space", "pre-wrap")
      .style("display", "none")
      .style("z-index", 1000);

    const node = svg.append("g")
      .selectAll("circle")
      .data(filteredNodes)
      .enter()
      .append("circle")
      .attr("r", 13)
      .attr("fill", d => color(d.group))
      .attr("stroke", d => d.group === "GAStech" ? teamColor(d.team || "Executive") : "none")
      .attr("stroke-width", d => d.group === "GAStech" ? 4 : 0)
      .on("mouseover", function (event, d) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
      
        tooltip.style("display", "block")
               .style("left", `${mouseX + 15}px`)
               .style("top", `${Math.min(mouseY, 20)}px`)  // Set near top
               .style("max-height", "none")
               .style("overflow-y", "auto")
               .html(`<strong>${d.id}</strong>${bios[d.id] ? `<br/>${bios[d.id]}` : ""}`);
      
        if (d.group === "GAStech" && !orgNodes.includes(d.id)) {
          fetchResumeText(d.id).then(text => {
            if (text) {
              tooltip.html(`<strong>${d.id}</strong>${bios[d.id] ? `<br/>${bios[d.id]}` : ""}<br/><br/><strong>Resume:</strong><br/><div style='max-height: 400px; overflow-y: auto;'>${text}</div>`);
            } else {
              svg.append("text")
                .attr("class", "temp-label")
                .attr("x", d.x + 15)
                .attr("y", d.y - 15)
                .attr("font-size", 12)
                .attr("fill", "black")
                .text(d.id);
            }
          });
        } else {
          svg.append("text")
            .attr("class", "temp-label")
            .attr("x", d.x + 15)
            .attr("y", d.y - 15)
            .attr("font-size", 12)
            .attr("fill", "black")
            .text(d.id);
        }
      })
      
      .on("mousemove", function (event) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        tooltip.style("left", `${mouseX + 15}px`).style("top", `${Math.min(mouseY, 20)}px`);
      })
      
      .on("mouseout", function () {
        tooltip.style("display", "none").html("");
        svg.selectAll(".temp-label").remove();
      })
      .call(drag(simulation));

    const nodeLabels = svg.append("g")
      .selectAll("text")
      .data(filteredNodes)
      .enter()
      .append("text")
      .text(d => orgNodes.includes(d.id) ? d.id : d.initials)
      .attr("font-size", 13)
      .attr("dx", 18)
      .attr("dy", 5);

    simulation.on("tick", () => {
      filteredNodes.forEach(d => {
        d.x = Math.max(60, Math.min(width - 60, d.x));
        d.y = Math.max(60, Math.min(height - 60, d.y));
      });

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      nodeLabels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });

    setTimeout(() => simulation.stop(), 7000);
  }

  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
});
