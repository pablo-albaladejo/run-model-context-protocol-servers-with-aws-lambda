class LLMClient:
    """Manages communication with Bedrock."""

    def __init__(self, bedrock_client, model_id: str) -> None:
        self.bedrock_client = bedrock_client
        self.model_id = model_id

    def get_response(
        self,
        messages: list[dict],
        system_prompt: str,
        tools: list[dict],
    ) -> dict:
        """Get a response from the LLM, using the Bedrock Converse API.
        https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-runtime/client/converse.html

        Args:
            messages: A list of message dictionaries.

        Returns:
            The LLM's full response.
        """

        return self.bedrock_client.converse(
            modelId=self.model_id,
            messages=messages,
            system=[{"text": system_prompt}],
            inferenceConfig={
                "maxTokens": 4096,
                "temperature": 0.7,
                "topP": 1,
            },
            toolConfig={"tools": tools},
        )
