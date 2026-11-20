import re
from pydantic import BaseModel
from pathlib import Path
import frontmatter

SCRIPT_DIR = Path(__file__).resolve().parent.parent
CONTENTS_DIR = SCRIPT_DIR / "resources" / "contents"

_SEASON_DIR_PATTERN = re.compile(r"^season(\d+)$")


class Content(BaseModel):
    content_id: str
    title: str
    content_type: str


class Season(BaseModel):
    season_id: str
    content_id: str
    season_number: int
    title: str

class StoryUnit(BaseModel):
    story_unit_id: str
    content_id: str
    season_id: str
    story_unit_text: str
    story_order: int
    unit_type: str
    unit_number: int
    title: str


def get_contents_data() -> list[Content]:
    # Content metadata no longer lives in a separate file: one entry per
    # distinct content_id found in the episode .md frontmatter.
    contents: dict[str, Content] = {}
    for post in _load_episodes():
        metadata = post.metadata
        content_id = metadata["content_id"]
        if content_id in contents:
            continue
        contents[content_id] = Content(
            content_id=content_id,
            title=metadata["title"],
            content_type="TV_SHOW",
        )
    return list(contents.values())


def get_seasons_data() -> list[Season]:
    # One entry per distinct season_id; the season number comes from the
    # directory name (e.g. contents/wednesday/season01/episode-01.md -> 1).
    seasons: dict[str, Season] = {}
    for file_path, post in _iter_episode_files():
        season_id = post.metadata["season_id"]
        if season_id in seasons:
            continue
        season_number = _season_number(file_path)
        seasons[season_id] = Season(
            season_id=season_id,
            content_id=post.metadata["content_id"],
            season_number=season_number,
            title=f"s{season_number}",
        )
    return list(seasons.values())


def get_story_units_data() -> list[StoryUnit]:
    story_units = []
    for _, post in _iter_episode_files():
        metadata = post.metadata
        story_units.append(
            StoryUnit(
                story_unit_id=metadata["story_unit_id"],
                content_id=metadata["content_id"],
                season_id=metadata["season_id"],
                story_unit_text=post.content,
                story_order=metadata["story_order"],
                unit_type=metadata["unit_type"],
                unit_number=metadata["unit_number"],
                title=metadata["episode_title"]
            )
        )
    return story_units


def _iter_episode_files() -> list[tuple[Path, frontmatter.Post]]:
    files = sorted(CONTENTS_DIR.rglob("*.md"))
    return [(file_path, frontmatter.load(file_path)) for file_path in files]


def _load_episodes() -> list[frontmatter.Post]:
    return [post for _, post in _iter_episode_files()]


def _season_number(file_path: Path) -> int:
    for parent in file_path.parents:
        match = _SEASON_DIR_PATTERN.match(parent.name)
        if match:
            return int(match.group(1))
    raise ValueError(f"Episode file is not inside a 'season<N>' directory: {file_path}")
