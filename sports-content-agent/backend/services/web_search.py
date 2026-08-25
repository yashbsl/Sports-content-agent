from ddgs import DDGS


def search_web(
    query: str,
    max_results: int = 5
):
    """
    Search the web and return a compact list of sources.
    """

    if not query or not query.strip():
        return []

    try:
        results = DDGS().text(
            query,
            region="in-en",
            safesearch="moderate",
            max_results=max_results,
        )

        sources = []

        for result in results:
            title = result.get("title", "").strip()
            url = result.get("href", "").strip()
            snippet = result.get("body", "").strip()

            if not title or not url:
                continue

            sources.append({
                "title": title,
                "url": url,
                "snippet": snippet,
            })

        return sources

    except Exception as error:
        raise RuntimeError(
            f"Web search failed: {error}"
        )