import json
import re
from pathlib import Path

from evaluation.models.retrieval_models import RetrievalCase

# Dataset refs are story-order based ("e{story_order}-c{chunk_index}") so they
# survive re-chunking; they are resolved to chunk ids only at eval time.
_CHUNK_REF_PATTERN = re.compile(r"^e(\d+)-c(\d+)$")
_EPISODE_REF_PATTERN = re.compile(r"^e(\d+)$")


class RetrievalDatasetLoader:
    def __init__(self):
        self._queries_dir = Path(__file__).resolve().parent.parent / "resources" / "queries"

    def load(self) -> list[RetrievalCase]:
        cases: list[RetrievalCase] = []
        for dataset_file in sorted(self._queries_dir.glob("*.json")):
            with open(dataset_file, "r", encoding="utf-8") as file:
                dataset = json.load(file)
            cases.extend(self._parse_cases(dataset))
        return cases

    @staticmethod
    def _parse_cases(dataset: dict) -> list[RetrievalCase]:
        return [
            RetrievalCase(
                id=case["id"],
                query=case["query"],
                case_type=case["type"],
                user_story_order=int(case["user_story_order"]),
                content_id=case["content_id"],
                relevant_episodes=RetrievalDatasetLoader._parse_refs(
                    case.get("relevant_episodes", []), _EPISODE_REF_PATTERN
                ),
                relevant_chunks=RetrievalDatasetLoader._parse_refs(
                    case.get("relevant_chunks", []), _CHUNK_REF_PATTERN
                ),
            )
            for case in dataset["cases"]
        ]

    @staticmethod
    def _parse_refs(values: list, pattern: re.Pattern) -> set[str]:
        refs = set()
        for value in values:
            if not pattern.match(value):
                raise ValueError(f"Invalid dataset reference: {value!r}")
            refs.add(value)
        return refs
