document.getElementById("sourceForm").addEventListener("submit", function(e) {
    e.preventDefault();

    // Get selected folder values
    const folders = Array.from(document.querySelectorAll("input[name='folder']:checked"))
                         .map(cb => cb.value);

    // Send folders to Flask via POST
    fetch("/wordcloud", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders })
    })
    .then(res => res.json())
    .then(data => renderWordCloud(data));
});

function renderWordCloud(words) {
    // Clear previous word cloud
    d3.select("#wordcloud").selectAll("*").remove();

    const layout = d3.layout.cloud()
        .size([800, 500])
        .words(words.map(d => ({ text: d[0], size: 10 + d[1] })))
        .padding(5)
        .rotate(() => ~~(Math.random() * 2) * 90)
        .fontSize(d => d.size)
        .on("end", draw);

    layout.start();

    function draw(words) {
        d3.select("#wordcloud")
            .append("svg")
            .attr("width", 800)
            .attr("height", 500)
            .append("g")
            .attr("transform", "translate(400,250)")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => d.size + "px")
            .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text);
    }
}
