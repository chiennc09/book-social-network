"""
Embedding Service — Content-Based Filtering via sentence-transformers + Qdrant.

Responsibilities:
  - Load the multilingual-e5-small model once at startup.
  - Build text representations for books and produce float embeddings.
  - Upsert / delete book vectors in Qdrant.
  - Search for similar books by bookId (for Book-Detail screen).
  - Build a User Content Profile (mean vector of books user interacted with).
  - Re-rank ALS candidate list using content similarity scores.
"""
import logging
import uuid
from typing import Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client.http.models import PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import settings
from app.core.qdrant_client import QdrantManager

logger = logging.getLogger(__name__)

def _get_qdrant_id(book_id: str) -> str:
    """Convert a MongoDB ObjectId or other ID into a valid Qdrant UUID."""
    book_id = str(book_id)
    if len(book_id) == 24:
        try:
            return str(uuid.UUID(book_id.rjust(32, '0')))
        except ValueError:
            pass
    try:
        return str(uuid.UUID(book_id))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, book_id))

def _get_original_id(point) -> str:
    """Extract original book_id from a Qdrant query result."""
    payload = getattr(point, "payload", None)
    if payload and "book_id" in payload:
        return str(payload["book_id"])
    hex_str = str(point.id).replace("-", "")
    if len(hex_str) == 32 and hex_str.startswith("00000000"):
        return hex_str[8:]
    return str(point.id)


# ---------------------------------------------------------------------------
# Model singleton — loaded once when this module is first imported.
# ---------------------------------------------------------------------------
_model: Optional[SentenceTransformer] = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model '{settings.EMBEDDING_MODEL_NAME}'...")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        logger.info("Embedding model loaded.")
    return _model


# ---------------------------------------------------------------------------
# Text builder
# ---------------------------------------------------------------------------
def _build_book_text(book: dict) -> str:
    """
    Build a rich text representation for embedding.

    Uses the E5-model's recommended 'passage:' prefix so the model
    treats the text as a passage to be retrieved (not a query).

    Fields used (all optional — missing fields are skipped):
      - title          : str
      - description    : str
      - authors        : list[str]
      - category_name  : str  (resolved category name, NOT id)
    """
    parts = []
    title = (book.get("title") or "").strip()
    description = (book.get("description") or "").strip()
    # authors can be a list of strings
    authors_raw = book.get("authors") or []
    authors = ", ".join(authors_raw) if isinstance(authors_raw, list) else str(authors_raw)
    category_name = (book.get("categoryName") or book.get("category_name") or "").strip()

    if title:
        parts.append(title)
    if authors:
        parts.append(f"bởi {authors}")
    if category_name:
        parts.append(f"thể loại {category_name}")
    if description:
        parts.append(description)

    raw_text = ". ".join(filter(None, parts))
    # E5 prefix: "passage:" for documents being indexed; "query:" for search queries
    return f"passage: {raw_text}"


def _embed(text: str) -> list[float]:
    """Return a normalized float-list embedding for a single piece of text."""
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


# ---------------------------------------------------------------------------
# Qdrant operations
# ---------------------------------------------------------------------------
async def index_book(book: dict) -> None:
    """
    Upsert a book's vector representation into Qdrant.

    Expected book dict keys:
      id, title, description, authors, category_name, category_id (optional)
    """
    book_id = str(book.get("id"))
    if not book_id or book_id == "None":
        logger.warning("index_book called with no 'id', skipping.")
        return

    text = _build_book_text(book)
    vector = _embed(text)

    qdrant_id = _get_qdrant_id(book_id)
    payload = {
        "book_id": book_id,
        "title": book.get("title", ""),
        "description": book.get("description", ""),
        "authors": book.get("authors", []),
        "category_id": str(book.get("categoryId") or book.get("category_id") or ""),
        "category_name": book.get("categoryName") or book.get("category_name") or "",
    }

    client = QdrantManager.get_client()
    await client.upsert(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        points=[PointStruct(id=qdrant_id, vector=vector, payload=payload)],
    )
    logger.info(f"Indexed book '{book_id}' (qdrant: {qdrant_id}) into Qdrant.")


async def delete_book(book_id: str) -> None:
    """Remove a book vector from Qdrant when the book is deleted."""
    client = QdrantManager.get_client()
    qdrant_id = _get_qdrant_id(book_id)
    await client.delete(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        points_selector=[qdrant_id],
    )
    logger.info(f"Deleted book '{book_id}' (qdrant: {qdrant_id}) from Qdrant.")


