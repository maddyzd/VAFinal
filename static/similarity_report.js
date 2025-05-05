const METADATA = ["title", "source", "published", "location", "author"]

const openDots = new Set();

        
d3.select("#generate-similarity-report").on("click", function() {
    generateReport()
});
    
function generateReport() {
    const sources = Array.from(document.querySelectorAll("input[name='source']:checked"))
                            .map(cb => cb.value);
    console.log(sources)

    fetch("/generate_similarity_report", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({sources: sources})
    })
    .then(async function(response){
        return JSON.parse(JSON.stringify((await response.json())));
        })
    .then(results => drawScatterPlot(results));
}

function drawScatterPlot(results) {
    var data = results['data']
    console.log(data)
    var xMin = d3.min(data, (d) => d["x"]) - 0.1
    var xMax = d3.max(data, (d) => d["x"]) + 0.1
    var xScale_scatter = d3
        .scaleLinear()
        .domain([xMin, xMax])
        .range([0, width]);

    var yMin = d3.min(data, (d) => d["y"]) - 0.1
    var yMax = d3.max(data, (d) => d["y"]) + 0.1
    var yScale_scatter = d3
        .scaleLinear()
        .domain([yMin, yMax])
        .range([height, 0]);

    var scatter_xAxis = d3.select(".xAxis")
    // Add the x-axis
    if (scatter_xAxis.empty()) {
        var scatter_xAxis = svg_scatter
        .append("g")
        .attr("class", "xAxis")
        .style("font", "11px monaco")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale_scatter).ticks(10));
    } else {
        scatter_xAxis.transition().duration(750).call(d3.axisBottom(xScale_scatter).ticks(10));
    }

    // Add the y-axis
    var scatter_yAxis = d3.select(".yAxis")
    if (scatter_yAxis.empty()) {
        var scatter_yAxis = svg_scatter
        .append("g")
        .attr("class", "yAxis")
        .style("font", "11px monaco")
        .call(d3.axisLeft(yScale_scatter).ticks(10));
    } else {
        scatter_yAxis.transition().duration(750).call(d3.axisLeft(yScale_scatter).ticks(10));
    }

    let scatterXAxisLabel = svg_scatter.select("#scatter-x-axis-label")
    if (scatterXAxisLabel.empty()) {
        scatterXAxisLabel = svg_scatter.append("text")
            .attr("text-anchor", "middle")
            .attr("id", "scatter-x-axis-label")
            .attr("x", margin.left + width / 2 - 50)
            .attr("y", height + 50)
    }
    scatterXAxisLabel.text(results['x-axis-title']);

    let scatterYAxisLabel = svg_scatter.select("#scatter-y-axis-label")
    if (scatterYAxisLabel.empty()) {
        scatterYAxisLabel = svg_scatter
            .append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("id", "scatter-y-axis-label")
            .attr("y", -40)
            .attr("x", -200)
    }
    scatterYAxisLabel.text(results['y-axis-title']);

    svg_scatter.selectAll(".horizontal-gridline").remove();
    svg_scatter.selectAll(".vertical-gridline").remove();
    // // Add gridlines to the yAxis
    svg_scatter.selectAll("g.yAxis g.tick")
        .append("line")
        .attr("class", "horizontal-gridline")
        .attr("x2", width)
        .attr("stroke", "lightgray")
        .attr("stroke-dasharray","2");

    // // Add gridlines to the xAxis
    svg_scatter.selectAll("g.xAxis g.tick")
        .append("line")
        .attr("class", "vertical-gridline")
        .attr("y2", -height)
        .attr("stroke", "lightgray")
        .attr("stroke-dasharray","2");

    let dotsGroup = svg_scatter.select(".dots");
    if (dotsGroup.empty()) {
        dotsGroup = svg_scatter.append("g").attr("class", "dots");
    }

    let dots = dotsGroup
        .selectAll(".dot")
        .data(data, d => d.meta.title);

    dots.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();
    if (data == []) {
        return;
    }    
    let dotsEnter = dots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale_scatter(d.x))
        .attr("cy", d => yScale_scatter(d.y))
        .attr("r", 6)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .style("fill", d => {
            const class_name = "." + d.meta.source.replaceAll(" ", "-");
            return d3.select(class_name).attr("fill") || "gray";
        });

    let allDots = dotsEnter.merge(dots);  // merge enter + update selections

    // now apply transitions separately
    allDots.transition()
        .duration(750)
        .attr("cx", d => xScale_scatter(d.x))
        .attr("cy", d => yScale_scatter(d.y))
        .style("fill", d => {
            const class_name = "." + d.meta.source.replaceAll(" ", "-");
            return d3.select(class_name).attr("fill") || "gray";
        });
    allDots.on("mouseover", (event, d) => {
        console.log("Mouseover!")
        d3.select(event.currentTarget)
            .transition()
            .attr("r", d => openDots.has(d.meta.title) ? 12 : 10); // make the dot bigger

        var class_name = "." + d['meta']['source'].replaceAll(" ", "-")
        var color = d3.select(class_name).attr("fill")
        // make the tooltip visible
        tooltip.transition()
            .duration(50)
            .style("opacity", 1) // set opacity to 1 (fully visible)
            .style("background-color", color + "ff")
            .style("border-style", "ridge")
            .style("border-width", "5px")

        // update the tooltip text with the current data point's X, Y, and variety
        var tooltip_content = ""
        METADATA.forEach(element => {
            if (d['meta'][element] != "") {
                tooltip_content += "<span class='tooltip-meta-title'>" + capitalizeFirstLetter(element) + ": " + "</span>" 
                                    + "<span class='tooltip-meta-content'>" + d['meta'][element] + "</span>" + "<br>"
            }
        });

        tooltip.html(tooltip_content)
            .style("left", `${event.pageX + 10}px`) // position tooltip slightly right of the cursor
            .style("top", `${event.pageY - 10}px`); // position tooltip slightly above the cursor
    }).on("mouseout", (event) => {
        // when the mouse leaves, reset the dot's size
        d3.select(event.currentTarget)
            .transition()
            .attr("r", d => openDots.has(d.meta.title) ? 10 : 6); // shrink back to normal size

        // hide the tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0); // set opacity to 0 (invisible)
    }).on("click", (event, d) => {
        console.log("I was clicked!" + d['meta']['title'])
        d3.select(event.currentTarget).transition().attr("r", 10)
        addArticleViewer(d);
    });
}



