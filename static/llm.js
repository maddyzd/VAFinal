d3.select("#llm_query").on("keydown", function(event) {
    console.log("In keydown!")
    if (event.key === "Enter") {
        event.preventDefault();  // prevent form submission if inside a form
        submitQuery();
    }
});
    
d3.select("#submit_llm_query").on("click", function() {
    submitQuery();
});

function submitQuery() {
    const user_query = d3.select("#llm_query").property("value")
    console.log("Submitted query: " + user_query)
    appendMessage("user", user_query)
    d3.select("#llm_query").property("value", "");
    const folders = Array.from(document.querySelectorAll("input[name='folder']:checked"))
                         .map(cb => cb.value);

    fetch("/llm_query", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: user_query, folders: folders})
    })
    .then(async function(response){
        return JSON.parse(JSON.stringify((await response.json())));
     })
    .then(results => appendMessage("llm", results));
}

function appendMessage(sender, text) {
    const chatHistory = d3.select("#chat-history");

    const message = chatHistory.append("div")
        .attr("class", `message ${sender}-message`)
        .html((marked.parse(text)));

    // Scroll to bottom
    chatHistory.node().scrollTop = chatHistory.node().scrollHeight;

    localStorage.setItem("chatHistoryHTML", chatHistory.node().innerHTML);
}

window.addEventListener("DOMContentLoaded", () => {
    const chatHistory = document.getElementById("chat-history");
    const saved = localStorage.getItem("chatHistoryHTML");
    console.log("reloaded DOM content!")
    if (saved != null) {
        chatHistory.innerHTML = saved;
    }
});