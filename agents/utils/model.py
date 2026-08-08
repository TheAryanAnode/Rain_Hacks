from httpx import AsyncClient, HTTPStatusError
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.retries import AsyncTenacityTransport, RetryConfig
from tenacity import retry_if_exception_type, stop_after_attempt, wait_fixed


def create_retrying_client():
    """Create a client with smart retry handling for multiple error types."""

    def should_retry_status(response):
        """Raise exceptions for retryable HTTP status codes."""
        if response.status_code in (429, 502, 503, 504):
            response.raise_for_status()  # This will raise HTTPStatusError

    transport = AsyncTenacityTransport(
        config=RetryConfig(
            # Retry on HTTP errors and connection issues
            retry=retry_if_exception_type((HTTPStatusError, ConnectionError)),
            # Wait exactly 30 seconds between retries
            wait=wait_fixed(60),
            # Retry exactly 3 times
            stop=stop_after_attempt(5),
            # Re-raise the last exception if all retries fail
            reraise=True
        ),
        validate_response=should_retry_status
    )
    return AsyncClient(transport=transport, timeout=60.0)

# Use the retrying client with a model
client = create_retrying_client()

model_gemini_retry = GoogleModel('gemini-3.6-flash', provider=GoogleProvider(http_client=client))