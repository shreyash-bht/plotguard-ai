from app.embedding.embedding_service import EmbeddingService
from app.retrieval.retrieval_service import RetrievalService
from evaluation.evaluators.evaluator import Evaluator
from evaluation.loaders.retrieval_dataset_loader import RetrievalDatasetLoader
from evaluation.models.retrieval_models import (
    PathMetrics,
    RetrievalCase,
    RetrievalCaseResult,
    RetrievalEvaluationResult,
)

# Types whose chunks are legitimately answerable at the user's spoiler
# boundary; everything else (boundary_violation, negative) is scored
# on the failure side via fpr.
POSITIVE_TYPES = frozenset(
    {"direct_fact", "paraphrase", "multi_hop", "temporal", "relationship"}
)

RAW = "raw"
RERANKED = "reranked"


class RetrievalEvaluator(Evaluator):
    def __init__(
        self,
        embedding_service: EmbeddingService,
        retrieval_service: RetrievalService,
        top_k: int = 5,
    ):
        self._dataset_loader = RetrievalDatasetLoader()
        self._embedding_service = embedding_service
        self._retrieval_service = retrieval_service
        self._top_k = top_k

    def evaluate(self) -> RetrievalEvaluationResult:
        cases = self._dataset_loader.load()
        results: list[RetrievalCaseResult] = []
        for case in cases:
            query_embedding = self._embedding_service.embed_query(case.query)
            results.append(
                self._evaluate_case(
                    case,
                    RAW,
                    lambda: self._retrieval_service.retrieve(
                        content_id=case.content_id,
                        max_story_order=case.user_story_order,
                        query_embedding=query_embedding,
                        top_k=self._top_k,
                    ),
                )
            )
            results.append(
                self._evaluate_case(
                    case,
                    RERANKED,
                    lambda: self._retrieval_service.retrieve_relevant_chunks(
                        query=case.query,
                        content_id=case.content_id,
                        max_story_order=case.user_story_order,
                        query_embedding=query_embedding,
                        top_k=self._top_k,
                    ),
                )
            )
        return self._build_result(len(cases), results)

    def _evaluate_case(
        self,
        case: RetrievalCase,
        path: str,
        retrieve,
    ) -> RetrievalCaseResult:
        retrieved = retrieve()
        retrieved_refs = [
            f"e{chunk.story_order}-c{chunk.chunk_index}"
            for chunk in retrieved
        ]
        retrieved_set = set(retrieved_refs)
        expected = case.relevant_chunks

        rank = next(
            (i + 1 for i, ref in enumerate(retrieved_refs) if ref in expected),
            0,
        )

        recall = len(expected & retrieved_set) / len(expected) if expected else 0.0
        precision = len(expected & retrieved_set) / self._top_k
        mrr = 1.0 / rank if rank else 0.0
        hit = 1.0 if expected & retrieved_set else 0.0

        if case.case_type == "boundary_violation":
            # Any future-spoiler chunk that made it past the story-order
            # cap is a leak.
            fpr = len(expected & retrieved_set) / self._top_k
        elif case.case_type == "negative":
            # Placeholder until the service supports a similarity cutoff:
            # retrieval always returns top_k chunks, so this reads ~1.0
            # by construction.
            fpr = len(retrieved_set) / self._top_k
        else:
            fpr = 0.0

        return RetrievalCaseResult(
            case_id=case.id,
            query=case.query,
            case_type=case.case_type,
            path=path,
            expected_chunks=expected,
            retrieved_chunks=retrieved_refs,
            recall=recall,
            precision=precision,
            mrr=mrr,
            hit=hit,
            fpr=fpr,
        )

    def _build_result(
        self,
        total_cases: int,
        results: list[RetrievalCaseResult],
    ) -> RetrievalEvaluationResult:
        per_type: dict[str, dict[str, PathMetrics]] = {}
        case_types = {result.case_type for result in results}
        for case_type in sorted(case_types):
            typed = [r for r in results if r.case_type == case_type]
            per_type[case_type] = {
                RAW: self._aggregate(typed, RAW),
                RERANKED: self._aggregate(typed, RERANKED),
            }

        return RetrievalEvaluationResult(
            total_cases=total_cases,
            top_k=self._top_k,
            raw=self._aggregate(results, RAW),
            reranked=self._aggregate(results, RERANKED),
            per_type=per_type,
            cases=results,
        )

    def _aggregate(
        self,
        results: list[RetrievalCaseResult],
        path: str,
    ) -> PathMetrics:
        selected = [r for r in results if r.path == path]
        if not selected:
            return PathMetrics()

        # recall/precision/mrr/hit: macro-average over all cases (negative
        # cases intentionally drag these down until they are handled
        # upstream by the query router).
        # fpr: only boundary_violation and negative cases carry a
        # meaningful false-positive signal; positive types score 0.0.
        fpr_cases = [
            r for r in selected if r.case_type not in POSITIVE_TYPES
        ]
        fpr_source = fpr_cases if fpr_cases else selected

        return PathMetrics(
            recall=self._mean([r.recall for r in selected]),
            precision=self._mean([r.precision for r in selected]),
            mrr=self._mean([r.mrr for r in selected]),
            hit_rate=self._mean([r.hit for r in selected]),
            fpr=self._mean([r.fpr for r in fpr_source]),
        )

    @staticmethod
    def _mean(values: list[float]) -> float:
        return sum(values) / len(values) if values else 0.0
