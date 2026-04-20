class AIParseError(Exception):
    """
    Raised when the AI response cannot be parsed into a valid structured report.
    The `raw` attribute holds the original response string for logging.
    """

    def __init__(self, message: str, raw: str = ''):
        super().__init__(message)
        self.raw = raw


class AIClientError(Exception):
    """Raised when the Anthropic API call itself fails (network, quota, etc.)."""
    pass
