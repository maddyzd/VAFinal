d3.select("#llm_query").on("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitQuery();
    }
});

d3.select("#submit_llm_query").on("click", function() {
    submitQuery();
});

function submitQuery() {
    const user_query = d3.select("#llm_query").property("value").trim();
    if (!user_query) return;

    appendMessage("user", user_query);
    d3.select("#llm_query").property("value", "");

    // Add typing indicator and keep its reference
    const typingNode = appendTypingMessage();

    const folders = Array.from(document.querySelectorAll("input[name='folder']:checked"))
                         .map(cb => cb.value);

    fetch("/llm_query", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: user_query, folders: folders })
    })
    .then(async function(response) {
        return await response.json();
    })
    .then(results => updateMessage(typingNode, results));
}

function appendMessage(sender, text) {
    const chatHistory = d3.select("#chat-history");

    const message = chatHistory.append("div")
        .attr("class", `message ${sender}-message`)
        .style("margin-bottom", "6px")
        .html(marked.parse(text));

    chatHistory.node().scrollTop = chatHistory.node().scrollHeight;
    localStorage.setItem("chatHistoryHTML", chatHistory.node().innerHTML);

    return message.node();
}

function appendTypingMessage() {
    const chatHistory = d3.select("#chat-history");

    const container = chatHistory.append("div")
        .attr("class", "message llm-message")
        .style("margin-bottom", "6px");

    const span = container.append("em").text(".");
    let dots = 1;

    const interval = setInterval(() => {
        dots = (dots % 3) + 1;
        span.text(".".repeat(dots));
    }, 400);

    const node = container.node();
    node._typingInterval = interval;
    node._span = span;

    chatHistory.node().scrollTop = chatHistory.node().scrollHeight;
    return node;
}

function updateMessage(domNode, text) {
    if (domNode) {
        clearInterval(domNode._typingInterval);
        domNode.innerHTML = marked.parse(text);
        const chatHistory = d3.select("#chat-history").node();
        chatHistory.scrollTop = chatHistory.scrollHeight;
        localStorage.setItem("chatHistoryHTML", chatHistory.innerHTML);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const isReload = performance.getEntriesByType("navigation")[0]?.type === "reload";
    if (isReload) {
        localStorage.removeItem("chatHistoryHTML");
    } else {
        const saved = localStorage.getItem("chatHistoryHTML");
        if (saved != null) {
            document.getElementById("chat-history").innerHTML = saved;
        }
    }
});
