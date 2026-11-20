from langchain_openai import ChatOpenAI
from langchain_core.messages import UsageMetadata
from app.llm.chat_model import ChatModel


class OpenRouterChatModel(ChatModel):
    """OpenRouter provider.

    OpenRouter exposes an OpenAI-compatible chat completions API, so the
    standard ChatOpenAI client is reused with OpenRouter's base URL.
    """

    def __init__(self, openrouter_llm_model, openrouter_api_key, openrouter_base_url):
        super().__init__()
        self.llm = ChatOpenAI(
            model=openrouter_llm_model,
            api_key=openrouter_api_key,
            base_url=openrouter_base_url,
            temperature=0.2,
            default_headers={"X-Title": "PlotGuard"},
        )

    def ask_llm(self, messages, max_tokens: int | None = None) -> tuple[str, UsageMetadata]:
        llm = self.llm.bind(max_tokens=max_tokens) if max_tokens else self.llm
        response = llm.invoke(messages)
        content = response.content
        if isinstance(content, list):
            # Some OpenRouter models return structured content blocks.
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        return content, response.usage_metadata

    def with_structured_output(self, output_schema):
        return self.llm.with_structured_output(output_schema)
