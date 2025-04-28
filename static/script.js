document.getElementById("sourceForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const selectedFolders = Array.from(document.querySelectorAll("input[name='folder']:checked"))
                                 .map(cb => cb.value);

    fetch("/wordcloud", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders: selectedFolders })
    })
    .then(response => response.json())
    .then(renderWordCloud);
});

function renderWordCloud(wordData) {
    d3.select("#wordcloud").selectAll("*").remove();

    const layout = d3.layout.cloud()
        .size([800, 500])
        .words(wordData.map(d => ({ text: d[0], size: 10 + d[1] })))
        .padding(5)
        .rotate(() => (Math.random() < 0.5 ? 0 : 90))
        .fontSize(d => d.size)
        .on("end", drawCloud);

    layout.start();

    function drawCloud(words) {
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
