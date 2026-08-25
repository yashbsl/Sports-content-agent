from ddgs import DDGS


# ============================================================
# TRUSTED SPORTS SOURCES
# ============================================================

TRUSTED_DOMAINS = {
    "Cricket": [
        "icc-cricket.com",
        "espncricinfo.com",
        "wisden.com",
        "bcci.tv",
    ],
    "Football": [
        "fifa.com",
        "uefa.com",
        "premierleague.com",
        "espn.com",
    ],
    "Basketball": [
        "nba.com",
        "fiba.basketball",
        "espn.com",
    ],
    "Tennis": [
        "atptour.com",
        "wtatennis.com",
        "itftennis.com",
        "espn.com",
    ],
}


def get_domain(url: str) -> str:
    """
    Extract hostname from a URL.
    """

    url = url.lower().strip()

    url = url.replace(
        "https://",
        ""
    ).replace(
        "http://",
        ""
    )

    domain = url.split("/")[0]

    if domain.startswith("www."):
        domain = domain[4:]

    return domain


def is_trusted_source(
    url: str,
    sport: str
) -> bool:
    """
    Check whether a source belongs to a trusted
    sports organization/publication.
    """

    domain = get_domain(url)

    trusted_domains = TRUSTED_DOMAINS.get(
        sport,
        []
    )

    for trusted in trusted_domains:

        if (
            domain == trusted
            or domain.endswith("." + trusted)
        ):
            return True

    return False


def source_score(
    result: dict,
    sport: str
) -> int:
    """
    Score search results so trusted sources are
    preferred over generic quiz websites.
    """

    url = result.get(
        "href",
        ""
    )

    title = str(
        result.get(
            "title",
            ""
        )
    ).lower()

    snippet = str(
        result.get(
            "body",
            ""
        )
    ).lower()

    score = 0

    # Trusted domain
    if is_trusted_source(
        url,
        sport
    ):
        score += 100

    # Useful sports terms
    useful_terms = [
        "official",
        "rules",
        "record",
        "statistics",
        "history",
        "match",
        "tournament",
        "playing conditions",
    ]

    for term in useful_terms:

        if term in title:
            score += 5

        if term in snippet:
            score += 2

    # Prefer URLs that look like source/reference pages
    source_terms = [
        "rules",
        "records",
        "statistics",
        "news",
        "about",
        "history",
        "playing-conditions",
    ]

    for term in source_terms:

        if term in url.lower():
            score += 4

    return score


def search_web(
    query: str,
    sport: str = "Cricket",
    max_results: int = 5
):
    """
    Search web, rank sources and return the best ones.

    Trusted sports domains are strongly preferred.
    """

    if not query or not query.strip():
        return []

    try:

        results = DDGS().text(
            query,
            region="in-en",
            safesearch="moderate",
            max_results=max(
                max_results * 3,
                10
            )
        )

        if not results:
            return []

        # ----------------------------------------------------
        # Rank results
        # ----------------------------------------------------

        ranked_results = sorted(
            results,
            key=lambda result: source_score(
                result,
                sport
            ),
            reverse=True
        )

        sources = []
        seen_urls = set()

        for result in ranked_results:

            title = str(
                result.get(
                    "title",
                    ""
                )
            ).strip()

            url = str(
                result.get(
                    "href",
                    ""
                )
            ).strip()

            snippet = str(
                result.get(
                    "body",
                    ""
                )
            ).strip()

            if not title or not url:
                continue

            normalized_url = url.lower()

            # Remove duplicates
            if normalized_url in seen_urls:
                continue

            seen_urls.add(
                normalized_url
            )

            sources.append(
                {
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "trusted": is_trusted_source(
                        url,
                        sport
                    ),
                }
            )

            if len(sources) >= max_results:
                break

        return sources

    except Exception as error:

        raise RuntimeError(
            f"Web search failed: {error}"
        )