const margin = {top: 80, right: 30, bottom: 70, left: 60},
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

const svg_scatter = d3
    .select("#similarity-scatterplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "#eee")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#similarity-scatterplot")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0) // start invisible
    .style("position", "absolute") // absolute positioning so it follows the mouse
    .style("background", "lightgray")
    .style("padding", "5px")
    .style("border-radius", "5px")
    .style("pointer-events", "none"); // prevents tooltip from interfering with mouse events

let scatterChartTitle = svg_scatter
    .append("text")
    .attr("text-anchor", "middle")
    .attr("id", "scatter-title")
    .style("font-size", "36px")
    .style("text-decoration", "underline")
    .attr("x", width / 2)
    .attr("y", -30)
    .text("News Article PCA");

window.addEventListener("DOMContentLoaded", () => {
    generateReport()
});


function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateAllCheckboxes(checked) {
    d3.selectAll(".sim-checkbox").each(function(d, i) {
        d3.select(this).property("checked", checked)
    })
}

function addArticleViewer(d) {
    const container = document.getElementById("article-viewer-container");

    // If there are already 2 viewers, remove the first (oldest)
    if (container.children.length >= 2) {
        const firstViewer = container.firstChild;
        const titleElem = firstViewer.querySelector(".article-title");
        if (titleElem) {
            openDots.delete(titleElem.textContent);
        }
        container.removeChild(firstViewer);
        updateDotSizes();
    }

    const viewer = document.createElement("div");
    viewer.className = "article-viewer";
    const safeClass1 = "." + d.meta.source.replaceAll(" ", "-") + "-label";
    const backgroundColor = d3.select(safeClass1).style("background-color") || "#f5f5f5";
    const safeClass2 = "." + d.meta.source.replaceAll(" ", "-");
    const borderColor = d3.select(safeClass2).attr("fill") || "#f5f5f5";
    viewer.style.backgroundColor = backgroundColor;
    viewer.style.borderColor = borderColor

    // Close button
    const closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => {
        viewer.remove();
        openDots.delete(d.meta.title);
        updateDotSizes();
    }

    viewer.appendChild(closeBtn);

    // Header
    const header = document.createElement("div");
    header.classList.add("article-header")
    const title = document.createElement("span");
    title.classList.add("article-title");
    title.classList.add("article");
    title.textContent = d['meta']['title'] || "Untitled";

    const source = document.createElement("span");
    source.classList.add("article-source");
    source.classList.add("article");
    if (d['meta']['source'] != "") {
        source.textContent = d['meta']['source'];
    }

    const published = document.createElement("span");
    published.classList.add("article-published");
    published.classList.add("article");
    if (d['meta']['published'] != "") {
        console.log(d['meta']['published'])
        published.textContent = "📅 " + d['meta']['published'];
    }

    const location = document.createElement("span");
    location.classList.add("article-location");
    location.classList.add("article");
    if (d['meta']['location'] != "") {
        console.log(d['meta']['location'])
        location.textContent = "📍 " + d['meta']['location'];
    }

    const author = document.createElement("span");
    author.classList.add("article-author");
    author.classList.add("article");
    if (d['meta']['author'] != "") {
        console.log(d['meta']['author'])
        author.textContent = "✍️ " + d['meta']['author'];
    }

    header.appendChild(title);
    header.appendChild(source);
    header.appendChild(published);
    header.appendChild(location);
    header.appendChild(author);

    viewer.appendChild(header);

    // Content
    const content = document.createElement("div");
    content.className = "article-content";
    content.textContent = d['contents'];
    content.style = "border-color: "
    viewer.appendChild(content);

    container.appendChild(viewer);
    openDots.add(d.meta.title);
    updateDotSizes(); // refresh all dot sizes

}


function updateDotSizes() {
    d3.selectAll(".dot")
        .transition()
        .duration(300)
        .attr("r", d => openDots.has(d.meta.title) ? 10 : 6);
}