from dataclasses import dataclass


@dataclass
class RetrievedChunk:
    chunk_id: str
    story_order: int
    chunk_index: int
    chunk_text: str
    distance: float
    rerank_score : float | None = None