async def search_similar_books(book_id: str, limit: int = 10) -> list[str]:
    """
    Find the top-N most content-similar books to a given bookId.

    Used for: Book Detail screen — "Bạn cũng có thể thích".
    Returns an ordered list of bookIds (the query book itself is excluded).
    """
    client = QdrantManager.get_client()
    qdrant_id = _get_qdrant_id(book_id)

    # Fetch the source vector
    results = await client.retrieve(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        ids=[qdrant_id],
        with_vectors=True,
    )
    if not results:
        logger.warning(f"search_similar_books: book '{book_id}' not found in Qdrant.")
        return []

    query_vector = results[0].vector

    # Search for nearest neighbours, excluding the source book itself
    hits = await client.search(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        query_vector=query_vector,
        limit=limit + 1,   # +1 to account for the book itself appearing in results
        with_payload=True,
    )

    similar_ids = [_get_original_id(h) for h in hits if _get_original_id(h) != str(book_id)]
    return similar_ids[:limit]


async def build_user_content_profile(book_ids: list[str]) -> Optional[np.ndarray]:
    """
    Compute a User Content Profile as the mean embedding vector of a list of bookIds.

    Args:
        book_ids: books the user has interacted with (top-N by score).
    Returns:
        A normalized numpy float array of shape (384,), or None if no vectors found.
    """
    if not book_ids:
        return None

    client = QdrantManager.get_client()
    qdrant_ids = [_get_qdrant_id(b) for b in book_ids]
    results = await client.retrieve(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        ids=qdrant_ids,
        with_vectors=True,
    )
    if not results:
        return None

    vectors = np.array([r.vector for r in results], dtype=np.float32)
    mean_vector = vectors.mean(axis=0)
    # Normalize so cosine similarity behaves consistently with unit-norm embeddings
    norm = np.linalg.norm(mean_vector)
    if norm > 0:
        mean_vector = mean_vector / norm
    return mean_vector


async def rerank_candidates(
    candidate_book_ids: list[str],
    als_scores: dict[str, float],
    user_profile_vector: np.ndarray,
) -> list[str]:
    """
    Re-rank ALS candidates using a weighted combination of ALS score + content similarity.

    Score formula:
        final_score = w_als * norm(als_score) + w_cbf * cosine_similarity(user_profile, book_vector)

    Args:
        candidate_book_ids : ordered list of bookIds from ALS (top 50).
        als_scores         : dict mapping bookId → raw ALS score (already normalized 0-1).
        user_profile_vector: mean embedding vector for this user.
    Returns:
        Re-ranked list of bookIds (best first).
    """
    if not candidate_book_ids:
        return []

    client = QdrantManager.get_client()
    qdrant_ids = [_get_qdrant_id(b) for b in candidate_book_ids]
    results = await client.retrieve(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        ids=qdrant_ids,
        with_vectors=True,
        with_payload=True,
    )

    # Build a lookup map: bookId → vector
    vector_map: dict[str, np.ndarray] = {
        _get_original_id(r): np.array(r.vector, dtype=np.float32)
        for r in results
    }

    w_als = settings.HYBRID_ALS_WEIGHT
    w_cbf = settings.HYBRID_CBF_WEIGHT

    scored: list[tuple[str, float]] = []
    for book_id in candidate_book_ids:
        als_score = als_scores.get(book_id, 0.0)
        cbf_score = 0.0
        if book_id in vector_map:
            cbf_score = float(np.dot(user_profile_vector, vector_map[book_id]))
            cbf_score = max(0.0, cbf_score)  # cosine similarity is -1..1; clip negatives

        final = w_als * als_score + w_cbf * cbf_score
        scored.append((book_id, final))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [book_id for book_id, _ in scored]


async def cbf_recommendations_for_user(user_book_ids: list[str], limit: int = 20) -> list[str]:
    """
    Pure CBF recommendations for cold-start users (≥ COLD_START_THRESHOLD but < ALS threshold).

    Builds the user content profile then does a direct Qdrant vector search.
    """
    profile = await build_user_content_profile(user_book_ids)
    if profile is None:
        return []

    client = QdrantManager.get_client()
    hits = await client.search(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        query_vector=profile.tolist(),
        limit=limit + len(user_book_ids),  # over-fetch to filter interacted books
        with_payload=True,
    )

    already_seen = set(str(b) for b in user_book_ids)
    results = [_get_original_id(h) for h in hits if _get_original_id(h) not in already_seen]
    return results[:limit]
