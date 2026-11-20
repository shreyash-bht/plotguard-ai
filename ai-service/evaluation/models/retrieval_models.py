from dataclasses import dataclass, field


@dataclass(frozen=True)
class RetrievalCase:
    id: str
    query: str
    case_type: str
    user_story_order: int
    content_id: str
    # Label only (documentation/grouping) — never scored.
    relevant_episodes: set[str]
    relevant_chunks: set[str]


@dataclass(frozen=True)
class RetrievalCaseResult:
    case_id: str
    query: str
    case_type: str
    # Which retrieval path produced this result: "raw" (embedding only)
    # or "reranked" (embedding + reranker), as configured in production.
    path: str

    expected_chunks: set[str]
    # Retrieved chunk refs in rank order (rank 1 = best).
    retrieved_chunks: list[str]

    recall: float
    precision: float
    mrr: float
    hit: float
    # Fraction of retrieved slots that should not have been returned.
    # Only meaningful for boundary_violation (future spoilers) and
    # negative (any retrieval at all) cases; 0.0 for positive types.
    fpr: float


@dataclass(frozen=True)
class PathMetrics:
    recall: float = 0.0
    precision: float = 0.0
    mrr: float = 0.0
    hit_rate: float = 0.0
    fpr: float = 0.0


@dataclass(frozen=True)
class RetrievalEvaluationResult:
    total_cases: int
    top_k: int
    raw: PathMetrics
    reranked: PathMetrics
    # case_type -> path ("raw"/"reranked") -> metrics
    per_type: dict[str, dict[str, PathMetrics]]
    cases: list[RetrievalCaseResult] = field(default_factory=list)

    def __str__(self) -> str:
        header = (
            f"Retrieval evaluation: {self.total_cases} cases @ k={self.top_k}\n"
            f"{'path':<10}{'recall':>9}{'precision':>11}{'mrr':>7}{'hit':>7}{'fpr':>7}"
        )
        lines = [header]
        for name, metrics in (("raw", self.raw), ("reranked", self.reranked)):
            lines.append(
                f"{name:<10}{metrics.recall:>9.3f}{metrics.precision:>11.3f}"
                f"{metrics.mrr:>7.3f}{metrics.hit_rate:>7.3f}{metrics.fpr:>7.3f}"
            )
        lines.append("")
        lines.append(f"{'type':<20}{'n':>3}  {'path':<10}{'recall':>9}{'precision':>11}{'mrr':>7}{'hit':>7}{'fpr':>7}")
        for case_type in sorted(self.per_type):
            for name in ("raw", "reranked"):
                metrics = self.per_type[case_type][name]
                n = len([c for c in self.cases if c.case_type == case_type and c.path == name])
                lines.append(
                    f"{case_type:<20}{n:>3}  {name:<10}{metrics.recall:>9.3f}"
                    f"{metrics.precision:>11.3f}{metrics.mrr:>7.3f}"
                    f"{metrics.hit_rate:>7.3f}{metrics.fpr:>7.3f}"
                )
        lines.append("")
        lines.extend(self._case_details())
        return "\n".join(lines)

    def _case_details(self) -> list[str]:
        lines = ["case detail (expected vs retrieved, rank order; * = relevant hit)"]
        seen: set[str] = set()
        for result in self.cases:
            if result.case_id in seen:
                continue
            seen.add(result.case_id)
            pair = [r for r in self.cases if r.case_id == result.case_id]

            lines.append("")
            lines.append(f"{result.case_id}  [{result.case_type}]")
            lines.append(f"    query    : {result.query}")
            expected = " ".join(sorted(result.expected_chunks)) or "(none)"
            lines.append(f"    expected : {expected}")
            for r in pair:
                retrieved = [
                    f"{ref}*"
                    if ref in r.expected_chunks
                    else ref
                    for ref in r.retrieved_chunks
                ]
                retrieved_text = " ".join(retrieved) or "(none retrieved)"
                rank = next(
                    (i + 1 for i, ref in enumerate(r.retrieved_chunks) if ref in r.expected_chunks),
                    0,
                )
                outcome = f"hit@{rank}" if rank else "miss"
                lines.append(
                    f"    {r.path:<9}: {retrieved_text}  -> {outcome}"
                    f" (recall {r.recall:.2f}, mrr {r.mrr:.2f})"
                )
        return lines
