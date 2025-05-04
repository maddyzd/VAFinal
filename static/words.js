document.getElementById("sourceForm").addEventListener("submit", function(e) {
    e.preventDefault();

    // Get selected folder values
    const folders = Array.from(document.querySelectorAll("input[name='folder']:checked"))
                         .map(cb => cb.value);
    const words = d3.select("#word-range").property("value")
    console.log(words)

    fetch("/wordcloud", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders: folders, words: words })
    })
    .then(async function(response){
        return JSON.parse(JSON.stringify((await response.json())));
     })
    .then(data => renderWordCloud(data));
});

function renderWordCloud(words) {
    // console.log(words)
    // Clear previous word cloud
    d3.select("#wordcloud").selectAll("*").remove();

    fontScale = d3.scaleLinear(d3.extent(words.map(d => d[1])), [20, 92])

    const layout = d3.layout.cloud()
        .size([800, 500])
        .words(words.map(d => { return { text: d[0], value: d[1] };}))
        .padding(10)
        .rotate(() => Math.floor((Math.random() * 2)) * 90)
        .fontSize(d => fontScale(d.value))
        .on("end", draw);

    layout.start();

    function draw(words) {
        console.log(words)
        d3.select("#wordcloud")
            .append("svg")
            .attr("width", 800)
            .attr("height", 500)
            .append("g")
            .attr("transform", "translate(400,250)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .text(d => d.text)
            .style("font-size", d => `${d.size}px`)
            .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`);
    }
}

function autoGenerateWordCloud() {
    // Select all checkboxes
    document.querySelectorAll("input[name='folder']").forEach(cb => cb.checked = true);
    console.log("Call to autoGenerateWordCloud")

    // Set slider to 50
    const slider = document.getElementById("word-range");
    slider.value = 50;

    const display = document.getElementById("wordCountDisplay");
    if (display) display.textContent = "50";

    document.getElementById("sourceForm").dispatchEvent(new Event("submit"));
}

