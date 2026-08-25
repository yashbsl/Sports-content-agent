import chromadb
CHROMA_PATH = "./chroma_db"

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)

collection = client.get_or_create_collection(
    name="sports_knowledge"
)


SPORTS_FACTS = [
    {
        "id": "cricket_001",
        "text": (
            "A cricket team has 11 players on the field. "
            "This is the standard number of players in a playing XI."
        ),
        "sport": "Cricket",
        "category": "rules"
    },
    {
        "id": "cricket_002",
        "text": (
            "The standard length of a cricket pitch is 22 yards, "
            "which is 20.12 metres."
        ),
        "sport": "Cricket",
        "category": "rules"
    },
    {
        "id": "cricket_003",
        "text": (
            "An over in cricket normally consists of six legal deliveries."
        ),
        "sport": "Cricket",
        "category": "rules"
    },
    {
        "id": "cricket_004",
        "text": (
            "The ICC Cricket World Cup is the major international "
            "50-over cricket tournament for men's teams."
        ),
        "sport": "Cricket",
        "category": "tournament"
    },
    {
        "id": "football_001",
        "text": (
            "A football team normally has 11 players on the field, "
            "including the goalkeeper."
        ),
        "sport": "Football",
        "category": "rules"
    },
    {
        "id": "football_002",
        "text": (
            "A standard football match consists of two halves of "
            "45 minutes each, subject to added time."
        ),
        "sport": "Football",
        "category": "rules"
    },
    {
        "id": "basketball_001",
        "text": (
            "A basketball team has five players on the court at one time."
        ),
        "sport": "Basketball",
        "category": "rules"
    },
    {
        "id": "tennis_001",
        "text": (
            "In tennis scoring, the traditional sequence is "
            "love, 15, 30, 40 and game."
        ),
        "sport": "Tennis",
        "category": "rules"
    }
]

def seed_knowledge():

    existing = collection.get()

    existing_ids = set(
        existing.get("ids", [])
    )

    new_items = [
        item
        for item in SPORTS_FACTS
        if item["id"] not in existing_ids
    ]

    if not new_items:
        return 0

    collection.add(
        ids=[
            item["id"]
            for item in new_items
        ],
        documents=[
            item["text"]
            for item in new_items
        ],
        metadatas=[
            {
                "sport": item["sport"],
                "category": item["category"]
            }
            for item in new_items
        ]
    )

    return len(new_items)

def search_knowledge(
    query: str,
    sport: str | None = None,
    top_k: int = 4
):

    where = None

    if sport:
        where = {
            "sport": sport
        }

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=where
    )

    documents = results.get(
        "documents",
        [[]]
    )

    metadatas = results.get(
        "metadatas",
        [[]]
    )

    ids = results.get(
        "ids",
        [[]]
    )

    output = []

    if not documents:
        return output

    for index, document in enumerate(
        documents[0]
    ):

        metadata = {}

        if metadatas and metadatas[0]:
            metadata = metadatas[0][index]

        document_id = ""

        if ids and ids[0]:
            document_id = ids[0][index]

        output.append(
            {
                "id": document_id,
                "text": document,
                "sport": metadata.get(
                    "sport",
                    ""
                ),
                "category": metadata.get(
                    "category",
                    ""
                )
            }
        )

    return output


def initialize_database():

    return seed_knowledge()


if __name__ == "__main__":

    count = initialize_database()

    print(
        f"ChromaDB initialized. "
        f"Added {count} new documents."
    )

    results = search_knowledge(
        query="How many players are in a cricket team?",
        sport="Cricket",
        top_k=3
    )

    print("\nSearch results:")

    for result in results:
        print(
            f"- {result['text']}"
        )